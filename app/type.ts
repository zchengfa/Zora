export interface CustomerDataType {
  id: string,
  firstName:string,
  lastName:string,
  avatar:string | null,
  isOnline:boolean,
  lastMessage:string,
  lastTimestamp:string,
  hadRead:boolean,
  isActive:boolean,
  unreadMessageCount:number,
}
