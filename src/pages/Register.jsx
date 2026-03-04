import React, { useState } from 'react';
import { Lock, Mail, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { setAuthItems } from '../utils/authStorage';
import AntiBotField from '../components/AntiBotField';
import './Login.css';

const Register = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [isAntiBotVerified, setIsAntiBotVerified] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState('');
  const [antibotError, setAntibotError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (event) => {
    event.preventDefault();
    
    console.log('Registration attempt:', {
      isAntiBotVerified,
      username,
      email,
      passwordLength: password?.length
    });
    
    if (!isAntiBotVerified) {
      console.log('AntiBot not verified');
      setError('Please complete the AntiBot verification');
      return;
    }
    
    if (!username || !email || !password) {
      console.log('Missing fields');
      setError('Fill all fields');
      return;
    }
    if (password !== repeatPassword) {
      console.log('Passwords do not match');
      setError('Passwords do not match');
      return;
    }
    try {
      console.log('Calling API register...');
      const result = await api.register(username, email, password);
      console.log('API register result:', result);
      const user = result.user;
      const payload = {
        authUser: user.role,
        userId: String(user.id),
        username: user.username || '',
        userEmail: user.email || '',
      };
      if (result.token) payload.authToken = result.token;
      setAuthItems(payload, true);
      setError('');
      navigate('/profile');
    } catch (err) {
      console.error('Registration error:', err);
      if (err.error === 'username_exists') {
        setError('Username already exists');
      } else if (err.error === 'email_exists') {
        setError('Email already exists');
      } else if (err.error === 'user_exists') {
        setError('User already exists');
      } else {
        setError('Registration failed');
      }
    }
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
        <div className="login-card glass-panel">
          <div className="login-header">
            <h2>Registration</h2>
            <p>{t.hero.subtitle || 'Create your account'}</p>
          </div>

          <form className="login-form" onSubmit={handleRegister}>
            <label className="input-label">
              <span>Login</span>
              <div className="input-wrap">
                <User size={16} />
                <input
                  type="text"
                  placeholder="Username"
                  autoComplete="off"
                  spellCheck="false"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </label>

            <label className="input-label">
              <span>Email</span>
              <div className="input-wrap">
                <Mail size={16} />
                <input
                  type="email"
                  placeholder="name@email.com"
                  autoComplete="off"
                  spellCheck="false"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </label>

            <label className="input-label">
              <span>Repeat password</span>
              <div className="input-wrap">
                <Lock size={16} />
                <input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  spellCheck="false"
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
            </label>

            <AntiBotField 
              onVerified={(verified) => {
                console.log('AntiBot verified callback called:', verified);
                setIsAntiBotVerified(verified);
                setAntibotError('');
              }}
              onError={(message) => {
                console.log('AntiBot error callback called:', message);
                setAntibotError(message);
                setIsAntiBotVerified(false);
              }}
            />

            {(error || antibotError) && (
              <div className="login-error">
                {error || antibotError}
              </div>
            )}

            <button className="btn-hero-primary login-submit" type="submit">
              Register
            </button>

            <div className="login-footer">
              <span>Already have an account?</span>
              <a href="/login">Login</a>
            </div>
          </form>
        </div>
      </div>
    </motion.section>
  );
};

export default Register;
