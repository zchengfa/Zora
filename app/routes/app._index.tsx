import indexStyle from '@styles/pages/app_index.module.scss'
import ZoraSearch from '@components/ZoraSearch'
import ZoraCustomerList from '@components/ZoraCustomerList'
import ZoraMessageItems from "@components/ZoraMessageItems";
import ZoraChat from "@components/ZoraChat.tsx";
import ZoraCustomerProfile from "@components/ZoraCustomerProfile.tsx";
import {useSocketService} from "@hooks/useSocketService.ts";
import React, {useEffect, useState} from "react";
import {useMessageStore} from "@/zustand/zustand.ts";
import {useAgentOnline} from "@/hooks/useAgentOnline.ts";
import {getChatList,searchCustomers,addCustomerToChatList} from "@/network/request.ts";
import {MessageDataType} from "@Utils/socket.ts";
import {MessageServiceSendMessage} from "@Utils/MessageService.ts";
import {
  insertMessageToIndexedDB,
  readMessagesFromIndexedDB,
  syncMessageToIndexedDB
} from "@Utils/zustandWithIndexedDB.ts";
import {useAppTranslation} from "@hooks/useAppTranslation.ts";
import ZoraAIChatButton from "@components/ZoraAIChatButton.tsx";
import ZoraAIChat from "@components/ZoraAIChat.tsx";
import ZoraOnlineStatus from "@components/ZoraOnlineStatus.tsx";


