import React, { useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  Descriptions,
  Input,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from 'antd'
import { ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { chestnyZnakApi, czErrorMessage, type CzAuthStatus } from '../../api/chestnyZnak'
import {
  describeCertificate,
  listCertificates,
  signBase64,
  utf8ToBase64,
  type CryptoCertificate,
} from '../../lib/cryptopro'
import { formatDateTime } from '../../lib/dayjs'
import CzEnvBadge from './CzEnvBadge'
import {
  getSandboxUnsigned,
  getSavedThumbprint,
  saveThumbprint,
  setSandboxUnsigned,
} from './czAuth'

interface CzAuthPanelProps {
  connectionId: number
  status: CzAuthStatus | null
  loading?: boolean
  onStatusChange: (status: CzAuthStatus) => void
  onReload?: () => void
}

/** Certificate picker + «Войти по ЭЦП» + session/balance info. */
const CzAuthPanel: React.FC<CzAuthPanelProps> = ({
  connectionId,
  status,
  loading,
  onStatusChange,
  onReload,
}) => {
  const [certs, setCerts] = useState<CryptoCertificate[] | null>(null)
  const [certsLoading, setCertsLoading] = useState(false)
  const [pluginError, setPluginError] = useState<string | null>(null)
  const [thumbprint, setThumbprint] = useState<string | null>(getSavedThumbprint())
  const [signingIn, setSigningIn] = useState(false)
  const [trueToken, setTrueToken] = useState('')
  const [suzToken, setSuzToken] = useState('')
  const [unsigned, setUnsigned] = useState(getSandboxUnsigned())

  const loadCerts = async () => {
    setCertsLoading(true)
    setPluginError(null)
    try {
      const list = await listCertificates()
      setCerts(list)
      if (!list.some((c) => c.thumbprint === thumbprint)) {
        setThumbprint(list.find((c) => c.isValid)?.thumbprint ?? null)
      }
    } catch (e) {
      setPluginError(e instanceof Error ? e.message : String(e))
    } finally {
      setCertsLoading(false)
    }
  }

  const handleSignIn = async () => {
    if (!thumbprint) {
      message.warning('Выберите сертификат')
      return
    }
    setSigningIn(true)
    try {
      const challenge = await chestnyZnakApi.createChallenge(connectionId)
      const trueSignature = await signBase64(
        thumbprint,
        utf8ToBase64(challenge.true_api.data),
        false
      )
      const suzSignature = await signBase64(thumbprint, utf8ToBase64(challenge.suz.data), false)
      const result = await chestnyZnakApi.signIn(connectionId, {
        true_api: { uuid: challenge.true_api.uuid, signature: trueSignature },
        suz: { uuid: challenge.suz.uuid, signature: suzSignature },
      })
      saveThumbprint(thumbprint)
      onStatusChange(result)
      message.success('Вход в Честный знак выполнен')
    } catch (error) {
      message.error(await czErrorMessage(error, 'Ошибка входа'))
    } finally {
      setSigningIn(false)
    }
  }

  const handleTokenSignIn = async () => {
    setSigningIn(true)
    try {
      const result = await chestnyZnakApi.tokenSignIn(connectionId, {
        true_api_token: trueToken.trim(),
        suz_token: suzToken.trim() || null,
      })
      onStatusChange(result)
      setTrueToken('')
      setSuzToken('')
      message.success('Токены сохранены')
    } catch (error) {
      message.error(await czErrorMessage(error, 'Ошибка входа по токену'))
    } finally {
      setSigningIn(false)
    }
  }

  const sandboxTokenLogin = status?.environment === 'sandbox' && (
    <Collapse
      size="small"
      items={[
        {
          key: 'token',
          label: 'Песочница: вход по токену (без сертификата)',
          children: (
            <Space orientation="vertical" style={{ width: '100%' }}>
              <Typography.Text type="secondary">
                Токены ГИС МТ и СУЗ, полученные вне приложения. Без токена СУЗ для него
                используется токен ГИС МТ.
              </Typography.Text>
              <Input.TextArea
                rows={2}
                placeholder="Токен ГИС МТ (True API)"
                value={trueToken}
                onChange={(e) => setTrueToken(e.target.value)}
              />
              <Input.TextArea
                rows={2}
                placeholder="Токен СУЗ (clientToken), необязательно"
                value={suzToken}
                onChange={(e) => setSuzToken(e.target.value)}
              />
              <Button
                loading={signingIn}
                disabled={trueToken.trim().length < 10}
                onClick={handleTokenSignIn}
              >
                Войти по токену
              </Button>
              <Checkbox
                checked={unsigned}
                onChange={(e) => {
                  setUnsigned(e.target.checked)
                  setSandboxUnsigned(e.target.checked)
                }}
              >
                Отправлять заказ, нанесение и ввод без подписи (только песочница)
              </Checkbox>
            </Space>
          ),
        },
      ]}
    />
  )

  const handleLogout = async () => {
    await chestnyZnakApi.logout(connectionId)
    onReload?.()
  }

  if (loading && !status) return <Spin size="small" />

  if (status && !status.configured) {
    return (
      <Alert
        type="warning"
        showIcon
        title="Честный знак не настроен"
        description="Заполните ИНН и omsId в настройках Честного знака (вкладка «Честный знак» подключения)."
      />
    )
  }

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="Контур">
          <CzEnvBadge environment={status?.environment} />
        </Descriptions.Item>
        <Descriptions.Item label="Вход">
          {status?.authorized ? (
            <Typography.Text type="success">
              Выполнен, сессия до {formatDateTime(status.expires_at)}
            </Typography.Text>
          ) : (
            <Typography.Text type="warning">Не выполнен</Typography.Text>
          )}
        </Descriptions.Item>
        {status?.authorized && (
          <Descriptions.Item label="Баланс">
            {status.balance_error ? (
              <Typography.Text type="danger">{status.balance_error}</Typography.Text>
            ) : status.balances.length === 0 ? (
              '—'
            ) : (
              status.balances
                .map(
                  (b) =>
                    `${b.balance_rub?.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) ?? '?'} ₽` +
                    (b.product_group_id != null ? ` (группа ${b.product_group_id})` : '')
                )
                .join(', ')
            )}
          </Descriptions.Item>
        )}
      </Descriptions>

      {pluginError && <Alert type="error" showIcon title={pluginError} />}
      {certs !== null && certs.length === 0 && (
        <Alert
          type="warning"
          showIcon
          title="Сертификаты с закрытым ключом не найдены"
          description="Плагин видит только хранилище «Личное». Вставьте токен и установите сертификат из контейнера: Windows — «КриптоПро CSP» → «Сервис» → «Просмотреть сертификаты в контейнере» → «Установить»; Linux — csptestf -absorb -certs -autoprov (нужны pcscd и модуль считывателя КриптоПро для токена). Затем нажмите обновить."
        />
      )}
      {sandboxTokenLogin}

      <Space wrap>
        {certs === null ? (
          <Button icon={<SafetyCertificateOutlined />} loading={certsLoading} onClick={loadCerts}>
            Выбрать сертификат ЭЦП
          </Button>
        ) : (
          <>
            <Select
              style={{ minWidth: 380 }}
              placeholder={certs.length ? 'Сертификат' : 'Сертификаты с закрытым ключом не найдены'}
              value={thumbprint ?? undefined}
              onChange={setThumbprint}
              options={certs.map((c) => ({
                value: c.thumbprint,
                label: describeCertificate(c),
                disabled: !c.isValid,
              }))}
            />
            <Button icon={<ReloadOutlined />} loading={certsLoading} onClick={loadCerts} />
          </>
        )}
        <Button
          type="primary"
          loading={signingIn}
          disabled={!thumbprint}
          onClick={handleSignIn}
        >
          {status?.authorized ? 'Войти заново' : 'Войти по ЭЦП'}
        </Button>
        {status?.authorized && <Button onClick={handleLogout}>Выйти</Button>}
      </Space>
    </Space>
  )
}

export default CzAuthPanel
