import React, { useRef, useState } from 'react'
import { Input, InputNumber } from 'antd'

type EditableValue = string | number | null

interface EditableCellProps {
  value: EditableValue
  type?: 'text' | 'number'
  onSave: (value: string | number) => Promise<void>
  // Custom display for the non-editing state (e.g. a placeholder for empty values)
  renderValue?: (value: EditableValue) => React.ReactNode
}

// Click-to-edit table cell. Saves on Enter/blur, cancels on Escape.
// Empty or unchanged values are not saved. onSave should report its own errors
// and rethrow; the cell then falls back to the stored value.
const EditableCell: React.FC<EditableCellProps> = ({
  value,
  type = 'text',
  onSave,
  renderValue,
}) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<EditableValue>(value)
  const [saving, setSaving] = useState(false)
  // Enter disables the input, which fires blur; guard against a second commit
  const committingRef = useRef(false)

  const startEditing = () => {
    setDraft(value)
    setEditing(true)
  }

  const commit = async () => {
    if (committingRef.current) return

    const nextValue = typeof draft === 'string' ? draft.trim() : draft
    if (nextValue === null || nextValue === '' || nextValue === value) {
      setEditing(false)
      return
    }

    committingRef.current = true
    setSaving(true)
    try {
      await onSave(nextValue)
    } catch {
      // Error already reported by onSave; drop the draft and show the stored value
    } finally {
      committingRef.current = false
      setSaving(false)
      setEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditing(false)
    }
  }

  if (!editing) {
    return (
      <div
        onClick={startEditing}
        style={{ cursor: 'pointer', minHeight: 22, padding: '0 4px', borderRadius: 4 }}
        className="editable-cell"
      >
        {renderValue ? renderValue(value) : value}
      </div>
    )
  }

  if (type === 'number') {
    return (
      <InputNumber
        autoFocus
        size="small"
        min={0}
        precision={0}
        value={draft as number | null}
        disabled={saving}
        onChange={(v) => setDraft(v)}
        onPressEnter={commit}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        style={{ width: '100%' }}
      />
    )
  }

  return (
    <Input
      autoFocus
      size="small"
      value={(draft as string | null) ?? ''}
      disabled={saving}
      onChange={(e) => setDraft(e.target.value)}
      onPressEnter={commit}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  )
}

export default EditableCell
