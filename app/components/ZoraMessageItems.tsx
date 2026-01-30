import React, {useEffect, useRef} from "react";
import ZoraMessageItemsStyle from '@styles/componentStyles/ZoraMessageItems.module.scss'
import ZoraMessageItem from "@components/ZoraMessageItem"
import {MessageDataType} from "@Utils/socket.ts";
import ZoraEmpty from "@components/common/ZoraEmpty.tsx";
import {useMessageStore} from "@/zustand/zustand.ts";
import {useSocketService} from "@hooks/useSocketService.ts";
import {MessageAckType} from "@/type.ts";

interface MessagePropsType{
  messageData: MessageDataType[];
}

const ZoraMessageItems:React.FC<MessagePropsType> = (
  {
    messageData
  })=>{

  const msgIntoRef = useRef<HTMLElement | null>(null);
  const {socket} = useSocketService();
  const {activeCustomerItem, updateMessageStatus} = useMessageStore();
  const prevActiveCustomerItem = useRef<string | undefined>(undefined);
  const processedReadMsgIds = useRef<Map<string, string>>(new Map()); // 使用 Map 存储每个会话的最后一条已处理消息ID
  const isMarkingAsRead = useRef(false); // 防止同时发送多个标记已读请求

  const scrollToBottom = ()=>{
    msgIntoRef?.current?.scrollIntoView({behavior: "smooth"});
  }

  useEffect(() => {
    //消息更新自动滚动到底部
    scrollToBottom()
  }, [messageData]);

  useEffect(() => {
    if (!socket || !activeCustomerItem) return;

    const handleMarkMessagesAsRead = () => {
      if (messageData.length === 0) return;

      // 检查是否正在标记已读
      if (isMarkingAsRead.current) return;

      // 查找客户发送的最新消息（无论是否已读）
      const customerMessages = messageData.filter(msg => msg.senderType === 'CUSTOMER');

      // 如果没有客户消息，不执行后续逻辑
      if (customerMessages.length === 0) return;

      const latestCustomerMessage = customerMessages.pop(); // 获取最后一条（最新的）客户消息

      if (latestCustomerMessage) {
        // 检查最新消息是否已经标记为已读
        const isLatestMessageRead = latestCustomerMessage.msgStatus === 'READ';

        // 检查是否已经处理过这条消息（使用 Map 存储每个会话的最后一条已处理消息ID）
        const lastProcessedMsgId = processedReadMsgIds.current.get(activeCustomerItem);
        const hasProcessed = lastProcessedMsgId === latestCustomerMessage.msgId;

        // 只有当最新消息未读且未处理过时才发送已读请求
        if (!isLatestMessageRead && !hasProcessed) {
          // 标记为正在标记已读
          isMarkingAsRead.current = true;

          // 标记为已处理（存储每个会话的最后一条已处理消息ID）
          processedReadMsgIds.current.set(activeCustomerItem, latestCustomerMessage.msgId);

          // 发送消息已读请求到后端，告诉后端这条消息及之前的消息都已读
          socket.emit('mark_messages_as_read', {
            conversationId: activeCustomerItem,
            msgId: latestCustomerMessage.msgId,
            senderType: 'CUSTOMER',
            msgStatus: 'READ',
            readAllBefore: true // 标记这条消息及之前的消息都已读
          });

          // 请求完成后，重置标记状态（假设后端会在1秒内返回）
          setTimeout(() => {
            isMarkingAsRead.current = false;
          }, 1000);
        }
      }
    };

    handleMarkMessagesAsRead();

  }, [messageData, activeCustomerItem, socket]);

  // 切换聊天项时，请求最新的消息状态
  useEffect(() => {
    if (activeCustomerItem && socket && messageData.length > 0) {
      // 检查是否切换了聊天项
      if (prevActiveCustomerItem.current !== activeCustomerItem) {
        // 更新上一次的 activeCustomerItem
        prevActiveCustomerItem.current = activeCustomerItem;

        // 清空当前会话的已处理消息ID（切换聊天项后重新开始）
        processedReadMsgIds.current.delete(activeCustomerItem);

        // 获取当前会话中所有客服发送的消息
        const agentMessages = messageData.filter(msg => msg.senderType === 'AGENT');

        // 筛选出状态为DELIVERED或SENT的未读消息
        const unreadAgentMessages = agentMessages.filter(msg =>
          msg.msgStatus === 'DELIVERED' || msg.msgStatus === 'SENT'
        );

        if (unreadAgentMessages.length > 0) {
          // 获取未读消息的msgId
          const unreadMsgIds = unreadAgentMessages.map(msg => msg.msgId);

          // 请求这些未读消息的最新状态
          socket.emit('get_message_status', {
            conversationId: activeCustomerItem,
            msgIds: unreadMsgIds
          });
        }
      }
    }
  }, [activeCustomerItem, socket, messageData]);

  // 监听批量消息已读回执
  useEffect(() => {
    if (!socket) return;

    const handleMessagesBatchRead = (ack: MessageAckType) => {
      if (ack.msgStatus === 'READ' && ack.msgId && Array.isArray(ack.msgId)) {
        // 直接传递msgIds数组给updateMessageStatus，支持批量更新
        updateMessageStatus({
          msgId: ack.msgId,
          msgStatus: ack.msgStatus,
          conversationId: ack.conversationId
        });
      }
    };

    socket.on('messages_batch_read', handleMessagesBatchRead);

    return () => {
      socket.off('messages_batch_read', handleMessagesBatchRead);
    };
  }, [socket, updateMessageStatus]);

  // 监听服务器返回的消息状态更新
  useEffect(() => {
    if (!socket) return;

    const handleMessageStatusUpdate = (data: { messages: MessageDataType[] }) => {
      if (data.messages && Array.isArray(data.messages)) {
        // 批量更新消息状态
        data.messages.forEach(msg => {
          updateMessageStatus({
            msgId: msg.msgId,
            msgStatus: msg.msgStatus,
            conversationId: msg.conversationId
          });
        });
      }
    };

    socket.on('message_status_update', handleMessageStatusUpdate);

    return () => {
      socket.off('message_status_update', handleMessageStatusUpdate);
    };
  }, [socket, updateMessageStatus]);

  return <div className={ZoraMessageItemsStyle.container}>
    {
      messageData?.length ?
        <div className={ZoraMessageItemsStyle.messageBox}>
          {
            messageData.map((item:MessageDataType,index:number)=>{
              return <ZoraMessageItem itemData={item} key={item.conversationId+index}></ZoraMessageItem>
            })
          }
          <div className="msg-into-ref" ref={msgIntoRef}></div>
        </div>
        : <ZoraEmpty isEmptyMessage={true}></ZoraEmpty>
    }
  </div>
}

export default ZoraMessageItems;
