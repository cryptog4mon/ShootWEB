import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, KeyRound, Mail, User, UserCircle, Calendar, CalendarClock, Ticket, Shield, Sparkles, Smartphone, X, Check, Clock, History, Unlink } from 'lucide-react';
import './Profile.css';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import { getAuthItem, setAuthItemAuto } from '../utils/authStorage';

const Profile = () => {
  const navigate = useNavigate();
  const [keyValue, setKeyValue] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profile, setProfile] = useState(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [premiumActive, setPremiumActive] = useState(false);
  const [activationError, setActivationError] = useState('');
  const fileInputRef = useRef(null);

  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAStatus, setTwoFAStatus] = useState({ enabled: false, linked: false });
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [loginHistory, setLoginHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const canUse2FA = profile?.role === 'ADMIN' || profile?.role === 'DEVELOPER';

  useEffect(() => {
    const authUser = getAuthItem('authUser');
    const userId = getAuthItem('userId');
    const token = getAuthItem('authToken');
    if (!authUser || !userId || !token) {
      navigate('/login');
      return;
    }
    api.profile(userId)
      .then((res) => {
        if (res.user?.role === 'BANNED') {
          navigate('/profile/tikets');
          return;
        }
        setProfile(res.user);
        setSubscriptionActive(res.subscriptionActive);
        setPremiumActive(!!res.premiumActive);
      })
      .catch(() => {
        navigate('/login');
      });
  }, [navigate]);

  useEffect(() => {
    const savedAvatar = getAuthItem('avatarDataUrl');
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
  }, []);

  useEffect(() => {
    if (profile && (profile.role === 'ADMIN' || profile.role === 'DEVELOPER')) {
      api.get2FAStatus()
        .then((status) => {
          setTwoFAStatus(status);
        })
        .catch(() => { });
    }
  }, [profile]);

  useEffect(() => {
    if (!show2FAModal || !canUse2FA) return;
    let active = true;
    const tick = async () => {
      try {
        const status = await api.get2FAStatus();
        if (!active) return;
        setTwoFAStatus(status);
        if (status.linked) {
          setLinkUrl('');
          setLinkCode('');
        }
      } catch {
      }
    };
    tick();
    const interval = setInterval(tick, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [show2FAModal, canUse2FA]);

  const handleAvatarPick = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        setAuthItemAuto('avatarDataUrl', result);
        setAvatarUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTickets = () => {
    if (subscriptionActive) {
      navigate('/profile/tikets');
    }
  };

  const handleAdminPanel = () => {
    if (profile?.role === 'ADMIN' || profile?.role === 'DEVELOPER') {
      navigate('/admin');
    }
  };

  const handleActivate = async () => {
    const userId = getAuthItem('userId');
    if (!userId || !keyValue.trim()) return;
    try {
      setActivationError('');
      await api.activateKey(keyValue.trim());
      const res = await api.profile(userId);
      setProfile(res.user);
      setSubscriptionActive(res.subscriptionActive);
      setPremiumActive(!!res.premiumActive);
      setKeyValue('');
    } catch {
      setActivationError('Invalid or used key');
    }
  };

  const handle2FAClick = () => {
    setShow2FAModal(true);
    setShowHistory(false);
    setLinkUrl('');
    setLinkCode('');
  };

  const handleGenerateLink = async () => {
    setTwoFALoading(true);
    try {
      const result = await api.generate2FALink();
      setLinkUrl(result.linkUrl);
      setLinkCode(result.code);
    } catch {
    }
    setTwoFALoading(false);
  };

  const handleUnlink2FA = async () => {
    setTwoFALoading(true);
    try {
      await api.unlink2FA();
      setTwoFAStatus({ enabled: false, linked: false });
      setLinkUrl('');
      setLinkCode('');
    } catch {
    }
    setTwoFALoading(false);
  };

  const handleToggle2FA = async () => {
    setTwoFALoading(true);
    try {
      await api.toggle2FA(!twoFAStatus.enabled);
      setTwoFAStatus({ ...twoFAStatus, enabled: !twoFAStatus.enabled });
    } catch {
    }
    setTwoFALoading(false);
  };

  const handleLoadHistory = async () => {
    setShowHistory(true);
    try {
      const result = await api.get2FAHistory();
      setLoginHistory(result.history || []);
    } catch {
      setLoginHistory([]);
    }
  };

  const refreshStatus = async () => {
    try {
      const status = await api.get2FAStatus();
      setTwoFAStatus(status);
    } catch {
    }
  };

  const baseRole = profile?.subscription_role && profile?.subscription_role !== 'PREMIUM'
    ? profile.subscription_role
    : null;

  const baseUntil = subscriptionActive
    ? (profile?.subscription_until ? new Date(profile.subscription_until).toLocaleString('ru-RU') : 'Forever')
    : '-';

  const premiumUntil = premiumActive
    ? (profile?.premium_until ? new Date(profile.premium_until).toLocaleString('ru-RU') : 'Forever')
    : '-';

  return (
    <motion.section
      className="profile-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="profile-bg-grid"></div>
      <div className="profile-bg-glow"></div>
      <div className="container profile-container">
        <div className="profile-card">
          <div className="profile-layout">
            <div className="profile-left">
              <div className="profile-avatar" onClick={() => fileInputRef.current?.click()}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" />
                ) : (
                  <User size={36} />
                )}
                <div className="avatar-overlay">Change</div>
                <input
                  ref={fileInputRef}
                  className="avatar-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarPick}
                />
              </div>
              <div className="profile-title">
                <h2>{profile?.username || 'User'}</h2>
                <div className="profile-sub">{profile?.email || ''}</div>
              </div>
              <div className="profile-uid">
                UID: {profile?.id || 0}
              </div>
              <div className="profile-tags">
                <span className="tag-pill">Role: {profile?.role || 'DEFAULT'}</span>
                <span className="tag-pill muted">
                  {subscriptionActive ? `Subscription: ${baseRole || '-'}` : 'Subscription: none'}
                </span>
                {premiumActive && (
                  <span className="tag-pill">Premium: active</span>
                )}
              </div>
              <button className="btn-trial admin-btn download-btn profile-action-btn" type="button" disabled={!subscriptionActive}>
                <Download size={16} />
                <span className="btn-gradient-text">Download client</span>
              </button>
              <button className="btn-trial admin-btn tickets-btn profile-action-btn" type="button" onClick={handleTickets} disabled={!subscriptionActive}>
                <Ticket size={16} />
                <span className="btn-gradient-text">Tickets</span>
              </button>
              {canUse2FA && (
                <button className="btn-trial admin-btn twofa-btn profile-action-btn" type="button" onClick={handle2FAClick}>
                  <Smartphone size={16} />
                  <span className="btn-gradient-text">2FA Telegram</span>
                </button>
              )}
              {(profile?.role === 'ADMIN' || profile?.role === 'DEVELOPER') && (
                <button className="btn-trial admin-btn profile-action-btn" type="button" onClick={handleAdminPanel}>
                  <Shield size={16} />
                  <span className="btn-gradient-text">Admin panel</span>
                </button>
              )}
            </div>

            <div className="profile-right">
              <div className="profile-section-title">Account details</div>
              <div className="profile-list">
                <div className="profile-row">
                  <span><UserCircle size={14} /> Login</span>
                  <strong>{profile?.username || '-'}</strong>
                </div>
                <div className="profile-row">
                  <span><Mail size={14} /> E-mail</span>
                  <strong>{profile?.email || '-'}</strong>
                </div>
                <div className="profile-row">
                  <span><Calendar size={14} /> Registration Date</span>
                  <strong>{profile?.created_at || '-'}</strong>
                </div>
                <div className="profile-row">
                  <span><CalendarClock size={14} /> Subscription Until</span>
                  <strong>{baseUntil}</strong>
                </div>
                {premiumActive && (
                  <div className="profile-row">
                    <span><Sparkles size={14} /> Premium Until</span>
                    <strong>{premiumUntil}</strong>
                  </div>
                )}
              </div>

              <div className="profile-activation">
                <div className="item-label">Activation key</div>
                <div className="activation-row">
                  <div className="input-wrap">
                    <KeyRound size={16} />
                    <input
                      type="text"
                      placeholder="Enter key"
                      value={keyValue}
                      onChange={(e) => setKeyValue(e.target.value)}
                    />
                  </div>
                  <button className="btn-hero-primary activate-btn profile-action-btn" type="button" disabled={!keyValue} onClick={handleActivate}>
                    <span className="btn-gradient-text">Activate</span>
                  </button>
                </div>
                {activationError && <div className="login-error">{activationError}</div>}
              </div>
            </div>
          </div>

          <div className="profile-footer"></div>
        </div>
      </div>

      <AnimatePresence>
        {show2FAModal && (
          <motion.div
            className="twofa-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShow2FAModal(false)}
          >
            <motion.div
              className="twofa-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="twofa-modal-header">
                <div className="twofa-modal-icon">
                  <Smartphone size={24} />
                </div>
                <h3>Telegram 2FA</h3>
                <button className="twofa-close" onClick={() => setShow2FAModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="twofa-modal-content">
                {!showHistory ? (
                  <>
                    <div className="twofa-status-card">
                      <div className="twofa-status-row">
                        <span>Статус</span>
                        <div className={`twofa-status-badge ${twoFAStatus.enabled ? 'active' : 'inactive'}`}>
                          {twoFAStatus.enabled ? (
                            <><Check size={12} /> Включена</>
                          ) : (
                            <><X size={12} /> Выключена</>
                          )}
                        </div>
                      </div>
                      <div className="twofa-status-row">
                        <span>Telegram</span>
                        <div className={`twofa-status-badge ${twoFAStatus.linked ? 'linked' : 'not-linked'}`}>
                          {twoFAStatus.linked ? (
                            <><Check size={12} /> {twoFAStatus.telegramUsername ? `@${twoFAStatus.telegramUsername}` : 'Привязан'}</>
                          ) : (
                            <><X size={12} /> Не привязан</>
                          )}
                        </div>
                      </div>
                      {twoFAStatus.linkedAt && (
                        <div className="twofa-status-row">
                          <span>Привязан</span>
                          <span className="twofa-date">{twoFAStatus.linkedAt}</span>
                        </div>
                      )}
                    </div>

                    {!twoFAStatus.linked ? (
                      <div className="twofa-link-section">
                        <p className="twofa-description">
                          Привяжите Telegram для защиты аккаунта. При каждом входе вам будет приходить уведомление с запросом на подтверждение.
                        </p>
                        {linkUrl ? (
                          <div className="twofa-link-result">
                            <div className="twofa-link-box">
                              <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="twofa-link-button">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                                </svg>
                                Открыть в Telegram
                              </a>
                            </div>
                            <button className="twofa-refresh-btn" onClick={refreshStatus} disabled={twoFALoading}>
                              Проверить статус
                            </button>
                          </div>
                        ) : (
                          <button className="twofa-generate-btn" onClick={handleGenerateLink} disabled={twoFALoading}>
                            {twoFALoading ? 'Генерация...' : 'Получить ссылку для привязки'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="twofa-controls">
                        <button className="twofa-history-btn" onClick={handleLoadHistory}>
                          <History size={16} /> История входов
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="twofa-history">
                    <button className="twofa-back-btn" onClick={() => setShowHistory(false)}>
                      ← Назад
                    </button>
                    <h4>История входов</h4>
                    {loginHistory.length === 0 ? (
                      <div className="twofa-history-empty">История пуста</div>
                    ) : (
                      <div className="twofa-history-list">
                        {loginHistory.map((entry, index) => (
                          <div key={index} className={`twofa-history-item ${entry.status}`}>
                            <div className="twofa-history-icon">
                              {entry.status === 'approved' && <Check size={16} />}
                              {entry.status === 'denied' && <X size={16} />}
                              {entry.status === 'pending' && <Clock size={16} />}
                              {entry.status === 'timeout' && <Clock size={16} />}
                            </div>
                            <div className="twofa-history-info">
                              <div className="twofa-history-ip">{entry.ip || 'Unknown IP'}</div>
                              <div className="twofa-history-date">{entry.created_at}</div>
                            </div>
                            <div className={`twofa-history-status ${entry.status}`}>
                              {entry.status === 'approved' && 'Разрешён'}
                              {entry.status === 'denied' && 'Отклонён'}
                              {entry.status === 'pending' && 'Ожидание'}
                              {entry.status === 'timeout' && 'Истёк'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};

export default Profile;
