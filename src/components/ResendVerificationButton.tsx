import React, { useEffect, useState } from 'react'
import { Button, message } from 'antd'
import { resendVerification } from '../api/auth'

// Matches EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS on the backend.
const COOLDOWN_SECONDS = 60

interface Props {
  email: string
  // Start with the cooldown running, e.g. right after registration already sent the email.
  startCooldown?: boolean
  block?: boolean
}

const ResendVerificationButton: React.FC<Props> = ({ email, startCooldown = false, block }) => {
  const [secondsLeft, setSecondsLeft] = useState(startCooldown ? COOLDOWN_SECONDS : 0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  const onClick = async () => {
    setLoading(true)
    try {
      await resendVerification(email)
      message.success(`Письмо отправлено на ${email}`)
      setSecondsLeft(COOLDOWN_SECONDS)
    } catch {
      message.error('Не удалось отправить письмо. Попробуйте позже.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={onClick} loading={loading} disabled={secondsLeft > 0} block={block}>
      {secondsLeft > 0
        ? `Отправить ещё раз через ${secondsLeft} с`
        : 'Отправить письмо ещё раз'}
    </Button>
  )
}

export default ResendVerificationButton
