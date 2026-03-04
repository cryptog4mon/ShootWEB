import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import './Faq.css';

const Faq = () => {
    const { t } = useLanguage();

    const questions = [
        { q: t.faq.q1, a: t.faq.a1 },
        { q: t.faq.q2, a: t.faq.a2 },
        { q: t.faq.q3, a: t.faq.a3 },
        { q: t.faq.q4, a: t.faq.a4 }
    ];

    return (
        <section className="faq-section" id="faq">
            <div className="faq-glow"></div>
            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <motion.div
                    className="faq-header"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <span className="faq-badge">
                        <svg className="badge-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2l2.7 6.3L21 11l-6.3 2.7L12 20l-2.7-6.3L3 11l6.3-2.7L12 2z" />
                        </svg>
                        {t.faq.badge}
                        <svg className="badge-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2l2.7 6.3L21 11l-6.3 2.7L12 20l-2.7-6.3L3 11l6.3-2.7L12 2z" />
                        </svg>
                    </span>
                    <h2>{t.faq.title}</h2>
                    <p>{t.faq.subtitle}</p>
                </motion.div>

                <div className="faq-grid">
                    {questions.map((item, index) => (
                        <motion.div
                            key={index}
                            className="faq-card"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.45, ease: "easeOut", delay: index * 0.05 }}
                        >
                            {index === 0 && (
                                <div className="card-decor-1">
                                    <div className="decor-circle"></div>
                                    <div className="decor-circle"></div>
                                    <div className="decor-circle"></div>
                                </div>
                            )}
                            {index === 3 && (
                                <div className="card-decor-4">
                                    <div className="decor-circle"></div>
                                    <div className="decor-circle"></div>
                                    <div className="decor-circle"></div>
                                </div>
                            )}
                            <div className="faq-question">
                                <HelpCircle size={20} className="question-icon" />
                                {item.q}
                            </div>
                            <div className="faq-answer">
                                {item.a}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Faq;

