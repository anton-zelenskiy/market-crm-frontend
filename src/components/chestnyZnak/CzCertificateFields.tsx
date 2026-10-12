import React from 'react'
import { DatePicker, Form, Input, Select } from 'antd'
import { CZ_CERTIFICATE_TYPE_LABELS } from '../../api/chestnyZnak'
import { DATE_FORMAT } from '../../lib/dayjs'

/**
 * Fields of «документ соответствия» + production date, for use inside an antd Form.
 * `withDocument=false` leaves only the date: documents come from the GTIN page.
 */
const CzCertificateFields: React.FC<{ withDocument?: boolean }> = ({ withDocument = true }) => (
  <>
    {withDocument && (
      <>
        <Form.Item
          name="certificate_type"
          label="Вид документа соответствия"
          rules={[{ required: true, message: 'Выберите вид документа' }]}
        >
          <Select
            options={Object.entries(CZ_CERTIFICATE_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="certificate_number"
          label="Номер документа"
          rules={[
            {
              required: true,
              whitespace: true,
              message: 'Укажите номер документа',
            },
          ]}
        >
          <Input placeholder="ЕАЭС N RU Д-RU.РА01.В.12345/26" />
        </Form.Item>
        <Form.Item
          name="certificate_date"
          label="Дата документа"
          rules={[{ required: true, message: 'Укажите дату документа' }]}
        >
          <DatePicker format={DATE_FORMAT} style={{ width: '100%' }} />
        </Form.Item>
      </>
    )}
    <Form.Item
      name="production_date"
      label="Дата производства"
      rules={[{ required: true, message: 'Укажите дату производства' }]}
    >
      <DatePicker format={DATE_FORMAT} style={{ width: '100%' }} />
    </Form.Item>
  </>
)

export default CzCertificateFields
