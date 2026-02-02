
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import type { PrismaClient } from '@prisma/client';
import { generateCustomerProfile } from './customerProfile.ts';
import type { IShopifyApiClient } from './shopifyUtils.ts';

/**
 * AI工具函数参数
 */
interface ToolFunctionParams {
  prisma: PrismaClient;
  shopifyApiClient?: IShopifyApiClient;
  [key: string]: any;
}

/**
 * AI工具函数返回值
 */
interface ToolFunctionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * AI工具函数类型
 */
type ToolFunction = (params: ToolFunctionParams) => Promise<ToolFunctionResult>;

/**
 * AI工具定义
 */
interface AITool {
  definition: ChatCompletionTool;
  handler: ToolFunction;
}

/**
 * 客户画像工具
 */
const customerProfileTool: AITool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_customer_profile',
      description: '获取客户的详细画像信息，包括订单统计、消费行为、商品偏好等',
      parameters: {
        type: 'object',
        properties: {
          customerId: {
            type: 'string',
            description: '客户ID'
          }
        },
        required: ['customerId']
      }
    }
  },
  handler: async ({ prisma, customerId }: ToolFunctionParams) => {
    try {
      const profile = await generateCustomerProfile(prisma, customerId);
      if (!profile) {
        return {
          success: false,
          error: '未找到该客户'
        };
      }
      return {
        success: true,
        data: profile
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取客户画像失败'
      };
    }
  }
};

/**
 * 查询订单工具
 */
const queryOrdersTool: AITool = {
  definition: {
    type: 'function',
    function: {
      name: 'query_orders',
      description: '查询订单信息，支持按客户、产品等条件查询',
      parameters: {
        type: 'object',
        properties: {
          customerId: {
            type: 'string',
            description: '客户ID（可选）'
          },
          orderId: {
            type: 'string',
            description: '订单ID（可选）'
          },
          limit: {
            type: 'number',
            description: '返回数量限制，默认10'
          }
        }
      }
    }
  },
  handler: async ({ prisma, customerId, orderId, limit = 10 }: ToolFunctionParams) => {
    try {
      const where: any = {};

      if (customerId) {
        where.customerId = BigInt(customerId);
      }

      if (orderId) {
        where.id = BigInt(orderId);
      }

      const orders = await prisma.order.findMany({
        where,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          lineItems: true,
          customer: {
            select: {
              email: true,
              first_name: true,
              last_name: true
            }
          }
        }
      });

      return {
        success: true,
        data: orders.map(order => ({
          id: order.id.toString(),
          name: order.name,
          status: order.status,
          totalPrice: Number(order.totalPrice),
          currencyCode: order.currencyCode,
          createdAt: order.createdAt,
          itemCount: order.lineItems.reduce((sum, item) => sum + item.quantity, 0),
          customerEmail: order.customer?.email
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '查询订单失败'
      };
    }
  }
};

/**
 * 查询产品工具
 */
const queryProductsTool: AITool = {
  definition: {
    type: 'function',
    function: {
      name: 'query_products',
      description: '查询产品信息，支持按产品ID、SKU等条件查询',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: '产品ID（可选）'
          },
          sku: {
            type: 'string',
            description: '产品SKU（可选）'
          },
          limit: {
            type: 'number',
            description: '返回数量限制，默认10'
          }
        }
      }
    }
  },
  handler: async ({ prisma, productId, sku, limit = 10 }: ToolFunctionParams) => {
    try {
      const where: any = {};

      if (productId) {
        where.id = BigInt(productId);
      }

      if (sku) {
        where.sku = sku;
      }

      const products = await prisma.product.findMany({
        where,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      });

      return {
        success: true,
        data: products.map(product => ({
          id: product.id.toString(),
          title: product.title,
          description: product.description,
          sku: product.sku,
          price: Number(product.price),
          createdAt: product.createdAt
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '查询产品失败'
      };
    }
  }
};

/**
 * AI工具管理器
 */
export class AIToolsManager {
  private tools: Map<string, AITool> = new Map();

  constructor() {
    // 注册默认工具
    this.registerTool(customerProfileTool);
    this.registerTool(queryOrdersTool);
    this.registerTool(queryProductsTool);
  }

  /**
   * 注册工具
   */
  registerTool(tool: AITool): void {
    const toolName = tool.definition.function.name;
    this.tools.set(toolName, tool);
  }

  /**
   * 获取所有工具定义
   */
  getToolDefinitions(): ChatCompletionTool[] {
    return Array.from(this.tools.values()).map(tool => tool.definition);
  }

  /**
   * 执行工具函数
   */
  async executeTool(
    toolName: string,
    params: ToolFunctionParams
  ): Promise<ToolFunctionResult> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `未找到工具: ${toolName}`
      };
    }

    return await tool.handler(params);
  }
}

// 导出单例
export const aiToolsManager = new AIToolsManager();
