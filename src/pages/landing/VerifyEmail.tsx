import React, { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Form, Input, Spin, Typography } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '../../api/auth'
import ResendVerificationButton from '../../components/ResendVerificationButton'
import { APP_NAME } from '../../constants'
import { SITE_NAME, usePageMeta } from '../../ssr/PageMeta'
import './landing.css'

const { Title, Text } = Typography

const VerifyEmail: React.FC = () => {
  usePageMeta({ title: `Подтверждение email — ${SITE_NAME}`, noindex: true })
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [verifying, setVerifying] = useState(Boolean(token))
  const [verified, setVerified] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  // StrictMode runs effects twice in dev; one request is enough.
  const requested = useRef(false)

  useEffect(() => {
    if (requested.current || !token) return
    requested.current = true
    verifyEmail(token)
      .then(() => setVerified(true))
      .catch(() => setVerified(false))
      .finally(() => setVerifying(false))
  }, [token])

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <div className="auth-header">
          <Title level={2}>{APP_NAME}</Title>
          <Title level={4} type="secondary">
            Подтверждение email
          </Title>
        </div>

        {verifying && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Spin size="large" />
            <Text style={{ display: 'block', marginTop: 12 }}>Проверяем ссылку…</Text>
          </div>
        )}

        {!verifying && verified && (
          <>
            <Alert
              message="Email подтверждён! Теперь можно войти."
              type="success"
              showIcon
              className="auth-error"
            />
            <Link to="/login">
              <Button type="primary" block size="large">
                Войти
              </Button>
            </Link>
          </>
        )}

        {!verifying && !verified && (
          <>
            <Alert
              message="Ссылка недействительна или срок её действия истёк."
              description="Введите email, и мы отправим новую ссылку."
              type="error"
              showIcon
              className="auth-error"
            />
            <Form size="large">
              <Form.Item>
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value.trim())}
                />
              </Form.Item>
              <Form.Item>
                {/^\S+@\S+\.\S+$/.test(resendEmail) ? (
                  <ResendVerificationButton email={resendEmail} block />
                ) : (
                  <Button block disabled>
                    Отправить письмо ещё раз
                  </Button>
                )}
              </Form.Item>
            </Form>
            <div className="auth-link">
              <Text>
                Уже подтвердили? <Link to="/login">Войти</Link>
              </Text>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

export default VerifyEmail
