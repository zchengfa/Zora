import {openDB, getDataByCursorIndex, insertDataToDB} from "@/indexedDB/indexedDB.ts";
import {MessageDataType} from "@Utils/socket.ts";

const INDEXED_DB_STORE_NAME='zora_chat'

export const initIndexedDB =async ()=>{
  return await openDB('zora_chat_indexedDB',{
    storeName: INDEXED_DB_STORE_NAME,
    storeOptions:{
      keyPath: 'ID',
      autoIncrement: true
    },
    indexArr: ['conversationId', 'timestamp'],
    indexOptions: {}
  })
}

export const insertMessageToIndexedDB = async (data:MessageDataType)=>{
  const {db} = await initIndexedDB() as {db:IDBDatabase}
  return insertDataToDB(db,INDEXED_DB_STORE_NAME,data)
}

export const readMessagesFromIndexedDB = async (options:{page:number,pageSize:number,indexValue:any})=>{
  const {db} = await initIndexedDB() as {db:IDBDatabase}
  return await getDataByCursorIndex(db,INDEXED_DB_STORE_NAME,{
    ...options,
    withIndex: true,
    indexName:'conversationId',
  })
}
