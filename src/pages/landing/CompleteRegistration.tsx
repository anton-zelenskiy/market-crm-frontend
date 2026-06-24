import React, { useEffect, useState } from 'react'
import { Form, Input, Button, Card, Alert, Typography, Spin } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  validateRegistrationToken,
  completeRegistration,
  type ValidateTokenResponse,
} from '../../api/auth'
import { APP_NAME } from '../../constants'
import './landing.css'

const { Title, Text } = Typography

const CompleteRegistration: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()

  const [tokenInfo, setTokenInfo] = useState<ValidateTokenResponse | null>(null)
  const [validating, setValidating] = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setTokenError('Ссылка для регистрации не содержит токен.')
      setValidating(false)
      return
    }
    validateRegistrationToken(token)
      .then((info) => {
        setTokenInfo(info)
      })
      .catch((err) => {
        setTokenError(
          err.response?.data?.detail || 'Ссылка недействительна или срок её действия истёк.',
        )
      })
      .finally(() => setValidating(false))
  }, [token])

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    setSubmitError(null)
    try {
      await completeRegistration({ token, email: values.email, password: values.password })
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || 'Ошибка завершения регистрации.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <div className="auth-header">
          <Title level={2}>{APP_NAME}</Title>
          <Title level={4} type="secondary">
            Завершение регистрации
          </Title>
        </div>

        {validating && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Spin size="large" />
            <Text style={{ display: 'block', marginTop: 12 }}>Проверяем ссылку…</Text>
          </div>
        )}

        {!validating && tokenError && (
          <Alert message={tokenError} type="error" showIcon className="auth-error" />
        )}

        {!validating && !tokenError && done && (
          <Alert
            message="Регистрация завершена! Перенаправляем на страницу входа…"
            type="success"
            showIcon
          />
        )}

        {!validating && !tokenError && !done && (
          <>
            {tokenInfo?.email && (
              <Alert
                message={`Аккаунт: ${tokenInfo.email}`}
                type="info"
                showIcon
                className="auth-error"
              />
            )}
            {submitError && (
              <Alert message={submitError} type="error" showIcon className="auth-error" />
            )}
            <Form name="complete_registration_form" onFinish={onFinish} size="large">
              <Form.Item
                name="email"
                initialValue={tokenInfo?.email ?? undefined}
                rules={[
                  { required: true, message: 'Введите Email!' },
                  { type: 'email', message: 'Введите корректный email!' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Email" />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: 'Введите пароль!' },
                  { min: 8, message: 'Пароль должен содержать минимум 8 символов!' },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
              </Form.Item>

              <Form.Item
                name="confirm_password"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Подтвердите пароль!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('Пароли не совпадают!'))
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Подтвердите пароль" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading}>
                  Завершить регистрацию
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Card>
    </div>
  )
}

export default CompleteRegistration
