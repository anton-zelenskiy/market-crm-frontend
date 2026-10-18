import React, { useState } from 'react'
import { Button, Drawer } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import { Link, useLocation } from 'react-router-dom'
import CrmSidebar from './CrmSidebar'
import { TaskProgressBar } from './TaskProgressBar'
import { useTaskProgress } from '../context/TaskProgressContext'

// Replaces the dark top Header + boxed Content in DashboardLayout.
const CrmShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname, hash } = useLocation()
  const location = pathname + hash
  const { tasks } = useTaskProgress()
  // Drawer auto-closes on navigation: it stays open only on the location it was opened from
  const [openedOn, setOpenedOn] = useState<string | null>(null)
  const open = openedOn === location
  const setOpen = (value: boolean) => setOpenedOn(value ? location : null)

  return (
    <div className="crm-shell">
      <CrmSidebar />
      <div style={{ minWidth: 0 }}>
        <div className="crm-mobile-bar">
          <Button type="text" icon={<MenuOutlined />} onClick={() => setOpen(true)} />
          <Link to="/" className="crm-logo"><img src="/favicon.svg" alt="" />Market CRM</Link>
        </div>
        <main className="crm-main crm-dashboard-content" style={{ paddingBottom: tasks.length > 0 ? 96 : undefined }}>
          {children}
        </main>
        <TaskProgressBar />
      </div>
      <Drawer
        placement="left"
        open={open}
        onClose={() => setOpen(false)}
        closable={false}
        size={288}
        styles={{ body: { padding: 0, background: 'var(--crm-bg)' } }}
      >
        <CrmSidebar />
      </Drawer>
    </div>
  )
}

export default CrmShell
