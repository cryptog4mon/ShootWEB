import React, { useState, useEffect } from 'react';
import { motion, useScroll, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, Moon, Sun, Sparkles, ShoppingBag, PlayCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getAuthItem, clearAuth } from '../utils/authStorage';
import logo from '../assets/images/logo/SHOOTDLC.PNG';
import './Navbar.css';

const Navbar = () => {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const languages = ['English', 'Russian', 'Polish'];

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setIsScrolled(latest > 50);
    });
  }, [scrollY]);

  useEffect(() => {
    setIsAuthed(!!getAuthItem('authUser'));
  }, [location]);


  return (
    <motion.nav
      className={`navbar ${isScrolled ? 'scrolled' : ''}`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="nav-capsule">
        <Link to="/" className="logo-section">
          <span className="logo-badge">
            <img src={logo} alt="Shoot logo" className="logo-image" />
          </span>
          <span className="logo-text">Shoot</span>
        </Link>

        <div className="nav-links">
          <Link to="/" className="nav-item active">
            <span className="icon-grid">⌘</span> {t.nav.home}
          </Link>
          <Link to="/#features" className="nav-item">
            <Sparkles size={14} />
            {t.nav.features}
          </Link>
          <Link to="/products" className="nav-item">
            <ShoppingBag size={14} />
            {t.nav.programs}
          </Link>
          <Link to="/#inside-client" className="nav-item">
            <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="8" height="8" rx="1.5" />
              <rect x="13" y="3" width="8" height="5" rx="1.5" />
              <rect x="13" y="10" width="8" height="11" rx="1.5" />
              <rect x="3" y="13" width="8" height="8" rx="1.5" />
            </svg>
            {t.nav.support}
          </Link>
          <Link to="/#creators" className="nav-item">
            <PlayCircle size={14} />
            {t.nav.faq}
          </Link>
        </div>

        <div className="auth-action">
          {isAuthed ? (
            location.pathname === '/profile' ? (
              <button
                className="login-link"
                type="button"
                onClick={() => {
                  clearAuth();
                  setIsAuthed(false);
                  navigate('/');
                }}
              >
                Sign out
              </button>
            ) : (
              <Link to="/profile" className="login-link">Profile</Link>
            )
          ) : (
            <a href="/login" className="login-link">{t.nav.login}</a>
          )}
        </div>
      </div>

      <div className="nav-right-actions">
        <button
          className="theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
        <div className="lang-container" style={{ position: 'relative' }}>
          <div
            className={`lang-capsule ${isLangOpen ? 'active' : ''}`}
            onClick={() => setIsLangOpen(!isLangOpen)}
          >
            <Globe size={14} />
            <span>{language}</span>
            <ChevronDown
              size={12}
              className="lang-arrow"
              style={{ transform: isLangOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
            />
          </div>

          <AnimatePresence>
            {isLangOpen && (
              <motion.div
                className="lang-dropdown"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {languages.map((lang) => (
                  <div
                    key={lang}
                    className={`lang-option ${language === lang ? 'selected' : ''}`}
                    onClick={() => {
                      setLanguage(lang);
                      setIsLangOpen(false);
                    }}
                  >
                    {lang}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        
      </div>
    </motion.nav>
  );
};

export default Navbar;


