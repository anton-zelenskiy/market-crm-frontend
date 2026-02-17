import React, { useState } from 'react'
import { Form, Input, Button, Card, Alert, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { login as loginApi } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { APP_NAME } from '../../constants'
import './landing.css'

const { Title } = Typography

const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const onFinish = async (values: any) => {
    setLoading(true)
    setError(null)
    try {
      const response = await loginApi({
        email: values.email,
        password: values.password,
      })
      await login(response.access_token, response.refresh_token)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <div className="auth-header">
          <Title level={2}>{APP_NAME}</Title>
          <Title level={4} type="secondary">Вход</Title>
        </div>
        
        {error && <Alert message={error} type="error" showIcon className="auth-error" />}
        
        <Form
          name="login_form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Пожалуйста, введите Email!' }, { type: 'email', message: 'Пожалуйста, введите корректный email!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Пожалуйста, введите пароль!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
            >
              Войти
            </Button>
          </Form.Item>

          <div className="auth-link">
            <Typography.Text>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></Typography.Text>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default Login
