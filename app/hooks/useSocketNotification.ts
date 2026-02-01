
import { useEffect } from 'react';
import { useSocketService } from './useSocketService';
import { useZoraNotification } from '@/contexts/ZoraNotificationProvider';

/**
 * 用于监听socket通知并自动显示通知组件的自定义Hook
 * 当后端通过socket发送'notification'事件时，自动在界面上显示通知
 */
export const useSocketNotification = () => {
  const { notification } = useSocketService();
  const { showNotification } = useZoraNotification();

  useEffect(() => {
    if (notification) {
      showNotification({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        duration: notification.duration,
      });
    }
  }, [notification, showNotification]);
};

export default useSocketNotification;
