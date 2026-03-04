import React from 'react';
import { Mail, Home, Box, Shield, FileText, Send, LogIn, UserPlus, Layers, MessageSquare, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/images/logo/SHOOTDLC.PNG';
import { useLanguage } from '../context/LanguageContext';
import './Footer.css';

const Footer = () => {
    const { t } = useLanguage();

    return (
        <footer className="footer" id="support">
            <div className="container footer-content">
                <div className="footer-grid">
                    <div className="footer-col">
                        <h4><Layers size={16} className="header-icon" /> {t.footer.pages}</h4>
                        <ul>
                            <li><Link to="/"><Home size={16} className="icon-grey" /> {t.footer.home}</Link></li>
                            <li><Link to="/products"><Box size={16} className="icon-grey" /> {t.footer.products}</Link></li>
                            <li><Link to="/privacy"><Shield size={16} className="icon-grey" /> {t.footer.privacy}</Link></li>
                            <li><Link to="/terms"><FileText size={16} className="icon-grey" /> {t.footer.terms}</Link></li>
                        </ul>
                    </div>

                    <div className="footer-col">
                        <h4><MessageSquare size={16} className="header-icon" /> {t.footer.communicate}</h4>
                        <ul>
                            <li>
                                <a href="https://discord.gg/pRG8wGhaqX" target="_blank" rel="noopener noreferrer">
                                    <svg role="img" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="icon-grey" xmlns="http://www.w3.org/2000/svg"><title>Discord</title><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.699.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" /></svg>
                                    Discord
                                </a>
                            </li>
                            <li><a href="https://t.me/shootclientnew" target="_blank" rel="noopener noreferrer"><Send size={16} className="icon-grey" /> Telegram</a></li>
                        </ul>
                    </div>

                </div>

                <div className="footer-brand-section">
                    <div className="brand-logo">
                        <img src={logo} alt="Shoot logo" className="brand-logo-image" />
                        <span className="brand-name">Shoot</span>
                    </div>
                    <p className="brand-tagline">
                        {t.footer.tagline1}<br />
                        {t.footer.tagline2}
                    </p>
                </div>

                <div className="footer-bottom-bar">
                    <div className="feedback-section">
                        <span>{t.footer.feedback} </span>
                        <a href="mailto:ShootDLC@gmail.com" className="email-link">ShootDLC@gmail.com</a>
                    </div>

                    <div className="footer-center-copyright">
                        Shoot Client © All rights reserved
                    </div>

                    <div className="copyright">
                        <p>{t.footer.rights}</p>
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default Footer;
