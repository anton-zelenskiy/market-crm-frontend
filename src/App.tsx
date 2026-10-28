import React, { Suspense, lazy } from 'react'
import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import './lib/dayjs'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TaskProgressProvider } from './context/TaskProgressContext'
import Login from './pages/landing/Login'
import Register from './pages/landing/Register'
import CompleteRegistration from './pages/landing/CompleteRegistration'
import VerifyEmail from './pages/landing/VerifyEmail'
import Home from './pages/landing/Home'
import TariffDetail from './pages/landing/TariffDetail'
import Tariffs from './pages/landing/Tariffs'
import LegalDocument from './pages/landing/legal/LegalDocument'
import LegalInfo from './pages/landing/legal/LegalInfo'
import { PRIVACY } from './pages/landing/legal/privacy'
import { TERMS } from './pages/landing/legal/terms'

// CRM is client-only and loaded on demand, keeping landing pages light
const CrmApp = lazy(() => import('./CrmApp'))

// Warm theme matching the landing page
const softTheme = {
  token: {
    colorPrimary: '#12a37f',
    colorLink: '#0e8466',
    colorBgLayout: '#faf6f0',
    colorBgContainer: '#ffffff',
    colorBorderSecondary: '#eee6da',
    colorText: '#2a2622',
    borderRadius: 12,
    fontFamily: 'Nunito, system-ui, sans-serif',
  },
  components: {
    Button: { primaryShadow: 'none', fontWeight: 700 },
    Table: { headerBg: '#f6f0e7', borderColor: '#eee6da' },
  },
}

const App: React.FC = () => {
  return (
    <ConfigProvider theme={softTheme} locale={ruRU}>
      <AuthProvider>
        <TaskProgressProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/complete-registration" element={<CompleteRegistration />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/" element={<Home />} />
            <Route path="/tariffs" element={<Tariffs />} />
            <Route path="/tariff/:slug" element={<TariffDetail />} />
            <Route path="/privacy" element={<LegalDocument content={PRIVACY} />} />
            <Route path="/terms" element={<LegalDocument content={TERMS} />} />
            <Route path="/legal" element={<LegalInfo />} />
            <Route
              path="/*"
              element={
                <Suspense fallback={<div>Загрузка...</div>}>
                  <CrmApp />
                </Suspense>
              }
            />
          </Routes>
        </TaskProgressProvider>
      </AuthProvider>
    </ConfigProvider>
  )
}

export default App
