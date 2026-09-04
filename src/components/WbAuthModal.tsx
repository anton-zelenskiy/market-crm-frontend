import React, { useState } from 'react'
import { Modal, Steps, Form, Input, Button, Alert, Typography } from 'antd'
import { wbAuthApi } from '../api/wbAuth'

const { Text } = Typography

interface WbAuthModalProps {
  connectionId: number
  open: boolean
  onClose: () => void
}

type Stage = 'phone' | 'code' | 'result'

const WbAuthModal: React.FC<WbAuthModalProps> = ({ connectionId, open, onClose }) => {
  const [stage, setStage] = useState<Stage>('phone')
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const reset = () => {
    setStage('phone')
    setLoading(false)
    setPhone('')
    setCode('')
    setSessionId(null)
    setResult(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSendPhone = async () => {
    setLoading(true)
    setResult(null)
    try {
      const data = await wbAuthApi.initiate(connectionId, phone.trim())
      if (data.status === 'already_authorized') {
        setResult({ success: true, message: data.message })
        setStage('result')
        return
      }
      setSessionId(data.session_id)
      setStage('code')
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.detail || 'Ошибка при запуске авторизации',
      })
      setStage('result')
    } finally {
      setLoading(false)
    }
  }

  const handleSendCode = async () => {
    if (!sessionId) return
    setLoading(true)
    setResult(null)
    try {
      const data = await wbAuthApi.confirm(connectionId, sessionId, code.trim())
      setResult({ success: data.success, message: data.message })
      setStage('result')
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.detail || 'Ошибка при завершении авторизации',
      })
      setStage('result')
    } finally {
      setLoading(false)
    }
  }

  const currentStep = stage === 'phone' ? 0 : stage === 'code' ? 1 : 2

  return (
    <Modal
      title="Авторизация Wildberries"
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
    >
      <Steps
        size="small"
        current={currentStep}
        items={[{ title: 'Телефон' }, { title: 'Код' }, { title: 'Результат' }]}
        style={{ marginBottom: 24 }}
      />

      {stage === 'phone' && (
        <Form layout="vertical" onFinish={handleSendPhone}>
          <Form.Item
            label="Номер телефона, привязанный к Wildberries"
            help="Формат: 10 цифр, например 9991234567"
          >
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9991234567"
              maxLength={10}
              autoFocus
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={phone.length !== 10}
            block
          >
            Отправить код
          </Button>
        </Form>
      )}

      {stage === 'code' && (
        <Form layout="vertical" onFinish={handleSendCode}>
          <Text type="secondary">Код подтверждения отправлен на номер +7{phone}</Text>
          <Form.Item label="6-значный код из СМS" style={{ marginTop: 12 }}>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              autoFocus
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={code.length !== 6}
            block
          >
            Подтвердить
          </Button>
        </Form>
      )}

      {stage === 'result' && result && (
        <>
          <Alert
            type={result.success ? 'success' : 'error'}
            message={result.success ? 'Готово' : 'Ошибка'}
            description={<span style={{ whiteSpace: 'pre-line' }}>{result.message}</span>}
            showIcon
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {!result.success && (
              <Button onClick={reset} block>
                Начать заново
              </Button>
            )}
            <Button type="primary" onClick={handleClose} block>
              Закрыть
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}

export default WbAuthModal
