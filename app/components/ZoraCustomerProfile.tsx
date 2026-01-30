import React from 'react';
import ZoraCustomerProfileStyle from '@styles/componentStyles/ZoraCustomerProfile.module.scss';
import { useMessageStore } from '@/zustand/zustand.ts';
import ZoraEmpty from '@components/common/ZoraEmpty.tsx';

interface ZoraCustomerProfileProps {}

const ZoraCustomerProfile: React.FC<ZoraCustomerProfileProps> = () => {
  const { activeCustomerInfo, chatList, activeCustomerItem } = useMessageStore();

  // 获取当前激活的客户详细信息
  const currentCustomer = chatList.find(customer => customer.conversationId === activeCustomerItem);

  // 格式化日期
  const formatDate = (timestamp: string | number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={ZoraCustomerProfileStyle.profileContainer}>
      {activeCustomerInfo ? (
        <>
          {/* 客户头像和基本信息 */}
          <div className={ZoraCustomerProfileStyle.profileHeader}>
            <div className={ZoraCustomerProfileStyle.avatarContainer}>
              {currentCustomer?.avatar ? (
                <img
                  className={ZoraCustomerProfileStyle.avatar}
                  src={currentCustomer.avatar}
                  alt="Customer Avatar"
                />
              ) : (
                <div className={ZoraCustomerProfileStyle.defaultAvatar}>
                  <span>{activeCustomerInfo.username?.charAt(0) || 'C'}</span>
                </div>
              )}
              <div className={`${ZoraCustomerProfileStyle.onlineStatus} ${currentCustomer?.isOnline ? ZoraCustomerProfileStyle.online : ZoraCustomerProfileStyle.offline}`}>
                <span className={ZoraCustomerProfileStyle.statusDot}></span>
              </div>
            </div>
            <h3 className={ZoraCustomerProfileStyle.customerName}>
              {activeCustomerInfo.username || 'Customer'}
            </h3>
            <p className={ZoraCustomerProfileStyle.customerStatus}>
              {currentCustomer?.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>

          {/* 客户详细信息 */}
          <div className={ZoraCustomerProfileStyle.profileDetails}>
            <div className={ZoraCustomerProfileStyle.detailSection}>
              <h4 className={ZoraCustomerProfileStyle.detailTitle}>Customer Information</h4>
              <div className={ZoraCustomerProfileStyle.detailItem}>
                <span className={ZoraCustomerProfileStyle.detailLabel}>Customer ID:</span>
                <span className={ZoraCustomerProfileStyle.detailValue}>{activeCustomerInfo.id}</span>
              </div>
              {currentCustomer && (
                <>
                  <div className={ZoraCustomerProfileStyle.detailItem}>
                    <span className={ZoraCustomerProfileStyle.detailLabel}>First Name:</span>
                    <span className={ZoraCustomerProfileStyle.detailValue}>{currentCustomer.firstName}</span>
                  </div>
                  <div className={ZoraCustomerProfileStyle.detailItem}>
                    <span className={ZoraCustomerProfileStyle.detailLabel}>Last Name:</span>
                    <span className={ZoraCustomerProfileStyle.detailValue}>{currentCustomer.lastName}</span>
                  </div>
                </>
              )}
            </div>

            {/* 聊天统计 */}
            <div className={ZoraCustomerProfileStyle.detailSection}>
              <h4 className={ZoraCustomerProfileStyle.detailTitle}>Chat Statistics</h4>
              {currentCustomer && (
                <>
                  <div className={ZoraCustomerProfileStyle.detailItem}>
                    <span className={ZoraCustomerProfileStyle.detailLabel}>Last Message:</span>
                    <span className={ZoraCustomerProfileStyle.detailValue}>{currentCustomer.lastMessage}</span>
                  </div>
                  <div className={ZoraCustomerProfileStyle.detailItem}>
                    <span className={ZoraCustomerProfileStyle.detailLabel}>Last Active:</span>
                    <span className={ZoraCustomerProfileStyle.detailValue}>
                      {formatDate(currentCustomer.lastTimestamp)}
                    </span>
                  </div>
                  <div className={ZoraCustomerProfileStyle.detailItem}>
                    <span className={ZoraCustomerProfileStyle.detailLabel}>Unread Messages:</span>
                    <span className={ZoraCustomerProfileStyle.detailValue}>
                      {currentCustomer.unreadMessageCount || 0}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 快捷操作 */}
          <div className={ZoraCustomerProfileStyle.quickActions}>
            <button className={ZoraCustomerProfileStyle.actionButton}>
              View Order History
            </button>
            <button className={ZoraCustomerProfileStyle.actionButton}>
              Send Product Recommendation
            </button>
            <button className={ZoraCustomerProfileStyle.actionButton}>
              Create Ticket
            </button>
          </div>
        </>
      ) : (
        <div className={ZoraCustomerProfileStyle.emptyState}>
          <ZoraEmpty isEmptyProfile={true} />
        </div>
      )}
    </div>
  );
};

export default ZoraCustomerProfile;
