import type {PrismaClient} from "@prisma/client";

// 客户画像数据结构
export interface CustomerProfile {
  // 基础信息
  customerId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  customerImage?: string;
  customerSince?: Date;

  // 订单统计
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  processingOrders: number;
  shippedOrders: number;

  // 消费统计
  totalSpent: number;
  averageOrderValue: number;
  currencyCode: string;

  // 购买行为
  firstOrderDate?: Date;
  lastOrderDate?: Date;
  daysSinceLastOrder: number;
  averageDaysBetweenOrders: number;

  // 商品偏好
  topCategories: Array<{category: string, count: number}>;
  topProducts: Array<{productId: string, title: string, count: number, totalSpent: number}>;

  // 地理偏好
  topShippingLocations: Array<{city: string, province: string, country: string, count: number}>;

  // 客户标签
  tags: string[];

  // 客户价值评分
  valueScore: number; // 0-100
  loyaltyScore: number; // 0-100
  engagementScore: number; // 0-100

  // 最近订单
  recentOrders: Array<{
    id: string;
    name: string;
    status: string;
    totalPrice: number;
    createdAt: Date;
    itemCount: number;
  }>;
}

/**
 * 生成客户画像
 * @param prisma Prisma客户端实例
 * @param customerId 客户ID
 * @returns 客户画像数据
 */
