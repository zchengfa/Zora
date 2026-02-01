import React, { useEffect, useState } from 'react';
import { NotificationConfig,NotificationType } from '@types';
import ZoraNotificationStyle from '@styles/componentStyles/ZoraNotification.module.scss';
import {useAppTranslation} from "@hooks/useAppTranslation.ts";

interface ZoraNotificationProps extends NotificationConfig {
  /** 关闭通知 */
  onClose: () => void;
  /** 点击通知 */
  onClick?: () => void;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 是否可关闭 */
  closable?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 自定义图标 */
  icon?: React.ReactNode;
  type?: NotificationType;
  title?: string;
  message?: string;
  duration?: number;
}

const ZoraNotification: React.FC<ZoraNotificationProps> = ({
  type = 'info',
  title,
  message,
  duration = 4500,
  icon,
  onClick,
  onClose,
  showCloseButton = true,
  closable = true,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const {translation} = useAppTranslation();
  const nt = translation.components.notification;

  // 自动关闭逻辑
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    if (!isClosing && isVisible) {
      setIsClosing(true);
      // 等待关闭动画完成后再移除组件
      setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 300);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
      if (closable) {
        handleClose();
      }
    }
  };

  // 根据类型获取默认图标
  const getDefaultIcon = () => {
    switch (type) {
      case 'success':
        return <span className={ZoraNotificationStyle.iconSuccess}>✓</span>;
      case 'error':
        return <span className={ZoraNotificationStyle.iconError}>✕</span>;
      case 'warning':
        return <span className={ZoraNotificationStyle.iconWarning}>!</span>;
      case 'info':
      default:
        return <span className={ZoraNotificationStyle.iconInfo}>i</span>;
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`${ZoraNotificationStyle.notification} ${ZoraNotificationStyle[type]} ${isClosing ? ZoraNotificationStyle.closing : ''} ${className}`}
      onClick={handleClick}
    >
      <div className={ZoraNotificationStyle.notificationContent}>
        <div className={ZoraNotificationStyle.notificationIcon}>
          {icon || getDefaultIcon()}
        </div>
        <div className={ZoraNotificationStyle.notificationText}>
          {title && <div className={ZoraNotificationStyle.notificationTitle}>{title}</div>}
          <div className={ZoraNotificationStyle.notificationMessage}>{message}</div>
        </div>
        {showCloseButton && (
          <button
            className={ZoraNotificationStyle.notificationCloseBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            aria-label={nt.ariaLabel}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default ZoraNotification;
