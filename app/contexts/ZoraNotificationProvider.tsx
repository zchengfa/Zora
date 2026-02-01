
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import ZoraNotification from '@components/common/ZoraNotification';
import { NotificationConfig, NotificationType } from '@type';
import ZoraNotificationContainerStyle from '@styles/componentStyles/ZoraNotificationContainer.module.scss';

// 定义通知上下文类型
interface NotificationContextType {
  /** 显示通知 */
  showNotification: (config: NotificationConfig) => string;
  /** 显示成功通知 */
  showSuccess: (message: string, title?: string, duration?: number) => string;
  /** 显示信息通知 */
  showInfo: (message: string, title?: string, duration?: number) => string;
  /** 显示警告通知 */
  showWarning: (message: string, title?: string, duration?: number) => string;
  /** 显示错误通知 */
  showError: (message: string, title?: string, duration?: number) => string;
  /** 关闭通知 */
  hideNotification: (id: string) => void;
  /** 清空所有通知 */
  clearAll: () => void;
}

// 定义通知状态类型
interface NotificationState extends NotificationConfig {
  /** 通知唯一标识 */
  id: string;
}

// 创建上下文（提供默认值）
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// 定义NotificationProvider的属性类型
interface NotificationProviderProps {
  children: ReactNode;
  /** 最大通知数量 */
  maxCount?: number;
  /** 默认通知位置 */
  defaultPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const ZoraNotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  maxCount = 5,
  defaultPosition = 'top-right'
}) => {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);

  const showNotification = useCallback((config: NotificationConfig): string => {
    const id = config.id || Math.random().toString(36).substring(2, 9);
    const newNotification: NotificationState = {
      ...config,
      id,
      position: config.position || defaultPosition,
    };

    setNotifications(prev => {
      const updated = [...prev, newNotification];
      // 如果超过最大数量，移除最早的通知
      if (updated.length > maxCount) {
        return updated.slice(updated.length - maxCount);
      }
      return updated;
    });

    return id;
  }, [maxCount, defaultPosition]);

  const hideNotification = useCallback((id: string): void => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const clearAll = useCallback((): void => {
    setNotifications([]);
  }, []);

  const showSuccess = useCallback((message: string, title?: string, duration?: number): string => {
    return showNotification({
      type: 'success',
      title,
      message,
      duration,
    });
  }, [showNotification]);

  const showInfo = useCallback((message: string, title?: string, duration?: number): string => {
    return showNotification({
      type: 'info',
      title,
      message,
      duration,
    });
  }, [showNotification]);

  const showWarning = useCallback((message: string, title?: string, duration?: number): string => {
    return showNotification({
      type: 'warning',
      title,
      message,
      duration,
    });
  }, [showNotification]);

  const showError = useCallback((message: string, title?: string, duration?: number): string => {
    return showNotification({
      type: 'error',
      title,
      message,
      duration,
    });
  }, [showNotification]);

  // 根据位置对通知进行分组
  const notificationsByPosition = notifications.reduce((acc, notification) => {
    const position = notification.position || defaultPosition;
    if (!acc[position]) {
      acc[position] = [];
    }
    acc[position].push(notification);
    return acc;
  }, {} as Record<string, NotificationState[]>);

  return (
    <NotificationContext.Provider value={{ 
      showNotification, 
      showSuccess, 
      showInfo, 
      showWarning, 
      showError, 
      hideNotification,
      clearAll
    }}>
      {children}

      {/* 根据位置渲染通知容器 */}
      {Object.entries(notificationsByPosition).map(([position, positionNotifications]) => (
        <div 
          key={position} 
          className={`${ZoraNotificationContainerStyle.notificationContainer} ${ZoraNotificationContainerStyle[position]}`}
        >
          {positionNotifications.map(notification => (
            <ZoraNotification
              key={notification.id}
              {...notification}
              onClose={() => hideNotification(notification.id)}
            />
          ))}
        </div>
      ))}
    </NotificationContext.Provider>
  );
};

export const useZoraNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useZoraNotification must be used within a ZoraNotificationProvider');
  }
  return context;
};

export default ZoraNotificationProvider;
