import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getAuthItem } from '../utils/authStorage';
import './Hero.css';

const Hero = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    return (
        <section className="hero">
            <div className="hero-bg-glow"></div>
            <div className="cube-grid"></div>

            <div className="container hero-content">
                <motion.div
                    className="hero-premium-badge"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <Crown size={14} />
                    <span>Premium Experience!</span>
                    <Crown size={14} />
                </motion.div>

                <motion.h1
                    className="hero-title"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <span className="hero-title-line hero-title-line-1">{t.hero.titleLine1}</span>
                    <span className="hero-title-line hero-title-line-2 green-gradient-text">{t.hero.titleLine2}</span>
                </motion.h1>

                <motion.div
                    className="hero-features"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <div className="feature-item feature-text">
                        <span className="feature-text-line">{t.hero.feat1}</span>
                        <span className="feature-text-line">{t.hero.feat2}</span>
                    </div>
                </motion.div>

                <motion.div
                    className="hero-cta"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    <button
                        className="btn-hero-primary"
                        type="button"
                        onClick={() => {
                            const authed = !!getAuthItem('userId');
                            navigate(authed ? '/profile' : '/login');
                        }}
                    >
                        <svg className="btn-icon-joy" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="url(#joyGrad)" viewBox="0 0 24 24" aria-hidden="true">
                            <defs>
                                <linearGradient id="joyGrad" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#d4af37" />
                                    <stop offset="100%" stopColor="#d4af37" />
                                </linearGradient>
                            </defs>
                            <path d="M16 11a1 1 0 1 0 0 2 1 1 0 1 0 0-2m2-2a1 1 0 1 0 0 2 1 1 0 1 0 0-2m-2-2a1 1 0 1 0 0 2 1 1 0 1 0 0-2m-2 2a1 1 0 1 0 0 2 1 1 0 1 0 0-2M8 8a2 2 0 1 0 0 4 2 2 0 1 0 0-4"></path>
                            <path d="M17 4H7C4.24 4 2 6.24 2 9v7.88a3.124 3.124 0 0 0 5.33 2.21l1.96-1.96c1.45-1.45 3.97-1.45 5.41 0l1.96 1.96c.59.59 1.37.91 2.21.91 1.72 0 3.12-1.4 3.12-3.12V9c0-2.76-2.24-5-5-5Zm3 12.88a1.118 1.118 0 0 1-1.91.79l-1.96-1.96c-1.1-1.1-2.56-1.71-4.12-1.71s-3.02.61-4.12 1.71l-1.96 1.96a1.118 1.118 0 0 1-1.91-.79V9c0-1.65 1.35-3 3-3h10c1.65 0 3 1.35 3 3v7.88Z"></path>
                        </svg>
                        <span className="btn-gradient-text">{t.hero.btnPrimary}</span>
                    </button>
                    <button
                        className="btn-hero-secondary"
                        type="button"
                        onClick={() => {
                            window.open('https://t.me/ShootClientDevLogs', '_blank', 'noopener,noreferrer');
                        }}
                    >
                        <Globe size={18} /> <span className="btn-gradient-text">{t.hero.btnSecondary}</span>
                    </button>
                </motion.div>
            </div>

            <div className="scroll-indicator">
                {t.hero.scroll}
            </div>
        </section>
    );
};

export default Hero;

