import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import './CreatorVideos.css';

const CreatorVideos = () => {
  const { t } = useLanguage();
  const videos = [
    { id: 'dQw4w9WgXcQ', title: t.creators.video1Title },
    { id: 'dQw4w9WgXcQ', title: t.creators.video2Title },
  ];

  return (
    <section className="creators-section" id="creators">
      <div className="container creators-container">
        <div className="creators-head">
          <span className="creators-badge">
            <svg className="badge-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l2.7 6.3L21 11l-6.3 2.7L12 20l-2.7-6.3L3 11l6.3-2.7L12 2z" />
            </svg>
            {t.creators.badge}
            <svg className="badge-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l2.7 6.3L21 11l-6.3 2.7L12 20l-2.7-6.3L3 11l6.3-2.7L12 2z" />
            </svg>
          </span>
          <h2>
            {t.creators.title}{' '}
            <span className="green-text">{t.creators.highlight}</span>
          </h2>
          <p>{t.creators.subtitle}</p>
        </div>
        <div className="creators-grid">
          {videos.map((video, index) => (
            <div className="creator-card" key={`${video.id}-${index}`}>
              <div className="creator-frame">
                <iframe
                  src={`https://www.youtube.com/embed/${video.id}`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CreatorVideos;
