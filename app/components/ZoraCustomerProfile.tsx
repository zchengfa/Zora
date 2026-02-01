import React from 'react';
import ZoraCustomerProfileStyle from '@styles/componentStyles/ZoraCustomerProfile.module.scss';
import { useMessageStore } from '@/zustand/zustand.ts';
import ZoraEmpty from '@components/common/ZoraEmpty.tsx';
import {useAppTranslation} from "@hooks/useAppTranslation.ts";

interface CustomerProfile {
  customerId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  customerImage?: string;
  customerSince?: Date;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  currencyCode: string;
  firstOrderDate?: Date;
  lastOrderDate?: Date;
  daysSinceLastOrder: number;
  averageDaysBetweenOrders: number;
  topCategories: Array<{category: string, count: number}>;
  topProducts: Array<{productId: string, title: string, count: number, totalSpent: number}>;
  topShippingLocations: Array<{city: string, province: string, country: string, count: number}>;
  tags: string[];
  valueScore: number;
  loyaltyScore: number;
  engagementScore: number;
  recentOrders: Array<{
    id: string;
    name: string;
    status: string;
    totalPrice: number;
    createdAt: Date;
    itemCount: number;
  }>;
}

interface ZoraCustomerProfileProps {}

const ZoraCustomerProfile: React.FC<ZoraCustomerProfileProps> = () => {
  const { chatList, activeCustomerItem } = useMessageStore();
  const { translation } = useAppTranslation()
  const pt = translation.components.profile
  // 获取当前激活的客户详细信息
  const currentCustomer = chatList.find(customer => customer.conversationId === activeCustomerItem);
  const customerProfile: CustomerProfile | undefined = currentCustomer?.customerProfile;

  // 格式化日期
  const formatDate = (timestamp: string | number | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // 格式化金额
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // 获取评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 80) return ZoraCustomerProfileStyle.highScore;
    if (score >= 60) return ZoraCustomerProfileStyle.mediumScore;
    return ZoraCustomerProfileStyle.lowScore;
  };

  // 获取订单状态颜色
  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return ZoraCustomerProfileStyle.completedStatus;
      case 'CANCELLED': return ZoraCustomerProfileStyle.cancelledStatus;
      case 'PROCESSING': return ZoraCustomerProfileStyle.processingStatus;
      case 'SHIPPED': return ZoraCustomerProfileStyle.shippedStatus;
      default: return ZoraCustomerProfileStyle.defaultStatus;
    }
  };

  return (
    <div className={ZoraCustomerProfileStyle.profileContainer}>
      {customerProfile ? (
        <>
          {/* 客户头像和基本信息 */}
          <div className={ZoraCustomerProfileStyle.profileHeader}>
            <div className={ZoraCustomerProfileStyle.avatarContainer}>
              {currentCustomer?.avatar || customerProfile.customerImage ? (
                <img
                  className={ZoraCustomerProfileStyle.avatar}
                  src={currentCustomer?.avatar || customerProfile.customerImage}
                  alt="Customer Avatar"
                />
              ) : (
                <div className={ZoraCustomerProfileStyle.defaultAvatar}>
                  <span>{customerProfile.customerName?.charAt(0) || 'C'}</span>
                </div>
              )}
              <div className={`${ZoraCustomerProfileStyle.onlineStatus} ${currentCustomer?.isOnline ? ZoraCustomerProfileStyle.online : ZoraCustomerProfileStyle.offline}`}>
                <span className={ZoraCustomerProfileStyle.statusDot}></span>
              </div>
            </div>
            <h3 className={ZoraCustomerProfileStyle.customerName}>
              {customerProfile.customerName || 'Customer'}
            </h3>
            <p className={ZoraCustomerProfileStyle.customerStatus}>
              {currentCustomer?.isOnline ? pt.status.online : pt.status.offline}
            </p>
          </div>

          {/* 客户评分卡片 */}
          <div className={ZoraCustomerProfileStyle.scoresSection}>
            <div className={`${ZoraCustomerProfileStyle.scoreCard} ${getScoreColor(customerProfile.valueScore)}`}>
              <div className={ZoraCustomerProfileStyle.scoreLabel}>{pt.score.loyaltyScore}</div>
              <div className={ZoraCustomerProfileStyle.scoreValue}>{customerProfile.valueScore}</div>
            </div>
            <div className={`${ZoraCustomerProfileStyle.scoreCard} ${getScoreColor(customerProfile.loyaltyScore)}`}>
              <div className={ZoraCustomerProfileStyle.scoreLabel}>{pt.score.valueScore}</div>
              <div className={ZoraCustomerProfileStyle.scoreValue}>{customerProfile.loyaltyScore}</div>
            </div>
            <div className={`${ZoraCustomerProfileStyle.scoreCard} ${getScoreColor(customerProfile.engagementScore)}`}>
              <div className={ZoraCustomerProfileStyle.scoreLabel}>{pt.score.engagementScore}</div>
              <div className={ZoraCustomerProfileStyle.scoreValue}>{customerProfile.engagementScore}</div>
            </div>
          </div>

          {/* 客户详细信息 */}
          <div className={ZoraCustomerProfileStyle.profileDetails}>
            <div className={ZoraCustomerProfileStyle.detailSection}>
              <h4 className={ZoraCustomerProfileStyle.detailTitle}>{pt.customerDetail.title}</h4>
              <div className={ZoraCustomerProfileStyle.detailItem}>
                <span className={ZoraCustomerProfileStyle.detailLabel}>{pt.customerDetail.id}:</span>
                <span className={ZoraCustomerProfileStyle.detailValue}>{customerProfile.customerId}</span>
              </div>
              <div className={ZoraCustomerProfileStyle.detailItem}>
                <span className={ZoraCustomerProfileStyle.detailLabel}>{pt.customerDetail.email}:</span>
                <span className={ZoraCustomerProfileStyle.detailValue}>{customerProfile.customerEmail}</span>
              </div>
              {customerProfile.customerPhone && (
                <div className={ZoraCustomerProfileStyle.detailItem}>
                  <span className={ZoraCustomerProfileStyle.detailLabel}>{pt.customerDetail.phone}:</span>
                  <span className={ZoraCustomerProfileStyle.detailValue}>{customerProfile.customerPhone}</span>
                </div>
              )}
              {customerProfile.customerSince && (
                <div className={ZoraCustomerProfileStyle.detailItem}>
                  <span className={ZoraCustomerProfileStyle.detailLabel}>{pt.customerDetail.since}:</span>
                  <span className={ZoraCustomerProfileStyle.detailValue}>{formatDate(customerProfile.customerSince)}</span>
                </div>
              )}
            </div>

            {/* 客户标签 */}
            {customerProfile.tags.length > 0 && (
              <div className={ZoraCustomerProfileStyle.detailSection}>
                <h4 className={ZoraCustomerProfileStyle.detailTitle}>{pt.tags}</h4>
                <div className={ZoraCustomerProfileStyle.tagsContainer}>
                  {customerProfile.tags.map((tag, index) => (
                    <span key={index} className={ZoraCustomerProfileStyle.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 订单统计 */}
            <div className={ZoraCustomerProfileStyle.detailSection}>
              <h4 className={ZoraCustomerProfileStyle.detailTitle}>{pt.statistics.order.title}</h4>
              <div className={ZoraCustomerProfileStyle.statsGrid}>
                <div className={ZoraCustomerProfileStyle.statItem}>
                  <div className={ZoraCustomerProfileStyle.statLabel}>{pt.statistics.order.totalOrders}</div>
                  <div className={ZoraCustomerProfileStyle.statValue}>{customerProfile.totalOrders}</div>
                </div>
                <div className={ZoraCustomerProfileStyle.statItem}>
                  <div className={ZoraCustomerProfileStyle.statLabel}>{pt.statistics.order.completed}</div>
                  <div className={ZoraCustomerProfileStyle.statValue}>{customerProfile.completedOrders}</div>
                </div>
                <div className={ZoraCustomerProfileStyle.statItem}>
                  <div className={ZoraCustomerProfileStyle.statLabel}>{pt.statistics.order.cancelled}</div>
                  <div className={ZoraCustomerProfileStyle.statValue}>{customerProfile.cancelledOrders}</div>
                </div>
                <div className={ZoraCustomerProfileStyle.statItem}>
                  <div className={ZoraCustomerProfileStyle.statLabel}>{pt.statistics.order.refunded}</div>
                  <div className={ZoraCustomerProfileStyle.statValue}>{customerProfile.refundedOrders}</div>
                </div>
                <div className={ZoraCustomerProfileStyle.statItem}>
                  <div className={ZoraCustomerProfileStyle.statLabel}>{pt.statistics.order.processing}</div>
                  <div className={ZoraCustomerProfileStyle.statValue}>{customerProfile.processingOrders}</div>
                </div>
                <div className={ZoraCustomerProfileStyle.statItem}>
                  <div className={ZoraCustomerProfileStyle.statLabel}>{pt.statistics.order.shipped}</div>
                  <div className={ZoraCustomerProfileStyle.statValue}>{customerProfile.shippedOrders}</div>
                </div>
              </div>
            </div>

            {/* 消费统计 */}
            <div className={ZoraCustomerProfileStyle.detailSection}>
              <h4 className={ZoraCustomerProfileStyle.detailTitle}>{pt.statistics.spending.title}</h4>
              <div className={ZoraCustomerProfileStyle.detailItem}>
                <span className={ZoraCustomerProfileStyle.detailLabel}>{pt.statistics.spending.totalSpent}:</span>
                <span className={ZoraCustomerProfileStyle.detailValue}>
                  {formatCurrency(customerProfile.totalSpent, customerProfile.currencyCode)}
                </span>
              </div>
              <div className={ZoraCustomerProfileStyle.detailItem}>
                <span className={ZoraCustomerProfileStyle.detailLabel}>{pt.statistics.spending.averageOrderValue}:</span>
                <span className={ZoraCustomerProfileStyle.detailValue}>
                  {formatCurrency(customerProfile.averageOrderValue, customerProfile.currencyCode)}
                </span>
              </div>
              {customerProfile.firstOrderDate && (
                <div className={ZoraCustomerProfileStyle.detailItem}>
                  <span className={ZoraCustomerProfileStyle.detailLabel}>{pt.statistics.spending.firstOrder}:</span>
                  <span className={ZoraCustomerProfileStyle.detailValue}>{formatDate(customerProfile.firstOrderDate)}</span>
                </div>
              )}
              {customerProfile.lastOrderDate && (
                <div className={ZoraCustomerProfileStyle.detailItem}>
                  <span className={ZoraCustomerProfileStyle.detailLabel}>{pt.statistics.spending.lastOrder}:</span>
                  <span className={ZoraCustomerProfileStyle.detailValue}>{formatDate(customerProfile.lastOrderDate)}</span>
                </div>
              )}
              <div className={ZoraCustomerProfileStyle.detailItem}>
                <span className={ZoraCustomerProfileStyle.detailLabel}>{pt.statistics.spending.daysSinceLastOrder}:</span>
                <span className={ZoraCustomerProfileStyle.detailValue}>{customerProfile.daysSinceLastOrder} {pt.statistics.spending.days}</span>
              </div>
              {customerProfile.averageDaysBetweenOrders > 0 && (
                <div className={ZoraCustomerProfileStyle.detailItem}>
                  <span className={ZoraCustomerProfileStyle.detailLabel}>{pt.statistics.spending.avgDaysBetweenOrders}:</span>
                  <span className={ZoraCustomerProfileStyle.detailValue}>{Math.round(customerProfile.averageDaysBetweenOrders)} {pt.statistics.spending.days}</span>
                </div>
              )}
            </div>

            {/* 商品偏好 */}
            {customerProfile.topCategories.length > 0 && (
              <div className={ZoraCustomerProfileStyle.detailSection}>
                <h4 className={ZoraCustomerProfileStyle.detailTitle}>{pt.statistics.preferences.title}</h4>
                <div className={ZoraCustomerProfileStyle.categoriesList}>
                  {customerProfile.topCategories.map((category, index) => (
                    <div key={index} className={ZoraCustomerProfileStyle.categoryItem}>
                      <span className={ZoraCustomerProfileStyle.categoryName}>{category.category}</span>
                      <span className={ZoraCustomerProfileStyle.categoryCount}>{category.count} {pt.statistics.preferences.items}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 热门商品 */}
            {customerProfile.topProducts.length > 0 && (
              <div className={ZoraCustomerProfileStyle.detailSection}>
                <h4 className={ZoraCustomerProfileStyle.detailTitle}>{pt.statistics.topProducts.title}</h4>
                <div className={ZoraCustomerProfileStyle.productsList}>
                  {customerProfile.topProducts.map((product, index) => (
                    <div key={index} className={ZoraCustomerProfileStyle.productItem}>
                      <div className={ZoraCustomerProfileStyle.productTitle}>{product.title}</div>
                      <div className={ZoraCustomerProfileStyle.productStats}>
                        <span>{product.count} {pt.statistics.topProducts.orders}</span>
                        <span>{formatCurrency(product.totalSpent, customerProfile.currencyCode)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 最近订单 */}
            {customerProfile.recentOrders.length > 0 && (
              <div className={ZoraCustomerProfileStyle.detailSection}>
                <h4 className={ZoraCustomerProfileStyle.detailTitle}>{pt.statistics.recentOrders.title}</h4>
                <div className={ZoraCustomerProfileStyle.ordersList}>
                  {customerProfile.recentOrders.map((order, index) => (
                    <div key={index} className={ZoraCustomerProfileStyle.orderItem}>
                      <div className={ZoraCustomerProfileStyle.orderHeader}>
                        <span className={ZoraCustomerProfileStyle.orderName}>{order.name}</span>
                        <span className={`${ZoraCustomerProfileStyle.orderStatus} ${getOrderStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className={ZoraCustomerProfileStyle.orderDetails}>
                        <span>{formatDate(order.createdAt)}</span>
                        <span>{order.itemCount} {pt.statistics.recentOrders.items}</span>
                        <span>{formatCurrency(order.totalPrice, customerProfile.currencyCode)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 快捷操作 */}
          <div className={ZoraCustomerProfileStyle.quickActions}>
            <button className={ZoraCustomerProfileStyle.actionButton}>
              {pt.actions.viewOrderHistory}
            </button>
            <button className={ZoraCustomerProfileStyle.actionButton}>
              {pt.actions.sendProductRecommendation}
            </button>
            <button className={ZoraCustomerProfileStyle.actionButton}>
              {pt.actions.createTicket}
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
