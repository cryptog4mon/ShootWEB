import React, { useState, useEffect, useRef } from 'react';
import { Lock, User, Smartphone, Check, X, Clock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';
import { setAuthItems } from '../utils/authStorage';
import AntiBotField from '../components/AntiBotField';
import './Login.css';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [isAntiBotVerified, setIsAntiBotVerified] = useState(false);
  const [loginValue, setLoginValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [antibotError, setAntibotError] = useState('');
  const navigate = useNavigate();

  const [show2FA, setShow2FA] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [twoFAStatus, setTwoFAStatus] = useState('pending');
  const [countdown, setCountdown] = useState(120);
  const wsRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (!show2FA || !sessionId) return;

    const checkStatus = async () => {
      try {
        const result = await api.check2FA(sessionId);
        if (result.status === 'approved') {
          setTwoFAStatus('approved');
          const payload = {
            authUser: result.user.role,
            userId: String(result.user.id),
            username: result.user.username || '',
            userEmail: result.user.email || '',
          };
          if (result.token) payload.authToken = result.token;
          setAuthItems(payload, rememberMe);
          setTimeout(() => {
            if (result.user.role === 'BANNED') {
              navigate('/profile/tikets');
            } else {
              const redirectTo = localStorage.getItem('postLoginRedirect');
              if (redirectTo) {
                localStorage.removeItem('postLoginRedirect');
                navigate(redirectTo);
              } else {
                navigate('/profile');
              }
            }
          }, 1500);
        } else if (result.status === 'denied') {
          setTwoFAStatus('denied');
        } else if (result.status === 'timeout') {
          setTwoFAStatus('timeout');
        }
      } catch {
      }
    };

    pollIntervalRef.current = setInterval(checkStatus, 2000);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:5174`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        wsRef.current.send(JSON.stringify({ type: '2fa_subscribe', sessionId }));
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === '2fa_status') {
            if (data.status === 'approved' || data.status === 'denied' || data.status === 'timeout') {
              checkStatus();
            }
          }
        } catch {
        }
      };
    } catch {
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearInterval(countdownInterval);
    };
  }, [show2FA, sessionId, navigate, rememberMe]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!isAntiBotVerified) {
      setError('Please complete the AntiBot verification');
      return;
    }
    
    try {
      const result = await api.login(loginValue, passwordValue);

      if (result.requires2FA) {
        setSessionId(result.sessionId);
        setShow2FA(true);
        setTwoFAStatus('pending');
        setCountdown(120);
        setError('');
        return;
      }

      const user = result.user;
      const payload = {
        authUser: user.role,
        userId: String(user.id),
        username: user.username || '',
        userEmail: user.email || '',
      };
      if (result.token) payload.authToken = result.token;
      setAuthItems(payload, rememberMe);
      setError('');
      if (user.role === 'BANNED') {
        navigate('/profile/tikets');
        return;
      }
      const redirectTo = localStorage.getItem('postLoginRedirect');
      if (redirectTo) {
        localStorage.removeItem('postLoginRedirect');
        navigate(redirectTo);
        return;
      }
      navigate('/profile');
    } catch (err) {
      setError('Wrong login or password');
    }
  };

  const handleRetry = () => {
    setShow2FA(false);
    setSessionId('');
    setTwoFAStatus('pending');
    setCountdown(120);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.section
      className="login-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="login-bg-glow"></div>
      <div className="container login-container">
        <AnimatePresence mode="wait">
          {!show2FA ? (
            <motion.div
              key="login-form"
              className="login-card glass-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="login-header">
                <h2>Authorization</h2>
                <p>{t.hero.subtitle || 'Secure access to your account'}</p>
              </div>

              <form className="login-form" onSubmit={handleSubmit}>
                <label className="input-label">
                  <span>Login or email</span>
                  <div className="input-wrap">
                    <User size={16} />
                    <input
                      type="text"
                      placeholder="Username or email"
                      autoComplete="off"
                      spellCheck="false"
                      value={loginValue}
                      onChange={(e) => setLoginValue(e.target.value)}
                    />
                  </div>
                </label>

                <label className="input-label">
                  <span>Password</span>
                  <div className="input-wrap">
                    <Lock size={16} />
                    <input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      spellCheck="false"
                      value={passwordValue}
                      onChange={(e) => setPasswordValue(e.target.value)}
                    />
                  </div>
                </label>

                <AntiBotField 
                  onVerified={(verified) => {
                    setIsAntiBotVerified(verified);
                    setAntibotError('');
                  }}
                  onError={(message) => {
                    setAntibotError(message);
                    setIsAntiBotVerified(false);
                  }}
                />

                <div className="login-actions">
                  <label className="remember">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                    <span className="remember-box">
                      <svg className="remember-check" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M3.5 8.5l2.5 2.5 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="remember-text">Remember me</span>
                  </label>
                  <a href="#" className="forgot">Forgot password?</a>
                </div>

                {(error || antibotError) && (
                  <div className="login-error">
                    {error || antibotError}
                  </div>
                )}

                <button className="btn-hero-primary login-submit" type="submit">
                  {t.footer.signIn}
                </button>

                <div className="login-footer">
                  <span>New here?</span>
                  <a href="/register">Create account</a>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="2fa-screen"
              className="login-card glass-panel twofa-verification"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="twofa-screen">
                {twoFAStatus === 'pending' && (
                  <>
                    <div className="twofa-icon pending">
                      <Smartphone size={32} />
                      <div className="twofa-pulse"></div>
                    </div>
                    <h2>Подтвердите вход</h2>
                    <p>Мы отправили запрос в ваш Telegram</p>
                    <div className="twofa-loader">
                      <Loader2 className="twofa-spinner" size={24} />
                      <span>Ожидание подтверждения...</span>
                    </div>
                  </>
                )}

                {twoFAStatus === 'approved' && (
                  <>
                    <div className="twofa-icon approved">
                      <Check size={32} />
                    </div>
                    <h2>Вход подтверждён</h2>
                    <p>Добро пожаловать!</p>
                    <div className="twofa-success-loader">
                      <Loader2 className="twofa-spinner" size={20} />
                      <span>Переход в профиль...</span>
                    </div>
                  </>
                )}

                {twoFAStatus === 'denied' && (
                  <>
                    <div className="twofa-icon denied">
                      <X size={32} />
                    </div>
                    <h2>Вход отклонён</h2>
                    <p>Запрос на вход был отклонён в Telegram</p>
                    <button className="twofa-retry-btn" onClick={handleRetry}>
                      Попробовать снова
                    </button>
                  </>
                )}

                {twoFAStatus === 'timeout' && (
                  <>
                    <div className="twofa-icon timeout">
                      <Clock size={32} />
                    </div>
                    <h2>Время истекло</h2>
                    <p>Запрос на подтверждение не был обработан вовремя</p>
                    <button className="twofa-retry-btn" onClick={handleRetry}>
                      Попробовать снова
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
};

export default Login;
