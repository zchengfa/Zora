import React, { useState, useRef, useEffect } from 'react';
import styles from '@styles/components/ZoraAIChat.module.scss';
import { useAppTranslation } from '@hooks/useAppTranslation.ts';

interface AIMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: number;
}

interface ZoraAIChatProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

const ZoraAIChat: React.FC<ZoraAIChatProps> = ({ isOpen: externalIsOpen, onToggle: externalOnToggle }) => {
  const { translation } = useAppTranslation();
  const ct = translation.components.chat;
  const aiChatText = ct.aiChat;
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // 使用外部状态或内部状态
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnToggle || setInternalIsOpen;
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: aiChatText.messages.welcome,
      timestamp: Date.now()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // 添加用户消息
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // 模拟AI回复（这里应该替换为实际的AI API调用）
    setTimeout(() => {
      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiChatText.messages.demoResponse,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage().then();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        className={`${styles.floatingButton} ${isOpen ? styles.open : ''}`}
        onClick={toggleChat}
        aria-label={isOpen ? aiChatText.ariaLabels.closeChat : aiChatText.ariaLabels.openChat}
      >
        <svg
          className={styles.chatIcon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isOpen ? (
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              fill="currentColor"
            />
          ) : (
            <path
              d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
              fill="currentColor"
            />
          )}
        </svg>
      </button>

      {/* 聊天窗口 */}
      <div className={`${styles.chatWindow} ${isOpen ? styles.open : ''}`}>
        {/* 头部 */}
        <div className={styles.chatHeader}>
          <div className={styles.headerContent}>
            <div className={styles.aiAvatar}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
                  fill="currentColor"
                />
                <path
                  d="M12 6C10.9 6 10 6.9 10 8V11H8C6.9 11 6 11.9 6 13C6 14.1 6.9 15 8 15H10V17C10 18.1 10.9 19 12 19C13.1 19 14 18.1 14 17V15H16C17.1 15 18 14.1 18 13C18 11.9 17.1 11 16 11H14V8C14 6.9 13.1 6 12 6ZM12 17V15H10V13H12V11H14V13H16V15H14V17H12Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div className={styles.headerText}>
              <h3 className={styles.headerTitle}>{aiChatText.title}</h3>
              <span className={styles.headerStatus}>{aiChatText.status.online}</span>
            </div>
          </div>
          <button
            className={styles.closeButton}
            onClick={toggleChat}
            aria-label={aiChatText.ariaLabels.closeChat}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        {/* 消息列表 */}
        <div className={styles.messagesContainer}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${message.type === 'user' ? styles.user : styles.ai}`}
            >
              <div className={styles.messageBubble}>
                {message.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className={`${styles.message} ${styles.ai}`}>
              <div className={styles.messageBubble}>
                <div className={styles.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className={styles.inputContainer}>
          <textarea
            className={styles.input}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={aiChatText.input.placeholder}
            rows={1}
            aria-label={aiChatText.ariaLabels.messageInput}
          />
          <button
            className={styles.sendButton}
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            aria-label={aiChatText.ariaLabels.sendMessage}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default ZoraAIChat;