export async function generateCustomerProfile(
  prisma: PrismaClient,
  customerId: string
): Promise<CustomerProfile | null> {
  try {
    // 获取客户信息
    const customer = await prisma.customers.findUnique({
      where: { id: BigInt(customerId) },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        image_url: true,
        created_at: true,
        total_amount_spent: true,
        number_of_orders: true,
        currency_code: true,
        Order: {
          select: {
            id: true,
            name: true,
            status: true,
            totalPrice: true,
            currencyCode: true,
            createdAt: true,
            processedAt: true,
            returnStatus: true,
            lineItems: {
              select: {
                id: true,
                title: true,
                quantity: true,
                sku: true,
                price: true,
                originalUnitPrice: true,
              }
            },
            shippingAddress: {
              select: {
                city: true,
                province: true,
                country: true,
              }
            }
          }
        }
      }
    });

    if (!customer) {
      return null;
    }

    // 获取订单数据
    const orders = customer.Order;
    const totalOrders = orders.length;

    // 按状态分类订单
    const completedOrders = orders.filter(o => o.status === 'COMPLETED').length;
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
    const refundedOrders = orders.filter(o => o.returnStatus !== 'NO_RETURN').length;
    const processingOrders = orders.filter(o => o.status === 'PROCESSING').length;
    const shippedOrders = orders.filter(o => o.status === 'SHIPPED').length;

    // 计算总消费和平均订单价值
    const totalSpent = parseFloat(customer.total_amount_spent || '0');
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // 计算首次和最近订单日期
    const sortedOrders = [...orders].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const firstOrderDate = sortedOrders[0]?.createdAt;
    const lastOrderDate = sortedOrders[sortedOrders.length - 1]?.createdAt;

    // 计算距离上次订单的天数
    const daysSinceLastOrder = lastOrderDate
      ? Math.floor((new Date().getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // 计算平均订单间隔天数
    let averageDaysBetweenOrders = 0;
    if (sortedOrders.length > 1) {
      const daysBetweenOrders: number[] = [];
      for (let i = 1; i < sortedOrders.length; i++) {
        const days = Math.floor(
          (new Date(sortedOrders[i].createdAt).getTime() - new Date(sortedOrders[i-1].createdAt).getTime())
          / (1000 * 60 * 60 * 24)
        );
        daysBetweenOrders.push(days);
      }
      averageDaysBetweenOrders = daysBetweenOrders.reduce((sum, days) => sum + days, 0) / daysBetweenOrders.length;
    }

    // 分析商品偏好
    const productCounts = new Map<string, {title: string, count: number, totalSpent: number}>();
    const categoryCounts = new Map<string, number>();

    orders.forEach(order => {
      order.lineItems.forEach(item => {
        // 统计商品购买次数和总消费
        const productId = item.sku || item.id;
        const current = productCounts.get(productId) || {title: item.title, count: 0, totalSpent: 0};
        productCounts.set(productId, {
          title: current.title,
          count: current.count + item.quantity,
          totalSpent: current.totalSpent + (Number(item.price) * item.quantity)
        });

        // 简单的商品分类逻辑（可以根据实际需求调整）
        const category = categorizeProduct(item.title);
        const categoryCount = categoryCounts.get(category) || 0;
        categoryCounts.set(category, categoryCount + item.quantity);
      });
    });

    // 获取热门商品
    const topProducts = Array.from(productCounts.entries())
      .map(([productId, data]) => ({productId, title: data.title, count: data.count, totalSpent: data.totalSpent}))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 获取热门分类
    const topCategories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({category, count}))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 分析地理偏好
    const locationCounts = new Map<string, {city: string, province: string, country: string, count: number}>();

    orders.forEach(order => {
      if (order.shippingAddress) {
        const key = `${order.shippingAddress.city}-${order.shippingAddress.province}-${order.shippingAddress.country}`;
        const current = locationCounts.get(key) || {
          city: order.shippingAddress.city,
          province: order.shippingAddress.province,
          country: order.shippingAddress.country,
          count: 0
        };
        locationCounts.set(key, {...current, count: current.count + 1});
      }
    });

    // 获取热门收货地址
    const topShippingLocations = Array.from(locationCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 生成客户标签
    const tags = generateCustomerTags({
      totalOrders,
      totalSpent,
      averageOrderValue,
      daysSinceLastOrder,
      averageDaysBetweenOrders,
      completedOrders,
      cancelledOrders,
      refundedOrders
    });

    // 计算客户价值评分
    const valueScore = calculateValueScore({
      totalSpent,
      averageOrderValue,
      totalOrders
    });

    // 计算客户忠诚度评分
    const loyaltyScore = calculateLoyaltyScore({
      totalOrders,
      averageDaysBetweenOrders,
      daysSinceLastOrder,
      completedOrders,
      cancelledOrders
    });

    // 计算客户活跃度评分
    const engagementScore = calculateEngagementScore({
      totalOrders,
      daysSinceLastOrder,
      averageDaysBetweenOrders,
      totalSpent
    });

    // 获取最近订单
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(order => ({
        id: order.id,
        name: order.name,
        status: order.status,
        totalPrice: Number(order.totalPrice),
        createdAt: order.createdAt,
        itemCount: order.lineItems.reduce((sum, item) => sum + item.quantity, 0)
      }));

    return {
      customerId: customer.id.toString(),
      customerEmail: customer.email,
      customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
      customerPhone: customer.phone || undefined,
      customerImage: customer.image_url || undefined,
      customerSince: customer.created_at || undefined,

      totalOrders,
      completedOrders,
      cancelledOrders,
      refundedOrders,
      processingOrders,
      shippedOrders,

      totalSpent,
      averageOrderValue,
      currencyCode: customer.currency_code,

      firstOrderDate,
      lastOrderDate,
      daysSinceLastOrder,
      averageDaysBetweenOrders,

      topCategories,
      topProducts,
      topShippingLocations,

      tags,

      valueScore,
      loyaltyScore,
      engagementScore,

      recentOrders
    };
  } catch (error) {
    console.error('Error generating customer profile:', error);
    return null;
  }
}

/**
 * 根据商品标题分类商品
 * @param title 商品标题
 * @returns 商品分类
 */
function categorizeProduct(title: string): string {
  // 花店商品分类逻辑
  const lowerTitle = title.toLowerCase();

  // 鲜花类
  if (lowerTitle.includes('rose') || lowerTitle.includes('roses') || lowerTitle.includes('玫瑰')) {
    return '玫瑰花';
  } else if (lowerTitle.includes('lily') || lowerTitle.includes('lilies') || lowerTitle.includes('百合')) {
    return '百合花';
  } else if (lowerTitle.includes('tulip') || lowerTitle.includes('tulips') || lowerTitle.includes('郁金香')) {
    return '郁金香';
  } else if (lowerTitle.includes('carnation') || lowerTitle.includes('carnations') || lowerTitle.includes('康乃馨')) {
    return '康乃馨';
  } else if (lowerTitle.includes('sunflower') || lowerTitle.includes('sunflowers') || lowerTitle.includes('向日葵')) {
    return '向日葵';
  } else if (lowerTitle.includes('orchid') || lowerTitle.includes('orchids') || lowerTitle.includes('兰花')) {
    return '兰花';
  } else if (lowerTitle.includes('hydrangea') || lowerTitle.includes('绣球')) {
    return '绣球花';
  } else if (lowerTitle.includes('daisy') || lowerTitle.includes('daisies') || lowerTitle.includes('雏菊')) {
    return '雏菊';
  } else if (lowerTitle.includes('chrysanthemum') || lowerTitle.includes('菊花')) {
    return '菊花';
  } else if (lowerTitle.includes('peony') || lowerTitle.includes('peonies') || lowerTitle.includes('牡丹')) {
    return '牡丹';
  } else if (lowerTitle.includes('lavender') || lowerTitle.includes('薰衣草')) {
    return '薰衣草';
  } else if (lowerTitle.includes('peach') || lowerTitle.includes('桃花')) {
    return '桃花';
  } else if (lowerTitle.includes('cherry') || lowerTitle.includes('樱花')) {
    return '樱花';
  } else if (lowerTitle.includes('flower') || lowerTitle.includes('flowers') || lowerTitle.includes('花') || lowerTitle.includes('鲜花')) {
    return '鲜花';
  }

  // 花束类
  if (lowerTitle.includes('bouquet') || lowerTitle.includes('花束')) {
    return '花束';
  } else if (lowerTitle.includes('bridal bouquet') || lowerTitle.includes('新娘花束')) {
    return '新娘花束';
  } else if (lowerTitle.includes('hand tied') || lowerTitle.includes('手捧花')) {
    return '手捧花';
  }

  // 花篮类
  if (lowerTitle.includes('basket') || lowerTitle.includes('花篮')) {
    return '花篮';
  } else if (lowerTitle.includes('fruit basket') || lowerTitle.includes('果篮')) {
    return '果篮';
  }

  // 花盒类
  if (lowerTitle.includes('box') || lowerTitle.includes('花盒')) {
    return '花盒';
  } else if (lowerTitle.includes('gift box') || lowerTitle.includes('礼盒')) {
    return '礼盒';
  }

  // 花瓶类
  if (lowerTitle.includes('vase') || lowerTitle.includes('花瓶')) {
    return '花瓶';
  }

  // 植物类
  if (lowerTitle.includes('plant') || lowerTitle.includes('plants') || lowerTitle.includes('植物')) {
    return '植物';
  } else if (lowerTitle.includes('succulent') || lowerTitle.includes('多肉')) {
    return '多肉植物';
  } else if (lowerTitle.includes('cactus') || lowerTitle.includes('仙人掌')) {
    return '仙人掌';
  } else if (lowerTitle.includes('fern') || lowerTitle.includes('蕨类')) {
    return '蕨类植物';
  } else if (lowerTitle.includes('bamboo') || lowerTitle.includes('竹')) {
    return '竹类植物';
  } else if (lowerTitle.includes('bonsai') || lowerTitle.includes('盆景')) {
    return '盆景';
  }

  // 节日主题类
  if (lowerTitle.includes('valentine') || lowerTitle.includes('情人节')) {
    return '情人节主题';
  } else if (lowerTitle.includes('mother') || lowerTitle.includes('母亲节')) {
    return '母亲节主题';
  } else if (lowerTitle.includes('christmas') || lowerTitle.includes('圣诞节')) {
    return '圣诞节主题';
  } else if (lowerTitle.includes('wedding') || lowerTitle.includes('婚礼')) {
    return '婚礼主题';
  } else if (lowerTitle.includes('birthday') || lowerTitle.includes('生日')) {
    return '生日主题';
  } else if (lowerTitle.includes('anniversary') || lowerTitle.includes('周年')) {
    return '周年主题';
  } else if (lowerTitle.includes('graduation') || lowerTitle.includes('毕业')) {
    return '毕业主题';
  } else if (lowerTitle.includes('teacher') || lowerTitle.includes('教师节')) {
    return '教师节主题';
  }

  // 配件类
  if (lowerTitle.includes('ribbon') || lowerTitle.includes('丝带')) {
    return '丝带';
  } else if (lowerTitle.includes('wrapper') || lowerTitle.includes('包装')) {
    return '包装材料';
  } else if (lowerTitle.includes('card') || lowerTitle.includes('贺卡')) {
    return '贺卡';
  }

  return '其他';
}

/**
 * 生成客户标签
 * @param params 客户行为参数
 * @returns 客户标签数组
 */
function generateCustomerTags(params: {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  daysSinceLastOrder: number;
  averageDaysBetweenOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
}): string[] {
  const tags: string[] = [];

  // 基于订单数量的标签
  if (params.totalOrders === 0) {
    tags.push('新客户');
  } else if (params.totalOrders >= 1 && params.totalOrders <= 3) {
    tags.push('初期客户');
  } else if (params.totalOrders >= 4 && params.totalOrders <= 10) {
    tags.push('中期客户');
  } else if (params.totalOrders > 10) {
    tags.push('忠实客户');
  }

  // 基于消费金额的标签
  if (params.totalSpent >= 1000) {
    tags.push('高价值客户');
  } else if (params.totalSpent >= 500) {
    tags.push('中高价值客户');
  } else if (params.totalSpent >= 200) {
    tags.push('中等价值客户');
  } else if (params.totalSpent > 0) {
    tags.push('低价值客户');
  }

  // 基于平均订单价值的标签
  if (params.averageOrderValue >= 200) {
    tags.push('高客单价客户');
  } else if (params.averageOrderValue >= 100) {
    tags.push('中高客单价客户');
  } else if (params.averageOrderValue >= 50) {
    tags.push('中等客单价客户');
  } else if (params.averageOrderValue > 0) {
    tags.push('低客单价客户');
  }

  // 基于最近购买时间的标签
  if (params.daysSinceLastOrder <= 30) {
    tags.push('活跃客户');
  } else if (params.daysSinceLastOrder <= 90) {
    tags.push('近期活跃客户');
  } else if (params.daysSinceLastOrder <= 180) {
    tags.push('流失风险客户');
  } else if (params.totalOrders > 0) {
    tags.push('流失客户');
  }

  // 基于订单完成率的标签
  const completionRate = params.totalOrders > 0 ? params.completedOrders / params.totalOrders : 0;
  if (completionRate >= 0.8) {
    tags.push('高完成率客户');
  } else if (completionRate >= 0.5) {
    tags.push('中等完成率客户');
  } else if (params.totalOrders > 0) {
    tags.push('低完成率客户');
  }

  // 基于退货率的标签
  const refundRate = params.totalOrders > 0 ? params.refundedOrders / params.totalOrders : 0;
  if (refundRate > 0.3) {
    tags.push('高退货率客户');
  } else if (refundRate > 0.1) {
    tags.push('中高退货率客户');
  } else if (refundRate > 0) {
    tags.push('有退货记录客户');
  }

  // 基于订单频率的标签
  if (params.averageDaysBetweenOrders > 0 && params.averageDaysBetweenOrders <= 30) {
    tags.push('高频购买客户');
  } else if (params.averageDaysBetweenOrders > 30 && params.averageDaysBetweenOrders <= 90) {
    tags.push('中频购买客户');
  } else if (params.averageDaysBetweenOrders > 90) {
    tags.push('低频购买客户');
  }

  return tags;
}

/**
 * 计算客户价值评分
 * @param params 客户价值参数
 * @returns 价值评分 (0-100)
 */
function calculateValueScore(params: {
  totalSpent: number;
  averageOrderValue: number;
  totalOrders: number;
}): number {
  // 总消费评分 (0-40分)
  const totalSpentScore = Math.min(params.totalSpent / 25, 40);

  // 平均订单价值评分 (0-30分)
  const avgOrderValueScore = Math.min(params.averageOrderValue / 10, 30);

  // 订单数量评分 (0-30分)
  const orderCountScore = Math.min(params.totalOrders * 3, 30);

  return Math.round(totalSpentScore + avgOrderValueScore + orderCountScore);
}

/**
 * 计算客户忠诚度评分
 * @param params 客户忠诚度参数
 * @returns 忠诚度评分 (0-100)
 */
function calculateLoyaltyScore(params: {
  totalOrders: number;
  averageDaysBetweenOrders: number;
  daysSinceLastOrder: number;
  completedOrders: number;
  cancelledOrders: number;
}): number {
  // 订单数量评分 (0-30分)
  const orderCountScore = Math.min(params.totalOrders * 3, 30);

  // 订单频率评分 (0-30分)
  let frequencyScore = 0;
  if (params.averageDaysBetweenOrders > 0) {
    frequencyScore = Math.min(90 / params.averageDaysBetweenOrders * 10, 30);
  }

  // 最近活跃度评分 (0-20分)
  let recencyScore = 0;
  if (params.daysSinceLastOrder <= 30) {
    recencyScore = 20;
  } else if (params.daysSinceLastOrder <= 90) {
    recencyScore = 15;
  } else if (params.daysSinceLastOrder <= 180) {
    recencyScore = 10;
  } else if (params.totalOrders > 0) {
    recencyScore = 5;
  }

  // 订单完成率评分 (0-20分)
  const completionRate = params.totalOrders > 0 ? params.completedOrders / params.totalOrders : 0;
  const completionRateScore = completionRate * 20;

  return Math.round(orderCountScore + frequencyScore + recencyScore + completionRateScore);
}

/**
 * 计算客户活跃度评分
 * @param params 客户活跃度参数
 * @returns 活跃度评分 (0-100)
 */
function calculateEngagementScore(params: {
  totalOrders: number;
  daysSinceLastOrder: number;
  averageDaysBetweenOrders: number;
  totalSpent: number;
}): number {
  // 订单数量评分 (0-30分)
  const orderCountScore = Math.min(params.totalOrders * 3, 30);

  // 最近购买时间评分 (0-30分)
  let recencyScore = 0;
  if (params.daysSinceLastOrder <= 7) {
    recencyScore = 30;
  } else if (params.daysSinceLastOrder <= 30) {
    recencyScore = 25;
  } else if (params.daysSinceLastOrder <= 90) {
    recencyScore = 15;
  } else if (params.daysSinceLastOrder <= 180) {
    recencyScore = 10;
  } else if (params.totalOrders > 0) {
    recencyScore = 5;
  }

  // 订单频率评分 (0-20分)
  let frequencyScore = 0;
  if (params.averageDaysBetweenOrders > 0) {
    frequencyScore = Math.min(90 / params.averageDaysBetweenOrders * 10, 20);
  }

  // 消费金额评分 (0-20分)
  const spendingScore = Math.min(params.totalSpent / 50, 20);

  return Math.round(orderCountScore + recencyScore + frequencyScore + spendingScore);
}
