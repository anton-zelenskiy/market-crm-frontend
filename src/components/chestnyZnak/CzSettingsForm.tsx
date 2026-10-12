import React, { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Radio,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  CZ_ENVIRONMENT_LABELS,
  chestnyZnakApi,
  czErrorMessage,
  type CzEnvironment,
  type CzSettingsResponse,
} from '../../api/chestnyZnak'
import CzAuthPanel from './CzAuthPanel'
import { useCzAuthStatus } from './czAuth'

interface FormValues {
  inn: string
  oms_id: string
  oms_connection: string
}

const CzSettingsForm: React.FC<{ connectionId: number }> = ({ connectionId }) => {
  const navigate = useNavigate()
  const [data, setData] = useState<CzSettingsResponse | null>(null)
  const [environment, setEnvironment] = useState<CzEnvironment>('sandbox')
  const [saving, setSaving] = useState(false)
  const [switching, setSwitching] = useState(false)
  // Bumped to remount the form, discarding unsaved edits and re-reading initialValues
  const [formKey, setFormKey] = useState(0)
  const auth = useCzAuthStatus(connectionId)

  useEffect(() => {
    chestnyZnakApi
      .getSettings(connectionId)
      .then((response) => {
        setData(response)
        const env = response.active_environment ?? 'sandbox'
        setEnvironment(env)
      })
      .catch(async (e) => message.error(await czErrorMessage(e, 'Ошибка загрузки настроек')))
  }, [connectionId])

  const handleSave = async (values: FormValues) => {
    setSaving(true)
    try {
      const response = await chestnyZnakApi.saveSettings(connectionId, environment, {
        inn: values.inn.trim(),
        oms_id: values.oms_id.trim(),
        oms_connection: values.oms_connection.trim(),
        // The active environment is switched separately, see «Активный контур»
        make_active: false,
      })
      setData(response)
      message.success('Настройки Честного знака сохранены')
      auth.reload()
    } catch (e) {
      message.error(await czErrorMessage(e, 'Ошибка сохранения настроек'))
    } finally {
      setSaving(false)
    }
  }

  const switchActive = async (env: CzEnvironment) => {
    setSwitching(true)
    try {
      const response = await chestnyZnakApi.setActiveEnvironment(connectionId, env)
      setData(response)
      setEnvironment(env)
      setFormKey((k) => k + 1)
      message.success(`Активный контур: ${CZ_ENVIRONMENT_LABELS[env]}`)
      auth.reload()
    } catch (e) {
      message.error(await czErrorMessage(e, 'Ошибка переключения контура'))
    } finally {
      setSwitching(false)
    }
  }

  const handleActiveChange = (env: CzEnvironment) => {
    if (env !== 'prod') {
      switchActive(env)
      return
    }
    Modal.confirm({
      title: 'Переключиться на Production?',
      content:
        'Вход, баланс и новые задания будут работать с рабочим контуром Честного знака: коды платные и настоящие. Задания песочницы продолжить будет нельзя, пока не переключитесь обратно.',
      okText: 'Переключить',
      cancelText: 'Отмена',
      onOk: () => switchActive(env),
    })
  }

  if (!data) return <Spin />

  const envValues = data.environments[environment]

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%', maxWidth: 720 }}>
      <Card size="small" title="Активный контур">
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Radio.Group
            value={data.active_environment}
            optionType="button"
            buttonStyle="solid"
            disabled={switching}
            onChange={(e) => handleActiveChange(e.target.value)}
            options={(['sandbox', 'prod'] as CzEnvironment[]).map((env) => ({
              value: env,
              disabled: !data.environments[env],
              label: `${CZ_ENVIRONMENT_LABELS[env]}${data.environments[env] ? '' : ' (не настроен)'}`,
            }))}
          />
          <Typography.Text type="secondary">
            {data.active_environment
              ? 'Контур, с которым работают вход по ЭЦП, баланс и новые задания. Перед переключением сохраните настройки нужного контура ниже.'
              : 'Сохраните настройки ниже — первый сохранённый контур станет активным.'}
          </Typography.Text>
        </Space>
      </Card>

      <Card size="small" title="Вход в Честный знак">
        <CzAuthPanel
          connectionId={connectionId}
          status={auth.status}
          loading={auth.loading}
          onStatusChange={auth.setStatus}
          onReload={auth.reload}
        />
      </Card>

      <Card size="small" title="Разделы">
        <Space wrap>
          <Button onClick={() => navigate(`/connections/${connectionId}/chestny-znak/gtins`)}>
            GTIN товаров
          </Button>
          <Button onClick={() => navigate(`/connections/${connectionId}/chestny-znak/generate`)}>
            Генерация кодов
          </Button>
          <Button onClick={() => navigate(`/connections/${connectionId}/chestny-znak/jobs`)}>
            Задания ЧЗ
          </Button>
        </Space>
      </Card>

      <Card size="small" title="Настройки контуров">
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Radio.Group
            value={environment}
            optionType="button"
            buttonStyle="solid"
            onChange={(e) => {
              setEnvironment(e.target.value)
            }}
            options={(['sandbox', 'prod'] as CzEnvironment[]).map((env) => ({
              value: env,
              label: CZ_ENVIRONMENT_LABELS[env],
            }))}
          />
          <Typography.Text type="secondary">
            Редактируются настройки контура «{CZ_ENVIRONMENT_LABELS[environment]}»{' '}
            {data.active_environment === environment ? (
              <Tag color="blue">активен</Tag>
            ) : (
              <Tag>не активен</Tag>
            )}
          </Typography.Text>
          <Alert
            type="info"
            showIcon
            title="Где взять omsId и ID соединения"
            description="ЛК Честного знака → «Управление заказами» (СУЗ) → «Устройства» → добавить устройство. omsId указан на странице СУЗ, ID соединения — в карточке устройства. У песочницы и Production значения разные."
          />
          <Form
            key={`${environment}-${formKey}`}
            layout="vertical"
            onFinish={handleSave}
            initialValues={{
              inn: envValues?.inn ?? '',
              oms_id: envValues?.oms_id ?? '',
              oms_connection: envValues?.oms_connection ?? '',
            }}
          >
            <Form.Item
              name="inn"
              label="ИНН организации"
              rules={[{ required: true, pattern: /^\d{10}(\d{2})?$/, message: '10 или 12 цифр' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="oms_id" label="omsId (СУЗ)" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item
              name="oms_connection"
              label="ID соединения СУЗ (omsConnection)"
              rules={[{ required: true }]}
              extra="Нужен для входа в СУЗ: при входе ЭЦП подписывает два запроса (ГИС МТ и СУЗ)."
            >
              <Input />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              Сохранить
            </Button>
          </Form>
          <Typography.Text type="secondary">
            Настройки общие для всех подключений компании.
          </Typography.Text>
        </Space>
      </Card>
    </Space>
  )
}

export default CzSettingsForm
