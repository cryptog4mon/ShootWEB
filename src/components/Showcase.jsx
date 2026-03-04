import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import previewOne from '../assets/images/d1.png';
import previewTwo from '../assets/images/d2.png';
import previewThree from '../assets/images/d3.jpg';
import './Showcase.css';

const Showcase = () => {
  const { t } = useLanguage();

  return (
    <section className="showcase" id="inside-client">
      <div className="container showcase-container">
        <div className="showcase-head">
          <span className="showcase-badge">
            <svg className="badge-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l2.7 6.3L21 11l-6.3 2.7L12 20l-2.7-6.3L3 11l6.3-2.7L12 2z" />
            </svg>
            {t.showcase.badge}
            <svg className="badge-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l2.7 6.3L21 11l-6.3 2.7L12 20l-2.7-6.3L3 11l6.3-2.7L12 2z" />
            </svg>
          </span>
          <h2>
            {t.showcase.title} <span className="green-text">{t.showcase.highlight}</span>
          </h2>
          <p>{t.showcase.subtitle}</p>
        </div>
        <div className="showcase-grid">
          <div className="showcase-card dim-side">
            <img src={previewOne} alt="Client preview 1" className="showcase-image" />
          </div>
          <div className="showcase-card">
            <img src={previewTwo} alt="Client preview 2" className="showcase-image" />
          </div>
          <div className="showcase-card dim-side">
            <img src={previewThree} alt="Client preview 3" className="showcase-image" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Showcase;
