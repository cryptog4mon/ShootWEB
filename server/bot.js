const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const token = '8267366139:AAHtF-zNHMxwnjZ64hETAF0IPaTWKRfIFqI';
const siteUrl = process.env.SITE_URL || '';
const canUseSiteUrl = /^https?:\/\//i.test(siteUrl) && !/localhost|127\.0\.0\.1/i.test(siteUrl);
const bot = new TelegramBot(token, { polling: true });

const dbPath = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });

const get = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

const all = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

const pendingLinks = new Map();
const pendingLogins = new Map();

const formatDate = () => {
    const now = new Date();
    return now.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
};

bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const param = match[1] ? match[1].trim() : '';

    if (param.startsWith('link_')) {
        const linkCode = param.replace('link_', '');
        const linkData = pendingLinks.get(linkCode);

        if (!linkData) {
            await bot.sendMessage(chatId, '❌ Код привязки истёк или недействителен.\n\nПопробуйте получить новый код в профиле.');
            return;
        }

        const existing = await get('SELECT * FROM telegram_2fa WHERE telegram_id = ?', [chatId]);
        if (existing) {
            await bot.sendMessage(chatId, '⚠️ Этот Telegram аккаунт уже привязан к другому пользователю.\n\nОтвяжите его сначала в профиле.');
            return;
        }

        const userCheck = await get('SELECT * FROM telegram_2fa WHERE user_id = ?', [linkData.userId]);
        if (userCheck) {
            await run('UPDATE telegram_2fa SET telegram_id = ?, telegram_username = ?, linked_at = ? WHERE user_id = ?', [chatId, msg.from.username || '', formatDate(), linkData.userId]);
        } else {
            await run('INSERT INTO telegram_2fa (user_id, telegram_id, telegram_username, enabled, linked_at) VALUES (?, ?, ?, 1, ?)', [linkData.userId, chatId, msg.from.username || '', formatDate()]);
        }

        pendingLinks.delete(linkCode);

        const user = await get('SELECT username FROM users WHERE id = ?', [linkData.userId]);
        await bot.sendMessage(chatId, `✅ Telegram успешно привязан!\n\n👤 Аккаунт: ${user?.username || 'Unknown'}\n🔐 Двухфакторная аутентификация активирована\n\nТеперь при каждом входе вам будет приходить запрос на подтверждение.`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⚙️ Настройки', callback_data: 'settings' }]
                ]
            }
        });
        return;
    }

    const linked = await get('SELECT t.*, u.username FROM telegram_2fa t JOIN users u ON t.user_id = u.id WHERE t.telegram_id = ?', [chatId]);

    if (linked) {
        await bot.sendMessage(chatId, `🔐 *Shoot DLC 2FA*\n\n✅ Ваш аккаунт привязан\n👤 Пользователь: ${linked.username}\n📅 Привязан: ${linked.linked_at}\n\n🛡️ 2FA: ${linked.enabled ? 'Включена' : 'Выключена'}`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: linked.enabled ? '🔓 Отключить 2FA' : '🔒 Включить 2FA', callback_data: linked.enabled ? 'disable_2fa' : 'enable_2fa' }],
                    [{ text: '🔗 Отвязать Telegram', callback_data: 'unlink' }],
                    [{ text: '📊 История входов', callback_data: 'history' }]
                ]
            }
        });
    } else {
        await bot.sendMessage(chatId, `🔐 *Shoot DLC 2FA*\n\nДобро пожаловать!\n\nЭтот бот обеспечивает двухфакторную аутентификацию для вашего аккаунта.\n\n📱 Для привязки:\n1. Откройте профиль на сайте\n2. Нажмите кнопку "2FA"\n3. Перейдите по ссылке\n\n🆔 Ваш Telegram ID: \`${chatId}\``, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    ...(canUseSiteUrl ? [[{ text: '🌐 Открыть сайт', url: siteUrl }]] : []),
                    [{ text: 'ℹ️ Информация', callback_data: 'info' }]
                ]
            }
        });
    }
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    try {
        if (data === 'info') {
            await bot.answerCallbackQuery(query.id);
            await bot.sendMessage(chatId, `ℹ️ *О двухфакторной аутентификации*\n\n🔐 2FA добавляет дополнительный уровень защиты вашего аккаунта.\n\n📱 При каждом входе вам будет приходить уведомление с информацией:\n• IP-адрес\n• Время входа\n• Устройство\n\n✅ Только вы можете подтвердить или отклонить вход.\n\n🛡️ Это защитит ваш аккаунт даже если кто-то узнает ваш пароль.`, { parse_mode: 'Markdown' });
            return;
        }

        if (data === 'settings') {
            const linked = await get('SELECT t.*, u.username FROM telegram_2fa t JOIN users u ON t.user_id = u.id WHERE t.telegram_id = ?', [chatId]);
            if (!linked) {
                await bot.answerCallbackQuery(query.id, { text: 'Аккаунт не привязан' });
                return;
            }
            await bot.answerCallbackQuery(query.id);
            await bot.sendMessage(chatId, `⚙️ *Настройки 2FA*\n\n👤 Аккаунт: ${linked.username}\n🛡️ Статус: ${linked.enabled ? 'Включена' : 'Выключена'}`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: linked.enabled ? '🔓 Отключить 2FA' : '🔒 Включить 2FA', callback_data: linked.enabled ? 'disable_2fa' : 'enable_2fa' }],
                        [{ text: '🔗 Отвязать Telegram', callback_data: 'unlink' }]
                    ]
                }
            });
            return;
        }

        if (data === 'enable_2fa') {
            await run('UPDATE telegram_2fa SET enabled = 1 WHERE telegram_id = ?', [chatId]);
            await bot.answerCallbackQuery(query.id, { text: '✅ 2FA включена!' });
            await bot.editMessageText('✅ Двухфакторная аутентификация *включена*!\n\nТеперь при каждом входе вам будет приходить запрос на подтверждение.', {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '⚙️ Настройки', callback_data: 'settings' }]
                    ]
                }
            });
            return;
        }

        if (data === 'disable_2fa') {
            await run('UPDATE telegram_2fa SET enabled = 0 WHERE telegram_id = ?', [chatId]);
            await bot.answerCallbackQuery(query.id, { text: '🔓 2FA отключена' });
            await bot.editMessageText('🔓 Двухфакторная аутентификация *отключена*.\n\n⚠️ Ваш аккаунт менее защищён. Рекомендуем включить 2FA для безопасности.', {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔒 Включить снова', callback_data: 'enable_2fa' }],
                        [{ text: '⚙️ Настройки', callback_data: 'settings' }]
                    ]
                }
            });
            return;
        }

        if (data === 'unlink') {
            await bot.answerCallbackQuery(query.id);
            await bot.sendMessage(chatId, '⚠️ *Вы уверены?*\n\nПосле отвязки вам нужно будет заново привязать Telegram для использования 2FA.', {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Да, отвязать', callback_data: 'confirm_unlink' }],
                        [{ text: '❌ Отмена', callback_data: 'cancel_unlink' }]
                    ]
                }
            });
            return;
        }

        if (data === 'confirm_unlink') {
            await run('DELETE FROM telegram_2fa WHERE telegram_id = ?', [chatId]);
            await bot.answerCallbackQuery(query.id, { text: 'Telegram отвязан' });
            await bot.editMessageText('✅ Telegram успешно отвязан от аккаунта.\n\nДля повторной привязки используйте кнопку 2FA в профиле.', {
                chat_id: chatId,
                message_id: query.message.message_id
            });
            return;
        }

        if (data === 'cancel_unlink') {
            await bot.answerCallbackQuery(query.id, { text: 'Отменено' });
            await bot.deleteMessage(chatId, query.message.message_id);
            return;
        }

        if (data === 'history') {
            const linked = await get('SELECT user_id FROM telegram_2fa WHERE telegram_id = ?', [chatId]);
            if (!linked) {
                await bot.answerCallbackQuery(query.id, { text: 'Аккаунт не привязан' });
                return;
            }
            const logs = await all('SELECT * FROM login_history WHERE user_id = ? ORDER BY id DESC LIMIT 10', [linked.user_id]);
            await bot.answerCallbackQuery(query.id);

            if (!logs || logs.length === 0) {
                await bot.sendMessage(chatId, '📊 *История входов*\n\nИстория пуста.', { parse_mode: 'Markdown' });
                return;
            }

            let text = '📊 *История входов*\n\nПоследние 10 попыток:\n\n';
            logs.forEach((log, i) => {
                const status = log.status === 'approved' ? '✅' : log.status === 'denied' ? '❌' : '⏳';
                text += `${i + 1}. ${status} ${log.ip || 'Unknown IP'}\n   📅 ${log.created_at}\n\n`;
            });

            await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
            return;
        }

        if (data.startsWith('approve_')) {
            const loginId = data.replace('approve_', '');
            const loginData = pendingLogins.get(loginId);

            if (!loginData) {
                await bot.answerCallbackQuery(query.id, { text: '⏰ Время истекло' });
                await bot.editMessageText('⏰ Время запроса истекло.\n\nЕсли это были вы, попробуйте войти снова.', {
                    chat_id: chatId,
                    message_id: query.message.message_id
                });
                return;
            }

            loginData.status = 'approved';
            loginData.resolve('approved');
            pendingLogins.delete(loginId);

            await run('UPDATE login_history SET status = ? WHERE login_id = ?', ['approved', loginId]);

            await bot.answerCallbackQuery(query.id, { text: '✅ Вход разрешён' });
            await bot.editMessageText(`✅ *Вход разрешён*\n\n🌐 IP: ${loginData.ip}\n📅 ${formatDate()}\n\nВы успешно вошли в аккаунт.`, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'Markdown'
            });
            return;
        }

        if (data.startsWith('deny_')) {
            const loginId = data.replace('deny_', '');
            const loginData = pendingLogins.get(loginId);

            if (!loginData) {
                await bot.answerCallbackQuery(query.id, { text: '⏰ Время истекло' });
                return;
            }

            loginData.status = 'denied';
            loginData.resolve('denied');
            pendingLogins.delete(loginId);

            await run('UPDATE login_history SET status = ? WHERE login_id = ?', ['denied', loginId]);

            await bot.answerCallbackQuery(query.id, { text: '❌ Вход заблокирован' });
            await bot.editMessageText(`❌ *Вход заблокирован*\n\n🌐 IP: ${loginData.ip}\n📅 ${formatDate()}\n\n⚠️ Если это не вы пытались войти, рекомендуем сменить пароль!`, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'Markdown',
                reply_markup: canUseSiteUrl ? {
                    inline_keyboard: [
                        [{ text: '🔑 Сменить пароль', url: siteUrl }]
                    ]
                } : undefined
            });
            return;
        }

        await bot.answerCallbackQuery(query.id);
    } catch (err) {
        console.log('Callback error:', err.message);
        try {
            await bot.answerCallbackQuery(query.id, { text: 'Ошибка' });
        } catch { }
    }
});

