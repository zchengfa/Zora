import {useAppTranslation} from "@hooks/useAppTranslation.ts"
import React, { useEffect } from 'react';
import ZoraUniversalModalStyle from '@styles/componentStyles/ZoraUniversalModal.module.scss'

interface ZoraUniversalModalProps {
  isOpen?: boolean;
  onClose: () => void | Promise<void>;
  title?: string;
  content?: string | React.ReactNode;
  type?: 'default' | 'confirmation' | 'success' | 'error';
  confirmationText?: string | React.ReactNode;
  successText?: string;
  errorText?: string;
  onConfirm?: () => void | Promise<void>;
  confirmLoading?: boolean;
  width?: number | string;
  showCloseButton?: boolean;
  cancelButtonText?: string;
  confirmButtonText?: string;
}

 const ZoraUniversalModal:React.FC<ZoraUniversalModalProps> = ({
                                 isOpen,
                                 onClose,
                                 title,
                                 content,
                                 type = 'default',
                                 confirmationText,
                                 successText,
                                 errorText,
                                 cancelButtonText, confirmButtonText,
                                 onConfirm,
                                 confirmLoading = false,
                                 width = '400px',
                                 showCloseButton = true
                               }) => {
   const { translation } = useAppTranslation();
   const modalTranslation = translation.components.modal

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // 点击遮罩层关闭
  const handleMaskClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  // 键盘事件支持 ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.keyCode === 27 && isOpen) { // ESC键
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const renderContent = () => {
    switch (type) {
      case 'confirmation':
        return <div className={ZoraUniversalModalStyle.modalConfirmationText}>{confirmationText || modalTranslation.default.confirmationText}</div>;
      case 'success':
        return (
          <div className={ZoraUniversalModalStyle.modalSuccessContent}>
            <div className={ZoraUniversalModalStyle.modalIcon}>✓</div>
            <div className={ZoraUniversalModalStyle.modalSuccessText}>{successText || modalTranslation.default.successText}</div>
          </div>
        );
      case 'error':
        return (
          <div className={ZoraUniversalModalStyle.modalErrorContent}>
            <div className={ZoraUniversalModalStyle.modalIcon}>✕</div>
            <div className={ZoraUniversalModalStyle.modalErrorText}>{errorText || modalTranslation.default.errorText}</div>
          </div>
        );
      default:
        return <div className={ZoraUniversalModalStyle.modalDefaultContent}>{content}</div>;
    }
  };

  const renderFooter = () => {
    switch (type) {
      case 'confirmation':
        return (
          <div className={ZoraUniversalModalStyle.modalFooter}>
            <button
              className={`${ZoraUniversalModalStyle.modalBtn} ${ZoraUniversalModalStyle.modalBtnCancel}`}
              onClick={onClose}
              disabled={confirmLoading}
            >
              {cancelButtonText}
            </button>
            <button
              className={`${ZoraUniversalModalStyle.modalBtn} ${ZoraUniversalModalStyle.modalBtnPrimary}`}
              onClick={onConfirm}
              disabled={confirmLoading}
            >
              {confirmLoading ? translation.components.modal.loading : (confirmButtonText || modalTranslation.default.confirmButtonText)}
            </button>
          </div>
        );
      case 'success':
      case 'error':
        return (
          <div className={ZoraUniversalModalStyle.modalFooter}>
            <button className={`${ZoraUniversalModalStyle.modalBtn} ${ZoraUniversalModalStyle.modalBtnPrimary}`} onClick={onClose}>
              {cancelButtonText || modalTranslation.default.cancelButtonText}
            </button>
          </div>
        );
      default:
        return (
          <div className={ZoraUniversalModalStyle.modalFooter}>
            <button className={`${ZoraUniversalModalStyle.modalBtn} ${ZoraUniversalModalStyle.modalBtnPrimary}`} onClick={onClose}>
              {cancelButtonText || modalTranslation.default.cancelButtonText}
            </button>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className={ZoraUniversalModalStyle.modalOverlay} onClick={handleMaskClick}>
      <div
        className={`${ZoraUniversalModalStyle.modalContainer} ${type}`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ZoraUniversalModalStyle.modalTitle}
      >
        {/* 头部 */}
        <div className={ZoraUniversalModalStyle.modalHeader}>
          <h3 id="modal-title" className={ZoraUniversalModalStyle.modalTitle}>{title || modalTranslation.default.title}</h3>
          {showCloseButton && (
            <button
              className={ZoraUniversalModalStyle.modalCloseBtn}
              onClick={onClose}
              aria-label={modalTranslation.ariaLabel}
            >
              ×
            </button>
          )}
        </div>

        {/* 内容区域 */}
        <div className={ZoraUniversalModalStyle.modalBody}>
          {renderContent()}
        </div>

        {/* 底部按钮 */}
        {renderFooter()}
      </div>
    </div>
  );
};

export default ZoraUniversalModal
