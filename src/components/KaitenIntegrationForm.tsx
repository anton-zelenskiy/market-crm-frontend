import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Divider, Form, Input, Select, Switch, Typography, message } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import {
  kaitenIntegrationApi,
  type KaitenIntegrationResponse,
  type KaitenIntegrationSettings,
  type KaitenSelectOption,
  type KaitenUserOption,
} from '../api/kaitenIntegration'

const { Title, Text } = Typography
const { Option } = Select

interface KaitenIntegrationFormProps {
  connectionId: number
}

const KaitenIntegrationForm: React.FC<KaitenIntegrationFormProps> = ({ connectionId }) => {
  const [credentialsForm] = Form.useForm()
  const [settingsForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [savingCredentials, setSavingCredentials] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [integration, setIntegration] = useState<KaitenIntegrationResponse | null>(null)
  const [ephemeralSpaceId, setEphemeralSpaceId] = useState<number | null>(null)
  const [spaces, setSpaces] = useState<KaitenSelectOption[]>([])
  const [boards, setBoards] = useState<KaitenSelectOption[]>([])
  const [lanes, setLanes] = useState<KaitenSelectOption[]>([])
  const [columns, setColumns] = useState<KaitenSelectOption[]>([])
  const [users, setUsers] = useState<KaitenUserOption[]>([])
  const [boardId, setBoardId] = useState<number | null>(null)

  const credentialsConfigured = integration?.credentials.token_configured ?? false

  const loadIntegration = useCallback(async () => {
    setLoading(true)
    try {
      const data = await kaitenIntegrationApi.get(connectionId)
      setIntegration(data)
      credentialsForm.setFieldsValue({
        domain: data.credentials.domain,
        token: '',
      })
      settingsForm.setFieldsValue({
        enabled: data.enabled,
        board_id: data.settings?.board_id,
        lane_id: data.settings?.lane_id,
        column_id: data.settings?.column_id,
        owner_id: data.settings?.owner_id,
      })
      if (data.settings?.board_id) {
        setBoardId(data.settings.board_id)
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки интеграции Kaiten')
    } finally {
      setLoading(false)
    }
  }, [connectionId, credentialsForm, settingsForm])

  useEffect(() => {
    loadIntegration()
  }, [loadIntegration])

  useEffect(() => {
    if (boardId && credentialsConfigured) {
      loadLanesAndColumns(boardId)
    }
  }, [boardId, connectionId, credentialsConfigured])

  const loadSpaces = async () => {
    try {
      const data = await kaitenIntegrationApi.listSpaces(connectionId)
      setSpaces(data)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Не удалось загрузить пространства Kaiten')
    }
  }

  const loadBoards = async (spaceId: number) => {
    try {
      const data = await kaitenIntegrationApi.listBoards(connectionId, spaceId)
      setBoards(data)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Не удалось загрузить доски')
    }
  }

  const loadLanesAndColumns = async (selectedBoardId: number) => {
    try {
      const [lanesData, columnsData] = await Promise.all([
        kaitenIntegrationApi.listLanes(connectionId, selectedBoardId),
        kaitenIntegrationApi.listColumns(connectionId, selectedBoardId),
      ])
      setLanes(lanesData)
      setColumns(columnsData)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Не удалось загрузить дорожки/колонки')
    }
  }

  const loadUsers = async (query?: string) => {
    try {
      const data = await kaitenIntegrationApi.listUsers(connectionId, {
        limit: 100,
        offset: 0,
        query,
      })
      setUsers(data.users)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Не удалось загрузить пользователей')
    }
  }

  const handleSaveCredentials = async (values: { domain: string; token?: string }) => {
    const needsToken = !integration?.credentials.token_configured
    if (needsToken && !values.token) {
      message.error('Укажите API токен')
      return
    }

    setSavingCredentials(true)
    try {
      const updated = await kaitenIntegrationApi.upsert(connectionId, {
        enabled: true,
        credentials: {
          domain: values.domain,
          token: values.token || '',
        },
      })
      setIntegration(updated)
      credentialsForm.setFieldValue('token', '')
      message.success('Учётные данные Kaiten сохранены. Теперь настройте размещение карточки.')
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка сохранения учётных данных')
    } finally {
      setSavingCredentials(false)
    }
  }

  const handleSaveSettings = async (values: {
    enabled: boolean
    board_id: number
    lane_id: number
    column_id: number
    owner_id?: number
  }) => {
    setSavingSettings(true)
    try {
      const settings: KaitenIntegrationSettings = {
        board_id: values.board_id,
        lane_id: values.lane_id,
        column_id: values.column_id,
        owner_id: values.owner_id ?? null,
      }

      const updated = await kaitenIntegrationApi.upsert(connectionId, {
        enabled: values.enabled,
        settings,
      })
      setIntegration(updated)
      message.success('Настройки размещения карточки сохранены')
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка сохранения настроек')
    } finally {
      setSavingSettings(false)
    }
  }

  const optionLabel = (item: KaitenSelectOption) =>
    item.title ? `${item.title} (${item.id})` : String(item.id)

  const userLabel = (user: KaitenUserOption) =>
    user.full_name || user.email || user.username || String(user.id)

  return (
    <Card size="small" title="Интеграция Kaiten" loading={loading}>
      <Title level={5}>Шаг 1. Учётные данные</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Сначала сохраните домен и токен. Интеграция будет включена автоматически.
      </Text>
      <Form
        form={credentialsForm}
        layout="vertical"
        onFinish={handleSaveCredentials}
      >
        <Form.Item
          name="domain"
          label="Домен Kaiten"
          rules={[{ required: true, message: 'Укажите домен' }]}
        >
          <Input placeholder="altaiflora" />
        </Form.Item>
        <Form.Item
          name="token"
          label={
            credentialsConfigured
              ? 'API токен (оставьте пустым, чтобы не менять)'
              : 'API токен'
          }
          rules={
            credentialsConfigured
              ? []
              : [{ required: true, message: 'Укажите токен' }]
          }
        >
          <Input.Password placeholder="Bearer token" />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={savingCredentials}
          >
            Сохранить учётные данные
          </Button>
        </Form.Item>
      </Form>

      <Divider />

      <Title level={5}>Шаг 2. Размещение карточки</Title>
      {!credentialsConfigured ? (
        <Alert
          type="info"
          showIcon
          title="Сначала сохраните учётные данные"
          description="После сохранения домена и токена здесь появятся списки пространств, досок и пользователей Kaiten."
        />
      ) : (
        <Form
          form={settingsForm}
          layout="vertical"
          onFinish={handleSaveSettings}
        >
          <Form.Item name="enabled" label="Включена" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Пространство (для выбора доски)">
            <Select
              placeholder="Выберите пространство"
              allowClear
              value={ephemeralSpaceId ?? undefined}
              onFocus={() => {
                if (spaces.length === 0) loadSpaces()
              }}
              onChange={(value) => {
                setEphemeralSpaceId(value ?? null)
                setBoards([])
                settingsForm.setFieldsValue({
                  board_id: undefined,
                  lane_id: undefined,
                  column_id: undefined,
                })
                if (value) loadBoards(value)
              }}
            >
              {spaces.map((s) => (
                <Option key={s.id} value={s.id}>
                  {optionLabel(s)}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="board_id"
            label="Доска"
            rules={[{ required: true, message: 'Выберите доску' }]}
          >
            <Select
              placeholder="Выберите доску"
              onChange={(value) => {
                setBoardId(value)
                settingsForm.setFieldsValue({ lane_id: undefined, column_id: undefined })
                loadLanesAndColumns(value)
              }}
            >
              {boards.map((b) => (
                <Option key={b.id} value={b.id}>
                  {optionLabel(b)}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="lane_id"
            label="Дорожка"
            rules={[{ required: true, message: 'Выберите дорожку' }]}
          >
            <Select placeholder="Выберите дорожку" disabled={!boardId}>
              {lanes.map((lane) => (
                <Option key={lane.id} value={lane.id}>
                  {optionLabel(lane)}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="column_id"
            label="Колонка"
            rules={[{ required: true, message: 'Выберите колонку' }]}
          >
            <Select placeholder="Выберите колонку" disabled={!boardId}>
              {columns.map((col) => (
                <Option key={col.id} value={col.id}>
                  {optionLabel(col)}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="owner_id" label="Владелец карточки">
            <Select
              allowClear
              showSearch
              placeholder="Выберите пользователя"
              filterOption={false}
              onFocus={() => {
                if (users.length === 0) loadUsers()
              }}
              onSearch={(q) => loadUsers(q || undefined)}
            >
              {users.map((u) => (
                <Option key={u.id} value={u.id}>
                  {userLabel(u)}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={savingSettings}
            >
              Сохранить настройки размещения
            </Button>
          </Form.Item>
        </Form>
      )}
    </Card>
  )
}

export default KaitenIntegrationForm
