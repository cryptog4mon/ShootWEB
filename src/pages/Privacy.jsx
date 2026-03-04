import React from 'react';
import './Policy.css';

const Privacy = () => {
  return (
    <section className="policy-page">
      <div className="policy-glow"></div>
      <div className="container policy-container">
        <header className="policy-header">
          <h1>Политика приватности</h1>
          <div className="policy-categories">
            <a className="policy-chip" href="#privacy-collection">Сбор и использование данных</a>
            <a className="policy-chip" href="#privacy-contacts">Контактные данные</a>
            <a className="policy-chip" href="#privacy-technical">Технические данные</a>
            <a className="policy-chip" href="#privacy-processing">Обработка данных</a>
            <a className="policy-chip" href="#privacy-effective">Дата вступления в силу</a>
          </div>
        </header>

        <div className="policy-block glass-panel" id="privacy-collection">
          <h2>Политика приватности</h2>
          <h3>1. Сбор и использование данных</h3>
          <p>
            Лицензиар уважает право Пользователя на неприкосновенность частной жизни. Мы собираем минимальный объем данных,
            необходимый для функционирования Wexside Client.
          </p>
          <p>
            Используя продукт, Пользователь выражает согласие на сбор и обработку персональных данных в объеме, указанном в настоящей политике.
          </p>
        </div>

        <div className="policy-block glass-panel" id="privacy-contacts">
          <h2>Контактные данные</h2>
          <p>
            Мы обрабатываем адрес электронной почты, указанный при регистрации или покупке лицензии. Он используется исключительно для авторизации
            и связи с Пользователем в рамках предоставления услуг.
          </p>
        </div>

        <div className="policy-block glass-panel" id="privacy-technical">
          <h2>Технические данные</h2>
          <p>
            Мы собираем IP-адрес для обеспечения безопасности, предотвращения мошенничества и защиты от несанкционированного доступа.
          </p>
          <ul>
            <li>Данные используются только для внутренней безопасности.</li>
            <li>Не передаются третьим лицам, за исключением случаев, прямо предусмотренных законодательством РФ.</li>
            <li>Не применяются для рекламных целей.</li>
          </ul>
        </div>

        <div className="policy-block glass-panel" id="privacy-processing">
          <h2>Обработка данных</h2>
          <h3>1. Процедуры обработки данных</h3>
          <p>Сбор и обработка данных осуществляются в соответствии с законодательством РФ.</p>
          <ul>
            <li>Собираются только IP-адрес и адрес электронной почты Пользователя.</li>
            <li>Данные используются для авторизации, защиты от мошенничества и обеспечения работы продукта.</li>
            <li>Данные не передаются третьим лицам, за исключением случаев, предусмотренных законом.</li>
          </ul>
          <h3>2. Прекращение обработки</h3>
          <p>
            В случае прекращения действия лицензии данные могут храниться в течение времени, необходимого для выполнения требований законодательства
            и защиты интересов Лицензиара.
          </p>
        </div>

        <div className="policy-block glass-panel" id="privacy-effective">
          <h2>Дата вступления в силу</h2>
          <p>Уточняется.</p>
        </div>
      </div>
    </section>
  );
};

export default Privacy;
