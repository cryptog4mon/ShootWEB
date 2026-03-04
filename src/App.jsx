import React, { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Showcase from './components/Showcase';
import Pricing from './components/Pricing';
import Faq from './components/Faq';
import CreatorVideos from './components/CreatorVideos';
import Footer from './components/Footer';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Tickets from './pages/Tickets';
import Buy from './pages/Buy';
import Products from './pages/Products';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Admin from './pages/Admin';
import { useLanguage } from './context/LanguageContext';
import { api } from './api';
import { getAuthItem, setAuthItemAuto } from './utils/authStorage';

const Home = () => (
  <main>
    <Hero />
    <Features />
    <Showcase />
    <CreatorVideos />
    <Faq />
  </main>
);

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideFooter = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/profile' || location.pathname === '/profile/tikets' || location.pathname === '/buy' || location.pathname === '/admin';
  const { isFading } = useLanguage();

  useEffect(() => {
    const isEditable = (target) => {
      if (!target) return false;
      const tag = target.tagName ? target.tagName.toLowerCase() : '';
      return tag === 'input' || tag === 'textarea' || target.isContentEditable;
    };
    const blockContext = (e) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    };
    const blockCopy = (e) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    };
    const blockKeys = (e) => {
      const key = String(e.key || '').toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (key === 'f12') {
        e.preventDefault();
        return;
      }
      if (ctrl && ['s', 'u', 'p'].includes(key)) {
        e.preventDefault();
        return;
      }
      if (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(key)) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('copy', blockCopy);
    document.addEventListener('cut', blockCopy);
    document.addEventListener('dragstart', blockCopy);
    document.addEventListener('keydown', blockKeys);
    return () => {
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('copy', blockCopy);
      document.removeEventListener('cut', blockCopy);
      document.removeEventListener('dragstart', blockCopy);
      document.removeEventListener('keydown', blockKeys);
    };
  }, []);

  useEffect(() => {
    const userId = getAuthItem('userId');
    if (!userId) return;
    api.profile(userId)
      .then((res) => {
        const role = res.user?.role;
        if (role) {
          setAuthItemAuto('authUser', role);
        }
        if (role === 'BANNED') {
          const allowed = ['/profile/tikets', '/login', '/register'];
          if (!allowed.includes(location.pathname)) {
            navigate('/profile/tikets');
          }
        }
      })
      .catch(() => {});
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          const top = rect.top + window.scrollY;
          let target = top;
          if (id === 'features') {
            const centerOffset = window.innerHeight / 2 - rect.height / 2;
            target = top - centerOffset - 40;
          }
          if (id === 'creators') {
            target = top - 120;
          }
          window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
        }, 0);
      }
      return;
    }
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 0);
  }, [location.pathname, location.hash]);

  return (
    <motion.div
      className="app"
      animate={{ opacity: isFading ? 0 : 1 }}
      transition={{ duration: 0.22 }}
    >
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/tikets" element={<Tickets />} />
        <Route path="/buy" element={<Buy />} />
        <Route path="/products" element={<Products />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/policy" element={<Privacy />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      {!hideFooter && <Footer />}
    </motion.div>
  );
}

export default App;
