import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import './Pricing.css';

const Pricing = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const primaryTiers = [
        {
            name: t.pricing.subscription,
            sub: t.pricing.days30,
            showSlash: true,
            kind: 'SUB_30',
            price: '350 руб',
            priceValue: 350,
            features: [
                t.pricing.lowPrice,
                t.pricing.cleanExperience,
                t.pricing.autoBuy,
                t.pricing.fastSupport
            ]
        },
        {
            name: t.pricing.betaSubscription,
            icon: '∞',
            showSlash: true,
            kind: 'BETA',
            price: '1500 руб',
            priceValue: 1500,
            recommended: true,
            features: [
                t.pricing.lowPrice,
                t.pricing.cleanExperience,
                t.pricing.autoBuy,
                t.pricing.fastSupport,
                t.pricing.earlyUpdates,
                t.pricing.moreFeatures
            ]
        },
        {
            name: t.pricing.forever,
            icon: '∞',
            showSlash: true,
            kind: 'FOREVER',
            price: '899 руб',
            priceValue: 899,
            features: [
                t.pricing.lowPrice,
                t.pricing.cleanExperience,
                t.pricing.autoBuy,
                t.pricing.fastSupport
            ]
        }
    ];

    const secondaryTiers = [
        {
            name: t.pricing.hwidReset,
            kind: 'HWID',
            price: '249 руб',
            priceValue: 249,
            features: [
                t.pricing.hwidFeature1,
                t.pricing.hwidFeature2,
                t.pricing.hwidFeature3,
                t.pricing.hwidFeature4
            ]
        },
        {
            name: t.pricing.premium,
            sub: t.pricing.days30,
            showSlash: true,
            kind: 'PREMIUM',
            price: '300 руб',
            priceValue: 300,
            recommended: true,
            features: [
                t.pricing.lowPrice,
                t.pricing.cleanExperience,
                t.pricing.autoBuy,
                t.pricing.fastSupport,
                t.pricing.moreFeatures,
                t.pricing.noLimits
            ]
        },
        {
            name: t.pricing.subscription,
            sub: t.pricing.days180,
            showSlash: true,
            kind: 'SUB_180',
            price: '700 руб',
            priceValue: 700,
            features: [
                t.pricing.lowPrice,
                t.pricing.cleanExperience,
                t.pricing.autoBuy,
                t.pricing.fastSupport
            ]
        }
    ];

    const openBuy = (tier) => {
        navigate('/buy', { state: { product: tier } });
    };

    return (
        <section className="pricing-section" id="products">
            <div className="pricing-bg-grid"></div>
            <div className="container">
                <div className="section-header">
                    <span className="badge-pill">{t.pricing.badge}</span>
                    <h2>{t.pricing.title} <span className="green-text">{t.pricing.titleHighlight}</span></h2>
                    <p>{t.pricing.desc}</p>
                </div>

                <div className="pricing-grid">
                    {primaryTiers.map((tier, index) => (
                        <motion.div
                            key={index}
                            className={`pricing-card ${tier.recommended ? 'recommended' : ''}`}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            whileHover={{ y: 0, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.5, delay: index * 0.15 }}
                            viewport={{ once: true }}
                        >
                            {tier.recommended && <div className="rec-badge">{t.pricing.bestValue}</div>}
                            <div className="card-header">
                                <h3>
                                    {tier.name}
                                    {tier.showSlash && tier.icon && !tier.sub && (
                                        <span className="pricing-slash">•</span>
                                    )}
                                    {tier.icon && <span className="pricing-title-icon">{tier.icon}</span>}
                                    {tier.sub ? (
                                        <span className="pricing-title-sub-inline">
                                            {tier.showSlash && <span className="pricing-slash">•</span>}
                                            {tier.sub}
                                        </span>
                                    ) : null}
                                </h3>
                            </div>
                            <div className="card-price">
                                <span className="currency">{tier.price}</span>
                            </div>

                            <ul className="features-list">
                                {tier.features.map((feat, i) => (
                                    <li key={i}><Check size={16} className="check-icon" /> {feat}</li>
                                ))}
                            </ul>

                            <button
                                className={`btn-select ${tier.recommended ? 'btn-green' : 'btn-glass'}`}
                                type="button"
                                onClick={() => openBuy(tier)}
                            >
                                <svg className="btn-buy-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M7 4h-2l-1 2v2h2l2.7 7.6a2 2 0 0 0 1.9 1.4h7.9a2 2 0 0 0 1.9-1.4L22 8H8.2L7.5 6H21V4H7Zm1.9 7h10.4l-1.1 3.2H10l-1.1-3.2Zm2.1 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
                                </svg>
                                <span className="btn-gradient-text">{t.pricing.select}</span>
                            </button>
                        </motion.div>
                    ))}
                </div>

                <div className="pricing-grid pricing-grid-secondary">
                    {secondaryTiers.map((tier, index) => (
                        <motion.div
                            key={index}
                            className={`pricing-card ${tier.recommended ? 'recommended' : ''}`}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            whileHover={{ y: 0, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.5, delay: index * 0.15 }}
                            viewport={{ once: true }}
                        >
                            {tier.recommended && <div className="rec-badge">{t.pricing.premium}</div>}
                            <div className="card-header">
                                <h3>
                                    {tier.name}
                                    {tier.showSlash && tier.icon && !tier.sub && (
                                        <span className="pricing-slash">•</span>
                                    )}
                                    {tier.icon && <span className="pricing-title-icon">{tier.icon}</span>}
                                    {tier.sub ? (
                                        <span className="pricing-title-sub-inline">
                                            {tier.showSlash && <span className="pricing-slash">•</span>}
                                            {tier.sub}
                                        </span>
                                    ) : null}
                                </h3>
                            </div>
                            <div className="card-price">
                                <span className="currency">{tier.price}</span>
                            </div>

                            <ul className="features-list">
                                {tier.features.map((feat, i) => (
                                    <li key={i}><Check size={16} className="check-icon" /> {feat}</li>
                                ))}
                            </ul>

                            <button
                                className={`btn-select ${tier.recommended ? 'btn-green' : 'btn-glass'}`}
                                type="button"
                                onClick={() => openBuy(tier)}
                            >
                                <svg className="btn-buy-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M7 4h-2l-1 2v2h2l2.7 7.6a2 2 0 0 0 1.9 1.4h7.9a2 2 0 0 0 1.9-1.4L22 8H8.2L7.5 6H21V4H7Zm1.9 7h10.4l-1.1 3.2H10l-1.1-3.2Zm2.1 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
                                </svg>
                                <span className="btn-gradient-text">{t.pricing.select}</span>
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Pricing;