function Index(){
  const {socket} = useSocketService();
  const {translation} = useAppTranslation();
  const ct = translation.components.chat;

  const messageStore = useMessageStore();
  const {customerStaff} = messageStore;

  // 客服上线/下线管理
  useAgentOnline();

  useEffect(() => {
    // 获取并同步聊天列表
    if (customerStaff?.id) {
      getChatList(customerStaff.id)
        .then(async res => {
          if (res?.data?.chatList) {
            // 转换字段名，统一为前端使用的字段名
          const transformedChatList = res.data.chatList.map((item: any) => ({
            ...item,
            firstName: item.customerFirstName || item.firstName || '',
            lastName: item.customerLastName || item.lastName || '',
            avatar: item.customerAvatar || item.avatar || null,
            customerProfile: item.customerProfile
          }));
            // 1. 设置聊天列表
            messageStore.setChatList(transformedChatList)

            // 2. 检查是否有激活的列表项
            const activeItem = transformedChatList.find(item => item.isActive)

            // 3. 如果有激活的列表项，更新zustand状态（内部会处理sessionStorage存储）
            if (activeItem?.conversationId) {
              // 提取客户信息
              const activeCustomerInfo = {
                id: activeItem.id,
                firstName: activeItem.firstName,
                lastName: activeItem.lastName,
                avatar: activeItem.avatar,
                isOnline: activeItem.isOnline,
                username: `${activeItem.lastName}${activeItem.firstName}`
              }

              // 更新zustand中的activeCustomerItem和activeCustomerInfo状态
              messageStore.setActiveCustomerInfo(activeItem.conversationId, activeCustomerInfo)

              // 4. 初始化消息（在设置activeCustomerInfo之后）
              messageStore.initMessages(activeItem.conversationId).then()
            }
            // 5. 同步消息到IndexedDB
            for (const chatItem of res.data.chatList) {
              if (chatItem.messages && chatItem.messages.length > 0) {
                // 获取本地已存储的消息
                const localMessages = await readMessagesFromIndexedDB({
                  page: 1,
                  pageSize: 1000,
                  indexValue: chatItem.conversationId
                })

                // 创建本地消息的Map，用于快速查找
                const localMessageMap = new Map<string, MessageDataType>()
                localMessages.list.forEach((msg: MessageDataType) => {
                  localMessageMap.set(msg.msgId, msg)
                })

                // 对比并同步消息
                for (const remoteMsg of chatItem.messages) {
                  const localMsg = localMessageMap.get(remoteMsg.msgId)

                  if (!localMsg) {
                    // 本地不存在该消息，直接插入
                    await insertMessageToIndexedDB(remoteMsg)
                  } else {
                    // 本地已存在，对比时间戳，如果服务器消息更新则同步
                    if (remoteMsg.timestamp > localMsg.timestamp) {
                      await syncMessageToIndexedDB(remoteMsg)
                    }
                  }
                }
              }
            }
          }
        })
        .catch(err => {
          console.error('获取聊天列表失败:', err)
        })
    }

    return ()=>{
      //聊天页销毁时清除激活项
      messageStore.changeActiveChatItem()
    }
  }, [customerStaff]);

  const customerItemClick = async (conversationId:string)=>{
    if(messageStore.activeCustomerItem !== conversationId){
      messageStore.readChatList(conversationId)
      await messageStore.changeMessages({
        conversationId,
        page:messageStore.page,
        pageSize: messageStore.pageSize
      })
    }
  }

  const sendMsg = (msg:string)=>{
    const msgData:MessageDataType = {
      senderId: messageStore.customerStaff?.id,
      senderType: 'AGENT',
      contentType: 'TEXT',
      msgStatus: 'SENDING',
      recipientType: 'CUSTOMER',
      recipientId: messageStore.activeCustomerInfo.id,
      contentBody: msg,
      msgId: 'msg_'+ new Date().getTime(),
      conversationId: messageStore.activeCustomerItem,
      timestamp: new Date().getTime(),
    }
    MessageServiceSendMessage({
      message:msgData,
      socket,
      messageStore
    })
  }

  // 搜索相关状态
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = React.useRef<{ focus: () => void }>(null);

  // 搜索客户处理函数
  const handleSearch = async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchCustomers(keyword);
      if (response?.data?.customers) {
        setSearchResults(response.data.customers);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('搜索客户失败:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 处理空状态按钮点击，聚焦搜索框
  const handleEmptyButtonClick = () => {
    searchInputRef.current?.focus();
  };

  // 添加客户到聊天列表
  const handleAddToChatList = async (customer: any) => {
    try {
      const response = await addCustomerToChatList(
        messageStore.customerStaff?.id,
        customer.id
      );

      if (response?.data?.success) {
        // 使用后端返回的聊天列表更新zustand
        if (response?.data?.chatList) {
          // 转换字段名，统一为前端使用的字段名
          const transformedChatList = response.data.chatList.map((item: any) => ({
            ...item,
            firstName: item.customerFirstName || item.firstName || '',
            lastName: item.customerLastName || item.lastName || '',
            avatar: item.customerAvatar || item.avatar || null,
            customerProfile: item.customerProfile
          }));
          messageStore.setChatList(transformedChatList);

          // 查找新添加的客户
          const newCustomer = transformedChatList.find(
            (item: any) => item.customerId === customer.id
          );

          // 如果找到新添加的客户，自动选中它
          if (newCustomer) {
            await customerItemClick(newCustomer.conversationId);
            // 在移动端，切换到聊天视图
            if (window.innerWidth <= 768) {
              setActiveView('chat');
            }
          }
        }

        // 清空搜索结果
        setSearchResults([]);
        // 显示成功提示
        console.log('已添加客户到聊天列表');
      }
    } catch (error) {
      console.error('添加客户到聊天列表失败:', error);
    }
  };
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'chat' | 'profile'>('chat');

  const toggleAIChat = () => {
    setIsAIChatOpen(!isAIChatOpen);
  };

  return <div className={indexStyle.container}>
    <div className={indexStyle.content}>
      <div className={indexStyle.statusBox}>
        <button
          className={`${indexStyle.viewToggle} ${activeView === 'list' ? indexStyle.active : ''}`}
          onTouchEnd={() => setActiveView('list')}
          onClick={() => setActiveView('list')}
          aria-label="切换到客户列表"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="currentColor"/>
          </svg>
        </button>
        <button
          className={`${indexStyle.viewToggle} ${activeView === 'chat' ? indexStyle.active : ''}`}
          onTouchEnd={() => setActiveView('chat')}
          onClick={() => setActiveView('chat')}
          aria-label="切换到聊天"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
        </button>
        <button
          className={`${indexStyle.viewToggle} ${activeView === 'profile' ? indexStyle.active : ''}`}
          onTouchEnd={() => setActiveView('profile')}
          onClick={() => setActiveView('profile')}
          aria-label="切换到客户资料"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
          </svg>
        </button>
        <ZoraAIChatButton
          onTouchEnd={toggleAIChat}
          onClick={toggleAIChat}
        />
        <ZoraOnlineStatus isOnline={true} />
      </div>
      <div className={indexStyle.chatContent}>
        <h3 className={indexStyle.chatTitle}>{ct.title}</h3>
        <div className={indexStyle.chatBox}>
          <div className={`${indexStyle.chatLeft} ${activeView !== 'list' ? indexStyle.hidden : ''}`}>
            <ZoraSearch
              ref={searchInputRef}
              placeholder={ct.searchPlaceholder}
              onSearch={handleSearch}
              searchResult={searchResults}
              onSearchResultClick={handleAddToChatList}
            ></ZoraSearch>
            <ZoraCustomerList
              customerData={messageStore.chatList}
              ItemClick={customerItemClick}
              activeView={activeView}
              setActiveView={setActiveView}
              onEmptyButtonClick={handleEmptyButtonClick}
            ></ZoraCustomerList>
          </div>
          <div className={indexStyle.chatMiddle}>
            <ZoraMessageItems messageData={messageStore.messages}></ZoraMessageItems>
            {
              messageStore.messages.length || messageStore.activeCustomerItem ? <ZoraChat sendMessage={sendMsg}></ZoraChat> : null
            }
          </div>
          <div className={`${indexStyle.chatRight} ${activeView === 'profile' ? indexStyle.visible : ''}`}>
            <ZoraCustomerProfile></ZoraCustomerProfile>
          </div>
        </div>
      </div>
    </div>
    <ZoraAIChat
      isOpen={isAIChatOpen}
      onToggle={toggleAIChat}
    />
  </div>
}

export default Index