const generateLinkCode = (userId) => {
    const code = crypto.randomBytes(16).toString('hex');
    pendingLinks.set(code, { userId, createdAt: Date.now() });
    setTimeout(() => pendingLinks.delete(code), 30 * 1000);
    return code;
};

const requestLoginApproval = (userId, telegramId, ip, userAgent) => {
    return new Promise(async (resolve) => {
        const loginId = crypto.randomBytes(8).toString('hex');
        const user = await get('SELECT username FROM users WHERE id = ?', [userId]);

        pendingLogins.set(loginId, {
            userId,
            ip,
            userAgent,
            status: 'pending',
            resolve,
            createdAt: Date.now()
        });

        await run('INSERT INTO login_history (user_id, login_id, ip, user_agent, status, created_at) VALUES (?, ?, ?, ?, ?, ?)', [userId, loginId, ip, userAgent, 'pending', formatDate()]);

        setTimeout(() => {
            const data = pendingLogins.get(loginId);
            if (data && data.status === 'pending') {
                data.resolve('timeout');
                pendingLogins.delete(loginId);
            }
        }, 2 * 60 * 1000);

        const deviceInfo = userAgent ? userAgent.substring(0, 50) : 'Unknown Device';

        await bot.sendMessage(telegramId, `🔔 *Запрос на вход в аккаунт*\n\n👤 Аккаунт: ${user?.username || 'Unknown'}\n🌐 IP-адрес: \`${ip}\`\n📱 Устройство: ${deviceInfo}\n📅 Время: ${formatDate()}\n\n❓ *Это вы пытаетесь войти?*\n\n⏱ Запрос действителен 2 минуты`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Да, это я', callback_data: `approve_${loginId}` },
                        { text: '❌ Нет, не я', callback_data: `deny_${loginId}` }
                    ]
                ]
            }
        });
    });
};

const check2FAStatus = async (userId) => {
    const record = await get('SELECT * FROM telegram_2fa WHERE user_id = ? AND enabled = 1', [userId]);
    return record;
};

module.exports = {
    bot,
    generateLinkCode,
    requestLoginApproval,
    check2FAStatus,
    pendingLinks,
    pendingLogins
};

console.log('Shoot DLC 2FA Bot started (@a8x3n_service_bot)');
