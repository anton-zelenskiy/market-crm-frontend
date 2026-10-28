import React from 'react'
import { Link } from 'react-router-dom'
import '../../pages/landing/mk.css'

const Footer: React.FC = () => (
  <footer className="mk-footer">
    <div className="mk-container mk-footer__inner">
      <span className="mk-footer__brand">
        <img src="/favicon.svg" alt="" />
        Market CRM
      </span>
      <span>© {new Date().getFullYear()}</span>
      <div className="mk-footer__links">
        <Link to="/tariffs">Тарифы</Link>
        <Link to="/privacy">Конфиденциальность</Link>
        <Link to="/terms">Оферта</Link>
        <Link to="/legal">Юридическая информация</Link>
      </div>
    </div>
  </footer>
)

export default Footer
