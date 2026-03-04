import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  DollarSign,
  Download,
  KeyRound,
  ShieldCheck,
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Tag,
  Calendar,
  Clock3,
  UserCheck,
  BadgeCheck,
  Trash2,
  Key,
  User,
  Copy,
} from 'lucide-react';
import './Admin.css';
import { api } from '../api';
import { getAuthItem } from '../utils/authStorage';

const Admin = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('DEVELOPER');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [planOpen, setPlanOpen] = useState(false);
  const [daysOpen, setDaysOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignRole, setAssignRole] = useState('USER');
  const [keyPlan, setKeyPlan] = useState('BETA');
  const [keyDays, setKeyDays] = useState('30');
  const [showAssignRole, setShowAssignRole] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState('success');
  const [toastDuration, setToastDuration] = useState(3000);
  const [keyCount, setKeyCount] = useState('1');
  const [lastGenerated, setLastGenerated] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [journalPage, setJournalPage] = useState(1);
  const [bannedUsers, setBannedUsers] = useState(new Set());
  const [activity, setActivity] = useState([]);
  const [keyCooldown, setKeyCooldown] = useState(false);
  const actorId = Number(getAuthItem('userId') || 0);
  const actorRole = getAuthItem('authUser') || 'DEFAULT';
  const [keysList, setKeysList] = useState([]);
  const chipsContainer = {
    hidden: { opacity: 0, y: -6 },
    show: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
  };
  const chipItem = {
    hidden: { opacity: 0, y: -6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  };

  useEffect(() => {
    const authUser = getAuthItem('authUser');
    const token = getAuthItem('authToken');
    const authed = authUser === 'ADMIN' || authUser === 'DEVELOPER';
    if (!authed || !actorId || !token) {
      localStorage.setItem('postLoginRedirect', '/admin');
      navigate('/login');
    }
  }, [navigate, actorId]);

  const avatarDataUrl = getAuthItem('avatarDataUrl');

  const [stats, setStats] = useState([
    { label: 'Всего пользователей', value: '0', diff: '0%', icon: <Users size={18} />, accent: 'accent-amber' },
    { label: 'Доход (30д)', value: '₽ 0', diff: '0%', icon: <DollarSign size={18} />, accent: 'accent-green' },
    { label: 'Скачиваний', value: '0', diff: '0%', icon: <Download size={18} />, accent: 'accent-blue' },
  ]);

  const [roleMembers, setRoleMembers] = useState({
    DEVELOPER: [],
    ADMIN: [],
    MODERATOR: [],
    YOUTUBE: [],
    BETA: [],
    PREMIUM: [],
    USER: [],
    DEFAULT: [],
    BANNED: [],
  });

  const roles = [
    { name: 'Developer', count: roleMembers.DEVELOPER.length, badge: 'gold', key: 'DEVELOPER' },
    { name: 'Admin', count: roleMembers.ADMIN.length, badge: 'red', key: 'ADMIN' },
    { name: 'Moderator', count: roleMembers.MODERATOR.length, badge: 'blue', key: 'MODERATOR' },
    { name: 'YouTube', count: roleMembers.YOUTUBE.length, badge: 'pink', key: 'YOUTUBE' },
    { name: 'Beta', count: roleMembers.BETA.length, badge: 'cyan', key: 'BETA' },
    { name: 'Premium', count: roleMembers.PREMIUM.length, badge: 'purple', key: 'PREMIUM' },
    { name: 'User', count: roleMembers.USER.length, badge: 'green', key: 'USER' },
    { name: 'Default', count: roleMembers.DEFAULT.length, badge: 'grey', key: 'DEFAULT' },
    { name: 'Banned', count: roleMembers.BANNED.length, badge: 'dark', key: 'BANNED' },
  ];

  const addActivity = (type, text, target) => {
    const actor = getAuthItem('authUser') || 'ADMIN';
    const actorRole = actor === 'DEVELOPER' ? 'Developer' : 'Admin';
    const actorUid = getAuthItem('userId') || '-';
    const actorName = getAuthItem('username') || actor;
    const now = new Date();
    const time = now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    setActivity((prev) => [{ type, text, actor: actorName, actorRole, actorUid, target, time }, ...prev]);
    setJournalPage(1);
  };

  const formatAction = (a) => {
    const target = (a.target || '').replace('uid:', 'UID ').replace('key:', 'Key ').replace('role:', '');
    const meta = a.meta || '';
    const countMatch = meta.match(/count:(\\d+)/);
    const countText = countMatch ? ` (${countMatch[1]})` : '';
    if (a.action === 'key_generate') return { type: 'key', text: `Созданы ключи${countText}`, target: target || meta.replace('count:', '') };
    if (a.action === 'key_clear') return { type: 'key', text: 'Все ключи удалены', target: 'Keys' };
    if (a.action === 'key_activate') return { type: 'key', text: 'Ключ активирован', target };
    if (a.action === 'role_set') return { type: 'role', text: `Выдана роль ${meta}`, target };
    if (a.action === 'sub_remove') return { type: 'sub', text: 'Снята подписка', target };
    if (a.action === 'password_reset') return { type: 'reset', text: 'Сброшен пароль', target };
    if (a.action === 'hwid_reset') return { type: 'hwid', text: 'Сброшен HWID', target };
    if (a.action === 'ban') return { type: 'ban', text: 'Пользователь забанен', target };
    if (a.action === 'unban') return { type: 'unban', text: 'Пользователь разбанен', target };
    return { type: 'key', text: a.action, target };
  };

  useEffect(() => {
    if (!actorId) return;
    api.stats()
      .then((res) => {
        setStats((prev) => [
          { ...prev[0], value: String(res.users || 0) },
          { ...prev[1], value: `₽ ${res.revenue || 0}` },
          { ...prev[2], value: String(res.downloads || 0) },
        ]);
      })
      .catch(() => {});
  }, [actorId]);

  useEffect(() => {
    if (!actorId) return;
    if (activeTab === 'users') {
      api.listUsers()
        .then((res) => {
          const mapped = (res.users || []).map((u) => ({
            name: u.username,
            email: u.email,
            uid: String(u.id),
            role: u.role,
          }));
          const grouped = {
            DEVELOPER: [],
            ADMIN: [],
            MODERATOR: [],
            YOUTUBE: [],
            BETA: [],
            PREMIUM: [],
            USER: [],
            DEFAULT: [],
            BANNED: [],
          };
          mapped.forEach((u) => {
            if (grouped[u.role]) grouped[u.role].push(u);
          });
          setRoleMembers(grouped);
        })
        .catch(() => {});
    }
    if (activeTab === 'keys') {
      api.listKeys()
        .then((res) => {
          const normalized = (res.keys || []).map((k) => ({
            key: k.code,
            plan: k.role,
            days: k.days === null ? '∞' : k.days,
            status: k.activated_by ? 'active' : 'inactive',
            created: k.created_at,
            user: k.activated_by ? `UID ${k.activated_by}` : '—',
          }));
          setKeysList(normalized);
        })
        .catch(() => {});
    }
    if (activeTab === 'journal') {
      api.listJournal()
        .then((res) => {
          const mapped = (res.actions || []).map((a) => ({
            ...formatAction(a),
            actor: a.actor_name || (a.actor_id ? `user${a.actor_id}` : 'system'),
            actorRole: a.actor_role || 'Admin',
            actorUid: a.actor_id || '-',
            time: a.created_at,
          }));
          setActivity(mapped);
        })
        .catch(() => {});
    }
  }, [actorId, activeTab, selectedRole]);

  const canClearJournal = getAuthItem('authUser') === 'DEVELOPER';

  const clearJournal = async () => {
    if (!canClearJournal) {
      showToast('Доступно только для DEVELOPER', 'error');
      return;
    }
    try {
      await api.clearJournal();
      setActivity([]);
      setJournalPage(1);
      showToast('Журнал очищен', 'success');
    } catch {
      showToast('Ошибка очистки', 'error');
    }
  };

  const filteredMembers = useMemo(() => {
    const list = roleMembers[selectedRole] || [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.uid.toLowerCase().includes(q)
    );
  }, [roleMembers, search, selectedRole]);

  const planLabel = (plan) => {
    if (plan === 'BETA') return 'Beta';
    if (plan === 'PREMIUM') return 'Premium';
    if (plan === 'USER') return 'User';
    return plan;
  };

  const daysLabel = (days) => (days === '∞' ? '∞' : `${days}`);

  const showToast = (message, type = 'success', duration = 3000) => {
    setToastType(type);
    setToastDuration(duration);
    setToast(message);
  };

  const isBanned = selectedUser ? bannedUsers.has(selectedUser.uid) : false;
  const isSelfSelected = selectedUser ? Number(selectedUser.uid) === actorId : false;
  const isActorDeveloper = actorRole === 'DEVELOPER';
  const isActorAdmin = actorRole === 'ADMIN';
  const isTargetDeveloper = selectedUser?.role === 'DEVELOPER';
  const isTargetAdmin = selectedUser?.role === 'ADMIN';

  const roleRank = {
    DEVELOPER: 4,
    ADMIN: 3,
    MODERATOR: 2,
    YOUTUBE: 1,
    BETA: 1,
    PREMIUM: 1,
    USER: 1,
    DEFAULT: 0,
    BANNED: -1,
  };
  const actorRank = roleRank[actorRole] ?? -1;
  const canAssignRole = (roleKey) => {
    if (isSelfSelected) return false;
    if (isTargetDeveloper) return false;
    if (roleKey === 'DEVELOPER' && !isActorDeveloper) return false;
    const nextRank = roleRank[roleKey] ?? -1;
    return actorRank >= nextRank;
  };

  const disableBan = isSelfSelected || isTargetDeveloper;
  const disableRoleChange = isSelfSelected || isTargetDeveloper;
  const disableSubRemove = isTargetDeveloper;
  const disableResetPassword =
    isTargetDeveloper ||
    (isTargetAdmin && isActorAdmin && !isSelfSelected);
  const disableResetHwid = isTargetDeveloper;

  const moveUserToRole = (user, nextRole) => {
    if (!user) return;
    setRoleMembers((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((role) => {
        updated[role] = (updated[role] || []).filter((u) => u.uid !== user.uid);
      });
      if (!updated[nextRole]) updated[nextRole] = [];
      updated[nextRole] = [{ ...user, role: nextRole }, ...(updated[nextRole] || [])];
      return updated;
    });
    setSelectedUser((prev) => (prev ? { ...prev, role: nextRole } : prev));
    setBannedUsers((prev) => {
      const next = new Set(prev);
      if (nextRole === 'BANNED') next.add(user.uid);
      else next.delete(user.uid);
      return next;
    });
  };

  const toggleBan = async () => {
    if (!selectedUser) return;
    if (disableBan) {
      showToast('Недоступно', 'error');
      return;
    }
    const nextBanned = !bannedUsers.has(selectedUser.uid);
    try {
      await api.banUser( Number(selectedUser.uid), nextBanned);
      const nextRole = nextBanned ? 'BANNED' : 'DEFAULT';
      moveUserToRole(selectedUser, nextRole);
      showToast(nextBanned ? 'Пользователь забанен' : 'Пользователь разбанен', 'success');
    } catch {
      showToast('Ошибка', 'error');
    }
  };

  const generateKey = async () => {
    if (keyCooldown) {
      showToast('Подождите 5 секунд', 'error');
      return;
    }
    const count = Math.max(1, Math.min(99, Number(keyCount) || 1));
    try {
      const res = await api.generateKeys(keyPlan, keyDays, count);
      setLastGenerated(res.keys || []);
      const refreshed = await api.listKeys();
      const normalized = (refreshed.keys || []).map((k) => ({
        key: k.code,
        plan: k.role,
        days: k.days === null ? '∞' : k.days,
        status: k.activated_by ? 'active' : 'inactive',
        created: k.created_at,
        user: k.activated_by ? `UID ${k.activated_by}` : '—',
      }));
      setKeysList(normalized);
      setCurrentPage(1);
      showToast('Ключи созданы', 'success');
    } catch {
      showToast('Ошибка создания ключей', 'error');
    }
    setKeyCooldown(true);
    setTimeout(() => setKeyCooldown(false), 5000);
  };

  const deleteKey = (keyValue) => {
    setKeysList((prev) => prev.filter((k) => k.key !== keyValue));
    setCurrentPage(1);
  };

  const clearKeys = async () => {
    try {
      await api.clearKeys();
      setKeysList([]);
      setCurrentPage(1);
      showToast('Все ключи удалены', 'success');
    } catch {
      showToast('Ошибка очистки', 'error');
    }
  };

  const copyGenerated = async () => {
    if (!lastGenerated.length) {
      showToast('Нет ключей для копирования', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(lastGenerated.join('\n'));
      showToast('Скопировано: последняя созданная пачка ключей', 'success', 5000);
    } catch {
      showToast('Не удалось скопировать', 'error');
    }
  };

  const pageSize = 7;
  const totalPages = Math.max(1, Math.ceil(keysList.length / pageSize));
  const currentSlice = keysList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const journalSize = 6;
  const journalTotalPages = Math.max(1, Math.ceil(activity.length / journalSize));
  const journalSlice = activity.slice((journalPage - 1) * journalSize, journalPage * journalSize);
  const pagerItems = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, currentPage - 4);
    if (currentPage <= 5) start = 1;
    if (currentPage > totalPages - 4) start = totalPages - 4;
    return Array.from({ length: 5 }, (_, i) => start + i);
  }, [totalPages, currentPage]);

  const journalPagerItems = useMemo(() => {
    if (journalTotalPages <= 5) {
      return Array.from({ length: journalTotalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, journalPage - 4);
    if (journalPage <= 5) start = 1;
    if (journalPage > journalTotalPages - 4) start = journalTotalPages - 4;
    return Array.from({ length: 5 }, (_, i) => start + i);
  }, [journalTotalPages, journalPage]);

  useEffect(() => {
    if (!toast) return;
    setToastVisible(false);
    const showTimer = requestAnimationFrame(() => setToastVisible(true));
    const hideTimer = setTimeout(() => setToastVisible(false), Math.max(800, toastDuration - 400));
    const clearTimer = setTimeout(() => setToast(''), toastDuration);
    return () => {
      cancelAnimationFrame(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(clearTimer);
    };
  }, [toast, toastDuration]);

  useEffect(() => {
    if (activeTab === 'journal') {
      document.body.classList.add('no-scroll');
      document.documentElement.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
      document.documentElement.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
      document.documentElement.classList.remove('no-scroll');
    };
  }, [activeTab]);

  return (
    <motion.section
      className="admin-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="admin-bg-grid" />
      <div className="admin-glow" />
      <div className="container admin-container">
        <motion.header
          className="admin-header"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div>
            <p className="admin-kicker">Панель управления</p>
            <h1>Admin Control Center</h1>
          </div>
          <motion.div className="admin-cats" variants={chipsContainer} initial="hidden" animate="show">
            <motion.button
              type="button"
              className={`admin-chip ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
              variants={chipItem}
            >
              <Users size={14} />
              Управление пользователями
            </motion.button>
            <motion.button
              type="button"
              className={`admin-chip ${activeTab === 'keys' ? 'active' : ''}`}
              onClick={() => setActiveTab('keys')}
              variants={chipItem}
            >
              <KeyRound size={14} />
              Управление ключами
            </motion.button>
            <motion.button
              type="button"
              className={`admin-chip ${activeTab === 'journal' ? 'active' : ''}`}
              onClick={() => setActiveTab('journal')}
              variants={chipItem}
            >
              <Activity size={14} />
              Журнал действий
            </motion.button>
          </motion.div>
        </motion.header>

        <div className="admin-grid">
          {stats.map((card) => (
            <div key={card.label} className={`admin-card stat-card ${card.accent}`}>
              <div className="stat-icon">{card.icon}</div>
              <div className="stat-body">
                <p className="stat-label">{card.label}</p>
                <div className="stat-value-row">
                  <span className="stat-value">{card.value}</span>
                  <span className="stat-diff">{card.diff}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="admin-panels">
              <div className="admin-card roles-card">
                <div className="card-head">
                  <div>
                    <p className="card-kicker">Роли</p>
                    <h3>Распределение доступа</h3>
                  </div>
                  <ShieldCheck size={16} className="icon-faint" />
                </div>
                <div className="roles-grid">
                  {roles.map((role) => (
                    <button
                      key={role.key}
                      type="button"
                      className={`role-pill ${selectedRole === role.key ? 'active' : ''}`}
                      onClick={() => setSelectedRole(role.key)}
                      aria-pressed={selectedRole === role.key}
                    >
                      <span className={`role-dot ${role.badge}`} />
                      <span className="role-name">{role.name}</span>
                      <span className="role-count">{role.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-card users-card">
                <div className="card-head">
                  <div>
                    <p className="card-kicker">Пользователи</p>
                    <h3>Поиск и роли</h3>
                  </div>
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Поиск по нику / email / UID"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="selected-role">
                  <span>Роль:</span>
                  <strong>{roles.find((r) => r.key === selectedRole)?.name || selectedRole}</strong>
                </div>
                <div className="members-list">
                  {filteredMembers.map((m) => (
                    <button
                      key={m.uid}
                      type="button"
                    className={`member-row ${selectedUser?.uid === m.uid ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedUser(m);
                      if (m.role === 'BANNED') {
                        setBannedUsers((prev) => new Set(prev).add(m.uid));
                      }
                    }}
                  >
                      <div className="avatar-badge">
                        {avatarDataUrl ? (
                          <img src={avatarDataUrl} alt="Avatar" />
                        ) : (
                          <User size={16} />
                        )}
                      </div>
                      <div className="member-info">
                        <span className="member-name">{m.name}</span>
                        <span className="member-email">{m.email}</span>
                        <div className="member-meta">
                          <span className="member-role">{roles.find((r) => r.key === selectedRole)?.name}</span>
                          <span className="member-sep">|</span>
                          <span className="member-uid mono">UID: {m.uid}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredMembers.length === 0 && (
                    <div className="empty">Ничего не найдено</div>
                  )}
                </div>
              </div>
            </div>
            <div className="admin-card user-detail">
              {selectedUser ? (
                <>
                  <div className="user-panel-header">
                    <div className="avatar-badge large">
                      {avatarDataUrl ? (
                        <img src={avatarDataUrl} alt="Avatar" />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <div>
                      <div className="member-name">{selectedUser.name}</div>
                      <div className="member-meta">
                        <span>{selectedUser.email}</span>
                        <span className="member-sep">|</span>
                        <span className="mono">UID: {selectedUser.uid}</span>
                      </div>
                    </div>
                  </div>
                  <div className="user-actions">
                    <button
                      className={`ghost-btn danger ${isBanned ? 'success' : ''}`}
                      type="button"
                      disabled={disableBan}
                      onClick={toggleBan}
                    >
                      {isBanned ? 'Разбанить' : 'Забанить'}
                    </button>
                    <button
                      className="ghost-btn"
                      type="button"
                      disabled={disableRoleChange}
                      onClick={async () => {
                        if (disableRoleChange) {
                          showToast('Недоступно', 'error');
                          return;
                        }
                        if (!canAssignRole('DEFAULT')) {
                          showToast('Недоступно', 'error');
                          return;
                        }
                        if (!selectedUser) return;
                        try {
                          await api.setRole( Number(selectedUser.uid), 'DEFAULT');
                          moveUserToRole(selectedUser, 'DEFAULT');
                          setAssignRole('DEFAULT');
                          showToast('Роль снята', 'success');
                        } catch {
                          showToast('Ошибка', 'error');
                        }
                      }}
                    >
                      Снять роль
                    </button>
                    <button
                      className="ghost-btn"
                      type="button"
                      disabled={disableSubRemove}
                      onClick={async () => {
                        if (disableSubRemove) {
                          showToast('Недоступно', 'error');
                          return;
                        }
                        if (!selectedUser) return;
                        try {
                          await api.removeSubscription( Number(selectedUser.uid));
                          showToast('Подписка снята', 'success');
                        } catch {
                          showToast('Ошибка', 'error');
                        }
                      }}
                    >
                      Снять подписку
                    </button>
                    <button
                      className="ghost-btn"
                      type="button"
                      disabled={disableResetHwid}
                      onClick={async () => {
                        if (disableResetHwid) {
                          showToast('Недоступно', 'error');
                          return;
                        }
                        if (!selectedUser) return;
                        try {
                          await api.resetHwid( Number(selectedUser.uid));
                          showToast('HWID сброшен', 'success');
                        } catch {
                          showToast('Ошибка', 'error');
                        }
                      }}
                    >
                      Сбросить HWID
                    </button>
                    <button
                      className="ghost-btn"
                      type="button"
                      disabled={disableResetPassword}
                      onClick={() => {
                        if (disableResetPassword) {
                          showToast('Недоступно', 'error');
                          return;
                        }
                        setShowResetPassword((prev) => !prev);
                      }}
                    >
                      Сбросить пароль
                    </button>
                    <button
                      className="ghost-btn"
                      type="button"
                      disabled={disableRoleChange}
                      onClick={() => {
                        if (disableRoleChange) {
                          showToast('Недоступно', 'error');
                          return;
                        }
                        setShowAssignRole((prev) => !prev);
                      }}
                    >
                      Выдать роль
                    </button>
                  </div>
                  <div className="user-detail-grid">
                    <div className={`user-control user-reveal role-reveal ${showAssignRole ? 'visible' : ''}`}>
                      <span>Роль</span>
                      <div className="user-role-chips">
                        {roles.map((role) => (
                          <button
                            key={role.key}
                            type="button"
                            className={`role-chip ${assignRole === role.key ? 'active' : ''} ${!canAssignRole(role.key) ? 'disabled' : ''}`}
                            disabled={!canAssignRole(role.key)}
                            onClick={() => {
                              if (!canAssignRole(role.key)) {
                                showToast('Недоступно', 'error');
                                return;
                              }
                              if (!selectedUser) return;
                              api.setRole( Number(selectedUser.uid), role.key)
                                .then(() => {
                                  setAssignRole(role.key);
                                  moveUserToRole(selectedUser, role.key);
                                  setShowAssignRole(false);
                                  showToast(`Роль ${role.name} выдана`, 'success');
                                })
                                .catch(() => showToast('Ошибка', 'error'));
                            }}
                          >
                            <span className={`role-dot ${role.badge}`} />
                            {role.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={`user-control user-reveal ${showResetPassword ? 'visible' : ''}`}>
                      <span>Сброс пароля</span>
                      <div className="reset-hint">
                        Новый пароль будет сгенерирован автоматически и отправлен в Telegram пользователя.
                      </div>
                      <button
                        type="button"
                        className="ghost-btn apply-btn"
                        onClick={() => {
                          if (!selectedUser) return;
                          api.resetPassword(Number(selectedUser.uid))
                            .then((res) => {
                              if (res?.delivered) {
                                showToast('Новый пароль отправлен в Telegram', 'success');
                              } else if (res?.linked) {
                                showToast('Пароль сброшен, но Telegram не ответил', 'error');
                              } else {
                                showToast('Пароль сброшен, Telegram не привязан', 'error');
                              }
                              setShowResetPassword(false);
                            })
                            .catch(() => showToast('Ошибка', 'error'));
                        }}
                      >
                        Сбросить и отправить
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty">Выбери пользователя, чтобы открыть управление</div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'keys' && (
          <motion.div
            key="keys"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
          <div className="admin-panels">
            <div className="admin-card keys-card">
              <div className="card-head">
                <div>
                  <p className="card-kicker">Ключи</p>
                  <h3>Управление активациями</h3>
                </div>
                <div className="key-controls">
                  <div className="key-field">
                    <span>Количество</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={keyCount}
                      onChange={(e) => {
                        const next = e.target.value.replace(/[^0-9]/g, '');
                        setKeyCount(next);
                      }}
                    />
                  </div>
                  <div className="key-field">
                    <span>Роль</span>
                    <div className={`dropdown ${planOpen ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="dropdown-trigger"
                        onClick={() => setPlanOpen(!planOpen)}
                      >
                        {planLabel(keyPlan)}
                        <ChevronDown size={14} />
                      </button>
                      <div className="dropdown-menu">
                        {['BETA', 'PREMIUM', 'USER'].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className="dropdown-item"
                            onClick={() => {
                              setKeyPlan(opt);
                              setPlanOpen(false);
                            }}
                          >
                            {planLabel(opt)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="key-field">
                    <span>Дней</span>
                    <div className={`dropdown ${daysOpen ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="dropdown-trigger"
                        onClick={() => setDaysOpen(!daysOpen)}
                      >
                        {daysLabel(keyDays)}
                        <ChevronDown size={14} />
                      </button>
                      <div className="dropdown-menu">
                        {['7', '14', '30', '90', '∞'].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className="dropdown-item"
                            onClick={() => {
                              setKeyDays(opt);
                              setDaysOpen(false);
                            }}
                          >
                            {daysLabel(opt)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button className="ghost-btn" type="button" onClick={generateKey}>
                    <KeyRound size={14} />
                    Сгенерировать
                  </button>
                  <button className="ghost-btn" type="button" onClick={copyGenerated}>
                    <Copy size={14} />
                    Скопировать
                  </button>
                </div>
              </div>
              <div className="table">
                <div className="table-head">
                  <span className="head-with-icon">
                    <Key size={12} />
                    Ключ
                  </span>
                  <span className="head-with-icon">
                    <Tag size={12} />
                    Роль
                  </span>
                  <span className="head-with-icon">
                    <Calendar size={12} />
                    Дней
                  </span>
                  <span className="head-with-icon">
                    <Clock3 size={12} />
                    Создан
                  </span>
                  <span className="head-with-icon">
                    <UserCheck size={12} />
                    Активировал
                  </span>
                  <span className="head-with-icon">
                    <BadgeCheck size={12} />
                    Статус
                  </span>
                  <span className="head-with-icon">
                    <Trash2 size={12} />
                    Удалить
                  </span>
                </div>
                {currentSlice.length === 0 ? (
                  <div className="empty">Нету ключей</div>
                ) : (
                  currentSlice.map((k) => (
                    <div key={k.key} className="table-row">
                      <span className="mono">{k.key}</span>
                      <span>{planLabel(k.plan)}</span>
                      <span className="days-cell">{k.days === '∞' ? '∞' : k.days}</span>
                      <span>{k.created}</span>
                      <span>{k.user}</span>
                      <span className={`badge ${k.status}`}>{k.status}</span>
                      <button
                        type="button"
                        className="trash-btn"
                        aria-label={`Удалить ключ ${k.key}`}
                        onClick={() => deleteKey(k.key)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
                <div className="keys-actions">
                  <div className="pager">
                    <button
                      className="page-nav"
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {pagerItems.map((item, idx) => (
                        <button
                          key={item}
                          className={`page-btn ${currentPage === item ? 'active' : ''}`}
                          onClick={() => setCurrentPage(item)}
                        >
                          {item}
                        </button>
                    ))}
                    <button
                      className="page-nav"
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight size={14} />
                    </button>
                    <input
                      className="page-jump"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="№"
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        const value = Number(e.currentTarget.value);
                        if (!Number.isFinite(value)) return;
                        const next = Math.max(1, Math.min(totalPages, value));
                        setCurrentPage(next);
                        e.currentTarget.value = '';
                      }}
                    />
                  </div>
                  <button className="ghost-btn danger clear-keys" type="button" onClick={clearKeys}>
                    Очистить все ключи
                  </button>
                </div>
              </div>
            </div>
          </div>
          </motion.div>
        )}

        {activeTab === 'journal' && (
          <motion.div
            key="journal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
          <div className="admin-panels">
            <div className="admin-card activity-card">
              <div className="card-head">
                <div>
                  <p className="card-kicker">Лента событий</p>
                  <h3>Журнал действий</h3>
                </div>
                {canClearJournal && (
                  <button className="ghost-btn danger clear-keys" type="button" onClick={clearJournal}>
                    Очистить журнал
                  </button>
                )}
              </div>
              <div className="journal-list">
                {journalSlice.length === 0 ? (
                  <div className="empty">Нет событий</div>
                ) : (
                  journalSlice.map((a, idx) => (
                    <div key={`${a.time}-${idx}`} className="journal-row">
                      <div className="journal-icon">
                        {a.type === 'key' && <KeyRound size={14} />}
                        {a.type === 'role' && <ShieldCheck size={14} />}
                        {a.type === 'ban' && <ShieldCheck size={14} />}
                        {a.type === 'unban' && <ShieldCheck size={14} />}
                        {a.type === 'reset' && <UserCheck size={14} />}
                        {a.type === 'hwid' && <ShieldCheck size={14} />}
                        {a.type === 'sub' && <BadgeCheck size={14} />}
                      </div>
                      <div className="journal-body">
                        <div className="journal-title">{a.text}</div>
                        <div className="journal-meta">
                          <span className="journal-pill">{a.actorRole}</span>
                          <span className="journal-sep">•</span>
                          <span className="journal-uid">UID {a.actorUid}</span>
                          <span className="journal-sep">•</span>
                          <span className="journal-actor">{a.actor}</span>
                          <span className="journal-sep">•</span>
                          <span>{a.target}</span>
                        </div>
                      </div>
                      <div className="journal-time">{a.time}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="keys-actions">
                <div className="pager">
                  <button
                    className="page-nav"
                    type="button"
                    onClick={() => setJournalPage((prev) => Math.max(1, prev - 1))}
                    disabled={journalPage === 1}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {journalPagerItems.map((item) => (
                    <button
                      key={item}
                      className={`page-btn ${journalPage === item ? 'active' : ''}`}
                      onClick={() => setJournalPage(item)}
                    >
                      {item}
                    </button>
                  ))}
                  <button
                    className="page-nav"
                    type="button"
                    onClick={() => setJournalPage((prev) => Math.min(journalTotalPages, prev + 1))}
                    disabled={journalPage === journalTotalPages}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
      {toast && (
        <div className={`toast ${toastType} ${toastVisible ? 'show' : ''}`}>
          <span>{toast}</span>
        </div>
      )}
    </motion.section>
  );
};

export default Admin;

