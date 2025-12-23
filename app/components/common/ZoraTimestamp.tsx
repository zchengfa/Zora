import React from "react";
import ZoraTimestampStyle from '@styles/componentStyles/ZoraTimestamp.module.scss'
import {dealMsgTime} from "@Utils/Utils";

interface Timestamp {
  timestamp: string;
}

const ZoraTimestamp:React.FC<Timestamp> = (
  {
    timestamp
  })=>{

  return <div className={ZoraTimestampStyle.timeBox}>
    <span className={ZoraTimestampStyle.time}>{dealMsgTime(Number(timestamp))}</span>
  </div>
}

export default ZoraTimestamp;
