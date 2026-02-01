import ZoraEmptyStyle from '@styles/componentStyles/ZoraEmpty.module.scss'
import React from 'react'
import {useAppTranslation} from "@hooks/useAppTranslation.ts";

interface ZoraEmptyProps {
  isEmptyMessage?: boolean
  isEmptyProfile?: boolean
}

const ZoraEmpty:React.FC<ZoraEmptyProps> = ({isEmptyMessage, isEmptyProfile})=> {
  const {translation} = useAppTranslation()
  const et = translation.components.empty
  if(isEmptyProfile) {
    return <div className={ZoraEmptyStyle.chatMainArea}>
      <div className={ZoraEmptyStyle.emptyState + ' ' + ZoraEmptyStyle.emptyStateSide}>
        <div className={ZoraEmptyStyle.emptyStateIcon}>👤</div>
        <div className={ZoraEmptyStyle.emptyStateTitle}>{et.profile.title}</div>
        <div className={ZoraEmptyStyle.emptyStateDesc}>{et.profile.subtitle}</div>
      </div>
    </div>
  }
  if(!isEmptyMessage) {
    return <div className={ZoraEmptyStyle.chatMainArea}>
      <div className={ZoraEmptyStyle.emptyState + ' ' + ZoraEmptyStyle.emptyStateSide}>
        <div className={ZoraEmptyStyle.emptyStateIcon}>👥</div>
        <div className={ZoraEmptyStyle.emptyStateTitle}>{et.customer.title}</div>
        <div className={ZoraEmptyStyle.emptyStateDesc}>{et.customer.subtitle}</div>
        <button className={ZoraEmptyStyle.btnPrimary}>{et.customer.primaryAction.content}</button>
      </div>
    </div>
  }
  return <div className={ZoraEmptyStyle.chatMainArea}>
    <div className={ZoraEmptyStyle.emptyState + ' ' + ZoraEmptyStyle.emptyStateCenter}>
      <div className={ZoraEmptyStyle.emptyStateIcon}>💬</div>
      <div className={ZoraEmptyStyle.emptyStateTitle}>{et.message.title}</div>
      <div className={ZoraEmptyStyle.emptyStateDesc}>{et.message.subtitle}</div>
      <button className={ZoraEmptyStyle.btnPrimary}>{et.message.primaryAction.content}</button>
      </div>
    </div>
}


      export default ZoraEmpty
