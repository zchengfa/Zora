import ZoraEmptyStyle from '@styles/componentStyles/ZoraEmpty.module.scss'
import React from 'react'
interface ZoraEmptyProps {
  isEmptyMessage?: boolean
}

const ZoraEmpty:React.FC<ZoraEmptyProps> = ({isEmptyMessage})=> {
  if(!isEmptyMessage) {
    return <div className={ZoraEmptyStyle.chatMainArea}>
      <div className={ZoraEmptyStyle.emptyState + ' ' + ZoraEmptyStyle.emptyStateSide}>
        <div className={ZoraEmptyStyle.emptyStateIcon}>👥</div>
        <div className={ZoraEmptyStyle.emptyStateTitle}>No Customers</div>
        <div className={ZoraEmptyStyle.emptyStateDesc}>Add a customer to start chatting.</div>
        <button className={ZoraEmptyStyle.btnPrimary}>Add Customer</button>
      </div>
    </div>
  }
  return <div className={ZoraEmptyStyle.chatMainArea}>
    <div className={ZoraEmptyStyle.emptyState + ' ' + ZoraEmptyStyle.emptyStateCenter}>
      <div className={ZoraEmptyStyle.emptyStateIcon}>💬</div>
      <div className={ZoraEmptyStyle.emptyStateTitle}>No Message</div>
      <div className={ZoraEmptyStyle.emptyStateDesc}>You have no messages yet.</div>
      <button className={ZoraEmptyStyle.btnPrimary}>Start New Chat</button>
      </div>
    </div>
}


      export default ZoraEmpty
