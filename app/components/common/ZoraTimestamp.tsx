import React,{useMemo,useState} from "react";
import ZoraTimestampStyle from '@styles/componentStyles/ZoraTimestamp.module.scss'
import {dealMsgTime} from "@Utils/Utils";

interface Timestamp {
  timestamp: string;
}

const ZoraTimestamp:React.FC<Timestamp> = (
  {
    timestamp
  })=>{

  const [ZoraTime,setZoraTime] = useState(timestamp)

  const memoTime = useMemo(()=>{
    return dealMsgTime(Number(ZoraTime))
  },[ZoraTime])

  return <div className={ZoraTimestampStyle.timeBox}>
    <span className={ZoraTimestampStyle.time}>{memoTime}</span>
  </div>
}

export default ZoraTimestamp;
