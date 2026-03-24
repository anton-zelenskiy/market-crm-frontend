import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Card,
  Form,
  InputNumber,
  Button,
  Select,
  Space,
  Typography,
  DatePicker,
  message,
  Tag,
  Table,
  Popconfirm,
  Switch,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

import { suppliesApi } from '../api/supplies'

const { Title, Text } = Typography

const WB_COMPANIES = [
  'ООО "НПЦ"АЛТАЙСКАЯ ЧАЙНАЯ КОМПАНИЯ',
  'ИП Казакова Т. А.',
  'ИП Забродин З. Е.',
  'ИП Мещериков А. В.',
] as const

const SupplyPlanningRunner: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const [form] = Form.useForm()
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const parsedConnectionId = connectionId ? parseInt(connectionId, 10) : NaN

  const refreshPlans = async () => {
    if (!Number.isFinite(parsedConnectionId)) {
      return
    }
    try {
      const data = await suppliesApi.listWBSupplyPlans(parsedConnectionId)
      setPlans(data)
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Ошибка получения списка планов')
    }
  }

  useEffect(() => {
    refreshPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId])

  const onSubmit = async (values: {
    company_name: string
    preorder_id: number
    date_from: Dayjs
    date_to: Dayjs
    is_active: boolean
  }) => {
    if (!values?.date_from || !values?.date_to) {
      message.error('Выберите дату от и дату до')
      return
    }

    const dateFrom = values.date_from.format('YYYY-MM-DD')
    const dateTo = values.date_to.format('YYYY-MM-DD')

    if (values.preorder_id == null || Number.isNaN(values.preorder_id)) {
      message.error('preorder_id должен быть числом')
      return
    }
    if (!Number.isFinite(parsedConnectionId)) {
      message.error('connection_id не найден')
      return
    }

    setLoading(true)
    try {
      await suppliesApi.createWBSupplyPlan({
        connection_id: parsedConnectionId,
        company_name: values.company_name,
        preorder_id: values.preorder_id,
        date_from: dateFrom,
        date_to: dateTo,
        is_active: values.is_active,
      })
      message.success('План создан')
      await refreshPlans()
      form.resetFields(['preorder_id'])
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Ошибка создания плана')
    } finally {
      setLoading(false)
    }
  }

  const onRun = async (planId: number) => {
    setLoading(true)
    try {
      await suppliesApi.runSupplyPlanning({ plan_id: planId })
      message.success('Задача запущена')
      await refreshPlans()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Ошибка запуска задачи')
    } finally {
      setLoading(false)
    }
  }

  const onCancel = async (planId: number) => {
    setLoading(true)
    try {
      await suppliesApi.cancelSupplyPlanning(planId)
      message.success('Задача отменена')
      await refreshPlans()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Ошибка отмены задачи')
    } finally {
      setLoading(false)
    }
  }

  const onToggle = async (planId: number) => {
    setLoading(true)
    try {
      await suppliesApi.toggleSupplyPlan(planId)
      message.success('Успешно!')
      await refreshPlans()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  const onDelete = async (planId: number) => {
    setLoading(true)
    try {
      await suppliesApi.deleteWBSupplyPlan(planId)
      message.success('План удален')
      await refreshPlans()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Ошибка удаления плана')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: 'Компания', dataIndex: 'company_name', key: 'company_name' },
    { title: 'preorder_id', dataIndex: 'preorder_id', key: 'preorder_id' },
    { title: 'Дата от', dataIndex: 'date_from', key: 'date_from' },
    { title: 'Дата до', dataIndex: 'date_to', key: 'date_to' },
    {
      title: 'Статус задачи',
      key: 'task',
      render: (_: any, record: any) =>
        record.task_running ? <Tag color="processing">Идёт</Tag> : <Tag>Не запущена</Tag>,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="primary"
            onClick={() => onRun(record.id)}
            disabled={record.task_running}
            loading={loading}
          >
            Запустить
          </Button>
          <Button
            danger
            onClick={() => onCancel(record.id)}
            disabled={!record.task_running}
            loading={loading}
          >
            Отменить
          </Button>
          <Button
            type="primary"
            onClick={() => onToggle(record.id)}
            loading={loading}
          >
            {record.is_active ? "Деактивировать" : "Активировать"}
          </Button>
          <Popconfirm
            title="Удалить план?"
            onConfirm={() => onDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button loading={loading}>Удалить</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              WB Supply plans
            </Title>
            <Text type="secondary">
              Создавайте планы и запускайте задачи поиска слотов/создания поставки.
            </Text>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          initialValues={{
            company_name: WB_COMPANIES[0],
            preorder_id: undefined,
            date_from: dayjs(),
            date_to: dayjs().add(7, 'day'),
            is_active: true,
          }}
        >
          <Form.Item
            name="company_name"
            label="Компания (WB)"
            rules={[{ required: true, message: 'Выберите компанию' }]}
          >
            <Select>
              {WB_COMPANIES.map((c) => (
                <Select.Option key={c} value={c}>
                  {c}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="preorder_id"
            label="preorder_id (ID Заказа)"
            rules={[{ required: true, message: 'Укажите preorder_id' }]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>

          <Space orientation="vertical" size={8} style={{ width: '100%' }}>
            <Form.Item
              name="date_from"
              label="Дата поставки (от)"
              rules={[{ required: true, message: 'Выберите дату от' }]}
            >
              <DatePicker format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item
              name="date_to"
              label="Дата поставки (до)"
              rules={[{ required: true, message: 'Выберите дату до' }]}
            >
              <DatePicker format="YYYY-MM-DD" />
            </Form.Item>
          </Space>

          <Form.Item name="is_active" label="Активен" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Создать план
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Table
          columns={columns}
          dataSource={plans}
          rowKey="id"
          pagination={false}
        />
      </Space>
    </Card>
  )
}

export default SupplyPlanningRunner

