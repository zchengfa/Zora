import { useEffect } from 'react';
import { useSocketService } from './useSocketService';
import { useMessageStore } from '@/zustand/zustand';

/**
 * 客服上线/下线管理Hook
 * 当页面加载时自动发送客服上线消息，页面卸载时发送下线消息
 * socket重连时自动重新发送上线消息
 */
export const useAgentOnline = () => {
  const { socket } = useSocketService();
  const customerStaff = useMessageStore(state => state.customerStaff);

  useEffect(() => {
    if (!customerStaff?.id) return;

    // 发送客服上线消息的函数
    const sendAgentOnline = () => {
      console.log(customerStaff.id, '客服上线');
      socket.emit('agent', {
        id: customerStaff.id,
        name: customerStaff.name || customerStaff.email || 'Unknown'
      });
    };

    // 初始发送上线消息
    sendAgentOnline();

    // 监听socket连接事件（包括初始连接和重连）
    socket.on('connect', sendAgentOnline);

    // 页面卸载时发送下线消息并清理监听
    return () => {
      console.log(customerStaff.id, '客服下线');
      socket.emit('offline', { id: customerStaff.id });
      socket.off('connect', sendAgentOnline);
    };
  }, [customerStaff?.id, socket]);
};
