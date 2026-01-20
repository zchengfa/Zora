export type NotificationType = 'success' | 'info' | 'warning' | 'error';

/**
 * Webhook通知处理器
 * 用于将webhook事件转换为简洁明了的通知消息
 */
export class NotificationProcessor {
  /**
   * 处理订单相关通知
   */
  static processOrderNotification(webhookType: string, order: any, shop: string) {
    const baseNotification = {
      shop,
      timestamp: new Date().toISOString()
    };

    switch (webhookType) {
      case 'orders/create':
        return {
          ...baseNotification,
          type: 'success' as NotificationType,
          title: '🎉 新订单来啦',
          message: `订单 #${order.orderNumber || order.name} 已创建，快去看看吧~`,
          duration: 5000
        };

      case 'orders/updated':
        // 根据订单财务状态生成不同的通知
        const financialStatusMap: Record<string, { title: string; message: string }> = {
          'pending': {
            title: '⏳ 订单待处理',
            message: `订单 #${order.orderNumber || order.name} 正在等待您的处理~`
          },
          'authorized': {
            title: '✅ 订单已授权',
            message: `订单 #${order.orderNumber || order.name} 授权成功啦~`
          },
          'partially_paid': {
            title: '💰 订单部分支付',
            message: `订单 #${order.orderNumber || order.name} 已收到部分款项~`
          },
          'paid': {
            title: '🎊 订单已支付',
            message: `订单 #${order.orderNumber || order.name} 完成支付啦~`
          },
          'partially_refunded': {
            title: '↩️ 订单部分退款',
            message: `订单 #${order.orderNumber || order.name} 已部分退款~`
          },
          'refunded': {
            title: '💸 订单已退款',
            message: `订单 #${order.orderNumber || order.name} 已完成退款~`
          },
          'voided': {
            title: '🚫 订单已作废',
            message: `订单 #${order.orderNumber || order.name} 已作废~`
          }
        };

        // 根据订单履约状态生成不同的通知
        const fulfillmentStatusMap: Record<string, { title: string; message: string }> = {
          'fulfilled': {
            title: '📦 订单已履约',
            message: `订单 #${order.orderNumber || order.name} 已完成发货，期待客户收到~`
          },
          'partial': {
            title: '📦 订单部分履约',
            message: `订单 #${order.orderNumber || order.name} 部分商品已发货~`
          },
          'restocked': {
            title: '🔄 订单已重新入库',
            message: `订单 #${order.orderNumber || order.name} 商品已重新入库~`
          }
        };

        // 优先显示履约状态变化，其次显示财务状态变化
        let statusInfo;
        if (order.fulfillmentStatus && fulfillmentStatusMap[order.fulfillmentStatus]) {
          statusInfo = fulfillmentStatusMap[order.fulfillmentStatus];
        } else if (order.financialStatus && financialStatusMap[order.financialStatus]) {
          statusInfo = financialStatusMap[order.financialStatus];
        } else {
          statusInfo = {
            title: '📝 订单已更新',
            message: `订单 #${order.orderNumber || order.name} 状态已更新~`
          };
        }

        return {
          ...baseNotification,
          type: 'info' as NotificationType,
          ...statusInfo,
          duration: 5000
        };

      default:
        return null;
    }
  }

  /**
   * 处理客户相关通知
   */
  static processCustomerNotification(webhookType: string, customer: any, shop: string) {
    const baseNotification = {
      shop,
      timestamp: new Date().toISOString()
    };

    switch (webhookType) {
      case 'customers/create':
        return {
          ...baseNotification,
          type: 'success' as NotificationType,
          title: '👋 新客户来啦',
          message: `客户 ${customer.firstName || ''} ${customer.lastName || ''} 已注册，欢迎加入~`,
          duration: 5000
        };

      case 'customers/update':
        return {
          ...baseNotification,
          type: 'info' as NotificationType,
          title: '✏️ 客户信息更新',
          message: `客户 ${customer.firstName || ''} ${customer.lastName || ''} 信息已更新~`,
          duration: 4000
        };

      default:
        return null;
    }
  }

  /**
   * 处理产品相关通知
   */
  static processProductNotification(webhookType: string, product: any, shop: string) {
    const baseNotification = {
      shop,
      timestamp: new Date().toISOString()
    };

    switch (webhookType) {
      case 'products/create':
        return {
          ...baseNotification,
          type: 'success' as NotificationType,
          title: '🌟 新产品上架',
          message: `产品 "${product.title}" 已创建，快去看看吧~`,
          duration: 5000
        };

      case 'products/update':
        return {
          ...baseNotification,
          type: 'info' as NotificationType,
          title: '📝 产品更新',
          message: `产品 "${product.title}" 信息已更新~`,
          duration: 4000
        };

      case 'products/delete':
        return {
          ...baseNotification,
          type: 'warning' as NotificationType,
          title: '🗑️ 产品删除',
          message: `产品 "${product.title}" 已删除~`,
          duration: 5000
        };

      default:
        return null;
    }
  }

  /**
   * 处理应用相关通知
   */
  static processAppNotification(webhookType: string, data: any, shop: string) {
    const baseNotification = {
      shop,
      timestamp: new Date().toISOString()
    };

    switch (webhookType) {
      case 'app/uninstalled':
        return {
          ...baseNotification,
          type: 'warning' as NotificationType,
          title: '👋 应用已卸载',
          message: `店铺 ${shop} 已卸载应用，期待下次合作~`,
          duration: 6000
        };

      default:
        return null;
    }
  }

  /**
   * 主处理函数：根据webhook类型分发到相应的处理器
   */
  static processNotification(webhookType: string, data: any, shop: string) {
    // 订单相关
    if (webhookType.startsWith('orders/')) {
      return this.processOrderNotification(webhookType, data, shop);
    }

    // 客户相关
    if (webhookType.startsWith('customers/')) {
      return this.processCustomerNotification(webhookType, data, shop);
    }

    // 产品相关
    if (webhookType.startsWith('products/')) {
      return this.processProductNotification(webhookType, data, shop);
    }

    // 应用相关
    if (webhookType.startsWith('app/')) {
      return this.processAppNotification(webhookType, data, shop);
    }

    return null;
  }
}
