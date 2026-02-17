import React, { useState } from 'react'
import { Form, Input, Button, Card, Alert, Typography, message } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { register as registerApi } from '../../api/auth'
import { APP_NAME } from '../../constants'
import './landing.css'

const { Title, Text } = Typography

const Register: React.FC = () => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values: any) => {
    setLoading(true)
    setError(null)
    try {
      await registerApi({
        email: values.email,
        password: values.password,
      })
      message.success('Регистрация успешна! Пожалуйста, войдите.')
      navigate('/login')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <div className="auth-header">
          <Title level={2}>{APP_NAME}</Title>
          <Title level={4} type="secondary">Регистрация</Title>
        </div>
        
        {error && <Alert message={error} type="error" showIcon className="auth-error" />}
        
        <Form
          name="register_form"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Пожалуйста, введите Email!' },
              { type: 'email', message: 'Пожалуйста, введите корректный email!' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Пожалуйста, введите пароль!' },
              { min: 8, message: 'Пароль должен содержать минимум 8 символов!' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Пожалуйста, подтвердите пароль!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Введенные пароли не совпадают!'))
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Подтвердите пароль" />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
            >
              Зарегистрироваться
            </Button>
          </Form.Item>
          
          <div className="auth-link">
            <Text>Уже есть аккаунт? <Link to="/login">Войти</Link></Text>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default Register
