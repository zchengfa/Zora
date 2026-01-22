export type NotificationType = 'success' | 'info' | 'warning' | 'error';

/**
 * Webhook通知处理器
 * 用于将webhook事件转换为简洁明了的通知消息
 */
export class NotificationProcessor {
  /**
   * 处理订单相关通知
   * 根据不同的订单webhook类型生成相应的通知内容
   * @param webhookType - webhook类型，如'orders/create'、'orders/updated'等
   * @param order - 订单信息对象，包含订单的各种状态信息
   * @param shop - 店铺标识
   * @returns 返回通知对象，包含通知类型、标题、消息等信息，若webhook类型不支持则返回null
   */
  static processOrderNotification(webhookType: string, order: any, shop: string) {
    // 创建基础通知对象，包含店铺信息和时间戳
    const baseNotification = {
      shop,
      timestamp: new Date().toISOString()
    };

    // 根据webhook类型处理不同的通知逻辑
    switch (webhookType) {
      // 处理新订单创建通知
      case 'orders/create':
        return {
          ...baseNotification,
          type: 'success' as NotificationType,
          title: '🎉 新订单来啦',
          message: `订单 #${order.orderNumber || order.name} 已创建，快去看看吧~`,
          duration: 5000
        };

      // 处理订单更新通知
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
   * 根据不同的webhook类型生成相应的通知消息
   * @param webhookType - web通知类型，如'customers/create'或'customers/update'
   * @param customer - 客户信息对象，包含firstName和lastName等属性
   * @param shop - 店铺标识符
   * @returns 返回一个包含通知详情的对象，如果类型不匹配则返回null
   */
  static processCustomerNotification(webhookType: string, customer: any, shop: string) {
    // 创建基础通知对象，包含店铺标识和时间戳
    const baseNotification = {
      shop,
      timestamp: new Date().toISOString()
    };

    // 根据webhook类型处理不同的通知场景
    switch (webhookType) {
      // 处理新客户创建通知
      case 'customers/create':
        return {
          ...baseNotification,  // 合并基础通知信息
          type: 'success' as NotificationType,  // 设置通知类型为成功
          title: '👋 新客户来啦',  // 设置通知标题
          message: `客户 ${customer.firstName || ''} ${customer.lastName || ''} 已注册，欢迎加入~`,  // 设置通知消息
          duration: 5000  // 设置通知显示时长(毫秒)
        };

      // 处理客户信息更新通知
      case 'customers/update':
        return {
          ...baseNotification,  // 合并基础通知信息
          type: 'info' as NotificationType,  // 设置通知类型为信息
          title: '✏️ 客户信息更新',  // 设置通知标题
          message: `客户 ${customer.firstName || ''} ${customer.lastName || ''} 信息已更新~`,  // 设置通知消息
          duration: 4000  // 设置通知显示时长(毫秒)
        };

      // 其他未知的webhook类型
      default:
        return null;
    }
  }

  /**
   * 处理产品相关通知
   * 根据不同的webhook类型生成相应的通知信息
   * @param {string} webhookType - webhook类型，如'products/create'、'products/update'、'products/delete'
   * @param {any} product - 产品对象，包含产品相关信息如title等
   * @param {string} shop - 店铺标识
   * @returns {object|null} 返回通知对象或null（当webhook类型不匹配时）
   */
  static processProductNotification(webhookType: string, product: any, shop: string): object | null {
    // 创建基础通知对象，包含店铺和时间戳
    const baseNotification = {
      shop,
      timestamp: new Date().toISOString()
    };

    // 根据webhook类型处理不同的通知场景
    switch (webhookType) {
      // 产品创建通知
      case 'products/create':
        return {
          ...baseNotification,
          type: 'success' as NotificationType,  // 通知类型：成功
          title: '🌟 新产品上架',              // 通知标题
          message: `产品 "${product.title}" 已创建，快去看看吧~`,  // 通知内容
          duration: 5000  // 通知显示时长（毫秒）
        };

      // 产品更新通知
      case 'products/update':
        return {
          ...baseNotification,
          type: 'info' as NotificationType,     // 通知类型：信息
          title: '📝 产品更新',                // 通知标题
          message: `产品 "${product.title}" 信息已更新~`,  // 通知内容
          duration: 4000  // 通知显示时长（毫秒）
        };

      // 产品删除通知
      case 'products/delete':
        return {
          ...baseNotification,
          type: 'warning' as NotificationType,   // 通知类型：警告
          title: '🗑️ 产品删除',                // 通知标题
          message: `产品 "${product.title}" 已删除~`,  // 通知内容
          duration: 5000  // 通知显示时长（毫秒）
        };

      // 默认情况，返回null
      default:
        return null;
    }
  }

  /**
   * 处理应用相关通知
   * 该静态方法根据不同的webhook类型生成相应的通知信息
   * @param webhookType - webhook类型，标识具体的通知事件
   * @param data - 通知相关的数据内容
   * @param shop - 店铺标识符
   * @returns 返回一个包含通知信息的对象，如果类型不匹配则返回null
   */
  static processAppNotification(webhookType: string, data: any, shop: string) {
    // 创建基础通知对象，包含店铺信息和时间戳
    const baseNotification = {
      shop,
      timestamp: new Date().toISOString()
    };

    // 根据不同的webhook类型处理通知
    switch (webhookType) {
      // 处理应用卸载通知
      case 'app/uninstalled':
        return {
          ...baseNotification, // 扩展基础通知对象
          type: 'warning' as NotificationType, // 设置通知类型为警告
          title: '👋 应用已卸载', // 通知标题
          message: `店铺 ${shop} 已卸载应用，期待下次合作~`, // 通知内容
          duration: 6000 // 通知持续时间（毫秒）
        };

      // 默认情况，返回null表示不处理该类型的通知
      default:
        return null;
    }
  }

  /**
   * 主处理函数：根据webhook类型分发到相应的处理器
   * 该函数根据webhookType的前缀来决定将通知分发给哪个具体的处理函数
   *
   * @param {string} webhookType - webhook的类型，用于确定处理逻辑
   * @param {any} data - webhook携带的数据内容
   * @param {string} shop - 商店标识符
   * @return {any} 返回处理结果，如果类型不匹配则返回null
   */
  static processNotification(webhookType: string, data: any, shop: string): any {
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
