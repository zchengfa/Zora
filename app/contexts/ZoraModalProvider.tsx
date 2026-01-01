import React, { createContext, useContext, useState, ReactNode } from 'react';
import ZoraUniversalModal from "@components/common/ZoraUniversalModal.tsx";

// 定义模态框配置类型
export interface ModalConfig {
  /** 模态框标题 */
  title?: string;
  /** 模态框内容 */
  content?: string | ReactNode;
  confirmationText?: string | ReactNode;
  /** 模态框类型 */
  type?: 'default' | 'confirmation' | 'success' | 'error';
  /** 确认按钮文本 */
  confirmButtonText?: string;
  /** 确认按钮加载状态 */
  confirmLoading?: boolean;
  /** 确认回调函数 */
  onConfirm?: () => void | Promise<void>;
  /** 确认前的校验回调 */
  beforeConfirm?: () => boolean | Promise<boolean>;
  /** 取消按钮文本 */
  cancelButtonText?: string;
  /** 取消回调函数 */
  onClose?: () => void;
  /** 自定义宽度 */
  width?: string;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
}

// 定义模态框上下文类型
interface ModalContextType {
  /** 显示模态框 */
  showModal: (config: ModalConfig) => string;
  /** 隐藏模态框 */
  hideModal: (id: string) => void;
}

// 定义模态框状态类型
interface ModalState extends ModalConfig {
  /** 模态框唯一标识 */
  id: string;
  /** 是否打开 */
  isOpen?: boolean;
}

// 创建上下文（提供默认值）
const ModalContext = createContext<ModalContextType | undefined>(undefined);

// 定义ModalProvider的属性类型
interface ModalProviderProps {
  children: ReactNode;
}

const ZoraModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modals, setModals] = useState<ModalState[]>([]);

  const showModal = (modalConfig: ModalConfig): string => {
    const modalId = Math.random().toString(36);
    const newModal: ModalState = {
      ...modalConfig,
      id: modalId,
      isOpen: true
    };
    setModals(prev => [...prev, newModal]);
    return modalId;
  };

  const hideModal = (id: string): void => {
    setModals(prev => prev.filter(modal => modal.id !== id));
  };

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      {/* 渲染当前活动的弹窗 */}
      {modals.map(modal => (
        <ZoraUniversalModal
          key={modal.id}
          {...modal}
          onClose={() => {
            modal.onClose?.()
            hideModal(modal.id)
          }}
        />
      ))}
    </ModalContext.Provider>
  );
};


export const useZoraUniversalModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};


export default ZoraModalProvider
