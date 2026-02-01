import React from "react";
import ZoraTimestampStyle from '@styles/componentStyles/ZoraTimestamp.module.scss'
import {dealMsgTime} from "@Utils/Utils";

interface Timestamp {
  timestamp: string | number;
  active?: boolean;
}

const ZoraTimestamp:React.FC<Timestamp> = (
  {
    timestamp,
    active = false,
  })=>{

  return <div className={active ? `${ZoraTimestampStyle.timeBoxActive}` : ZoraTimestampStyle.timeBox}>
    <span className={ZoraTimestampStyle.time}>{dealMsgTime(timestamp)}</span>
  </div>
}

export default ZoraTimestamp;
