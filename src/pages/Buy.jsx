import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck, ArrowLeft, Sparkles, Cpu, Monitor, HardDrive } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import './Buy.css';

const Buy = () => {
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const [promo, setPromo] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('paypal');

    const product = location.state?.product || {
        name: t.pricing.subscription + ' • ' + t.pricing.days30,
        price: '350 руб',
        priceValue: 350,
        features: [
            t.pricing.lowPrice,
            t.pricing.cleanExperience,
            t.pricing.autoBuy,
            t.pricing.fastSupport
        ]
    };
    const isPremium = product.kind === 'PREMIUM';

    const discountPercent = promo.trim().toLowerCase() === 'admin' ? 5 : 0;
    const discountedPrice = discountPercent
        ? Math.round(product.priceValue * (1 - discountPercent / 100))
        : null;

    return (
        <section className="buy-page">
            <div className="buy-glow-top"></div>

            <div className="container">
                <header className="buy-nav">
                    <div className="buy-breadcrumb">
                        <span>Shoot Client</span>
                        <span className="sep">•</span>
                        <span className="active">{product.name}</span>
                    </div>
                </header>

                <div className="buy-grid minimal">
                    <div className="buy-info-side">
                        <div className="product-hero-card buy-card">
                            <div className="product-visual">
                                <div className="visual-inner">
                                    <Sparkles className="visual-icon" size={44} />
                                    <div className="visual-text">SHOOT CLIENT</div>
                                    <div className="visual-glow"></div>
                                </div>
                            </div>

                            <div className="product-title-section">
                                <h1>{product.name}</h1>
                                <p className="product-tagline">{t.hero.feat1}</p>
                            </div>
                        </div>

                    </div>

                    <aside className="buy-checkout-side">
                        <div className="checkout-panel glass-panel buy-card">
                            <div className="price-row">
                                <div>
                                    <span className="label-mini">Checkout</span>
                                    <div className="brand-name">Shoot Client</div>
                                </div>
                                <div className={`price-display ${discountedPrice ? 'has-discount' : ''}`}>
                                    <span className="price-label">Total</span>
                                    {discountedPrice ? (
                                        <div className="price-stack">
                                            <span className="price-old">{product.price}</span>
                                            <span className="price-new">{discountedPrice} руб</span>
                                        </div>
                                    ) : (
                                        <span className="price-amount">{product.price}</span>
                                    )}
                                </div>
                            </div>
                            {isPremium && (
                                <div className="premium-note">
                                    <strong>Premium:</strong> {t.buy.premiumNote}
                                </div>
                            )}

                            <div className="input-field">
                                <input
                                    type="text"
                                    placeholder="Promo code"
                                    value={promo}
                                    onChange={(e) => setPromo(e.target.value)}
                                />
                                {discountPercent ? <span className="promo-pill">-{discountPercent}%</span> : null}
                            </div>

                            <div className="payment-grid">
                                <button
                                    className={`payment-opt ${paymentMethod === 'paypal' ? 'active' : ''}`}
                                    type="button"
                                    onClick={() => setPaymentMethod('paypal')}
                                >
                                    <CreditCard size={18} />
                                    <span className="pay-name">СБП</span>
                                </button>
                                <button
                                    className={`payment-opt ${paymentMethod === 'funpay' ? 'active' : ''}`}
                                    type="button"
                                    onClick={() => setPaymentMethod('funpay')}
                                >
                                    <ShieldCheck size={18} />
                                    <span className="pay-name">FunPay</span>
                                </button>
                            </div>

                            <button
                                className="buy-main-action"
                                type="button"
                                onClick={() => {
                                    if (paymentMethod === 'funpay') {
                                        window.open('https://funpay.com/users/17204081/', '_blank', 'noopener,noreferrer');
                                    }
                                }}
                            >
                                Proceed to payment
                            </button>

                        </div>

                        <div className="reqs-panel glass-panel buy-card">
                            <div className="req-row">
                                <Cpu size={14} className="icon-gold" />
                                <div className="req-info">
                                    <span className="req-label">{t.buy.reqCpuLabel}</span>
                                    <span className="req-value">{t.buy.reqCpuValue}</span>
                                </div>
                            </div>
                            <div className="req-row">
                                <Monitor size={14} className="icon-gold" />
                                <div className="req-info">
                                    <span className="req-label">{t.buy.reqOsLabel}</span>
                                    <span className="req-value">{t.buy.reqOsValue}</span>
                                </div>
                            </div>
                            <div className="req-row">
                                <HardDrive size={14} className="icon-gold" />
                                <div className="req-info">
                                    <span className="req-label">{t.buy.reqRamLabel}</span>
                                    <span className="req-value">{t.buy.reqRamValue}</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </section>
    );
};

export default Buy;
