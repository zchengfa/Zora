import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Shopify 专用配置接口
interface ShopifyRequestConfig extends AxiosRequestConfig {
  shopDomain: string; // 商店域名，如 'your-store.myshopify.com'
  accessToken: string; // Shopify Admin API 访问令牌
  apiVersion?: string; // API 版本，默认为 '2024-01'
  retryCount?: number;
  retryDelay?: number;
  // GraphQL 相关
  query?: string; // GraphQL 查询语句
  variables?: Record<string, any>; // GraphQL 变量
}

// Shopify API 响应格式
interface ShopifyResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: any;
  }>;
  extensions?: {
    cost?: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
}

export class ShopifyAPI {
  private defaultApiVersion = '2024-01';

  /**
   * 构建 Shopify API URL
   */
  private buildShopifyURL(config: ShopifyRequestConfig): string {
    const { shopDomain, apiVersion = this.defaultApiVersion } = config;
    const baseURL = `https://${shopDomain}/admin/api/${apiVersion}`;

    // 如果是 GraphQL 请求
    if (config.query) {
      return `${baseURL}/graphql.json`;
    }

    // REST API 请求
    return baseURL + (config.url || '');
  }

  /**
   * 构建请求配置
   */
  private buildRequestConfig(config: ShopifyRequestConfig): AxiosRequestConfig {
    const { accessToken, query, variables, ...axiosConfig } = config;

    const headers = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken, // Shopify 专用认证头
      ...axiosConfig.headers,
    };

    let data = axiosConfig.data;

    // 处理 GraphQL 请求
    if (query) {
      data = {
        query,
        variables: variables || {},
      };
    }

    return {
      ...axiosConfig,
      url: this.buildShopifyURL(config),
      headers,
      data,
    };
  }

  /**
   * 执行请求
   */
  private async request<T = any>(config: ShopifyRequestConfig): Promise<T> {
    try {
      const requestConfig = this.buildRequestConfig(config);
      console.log(`🛍️ Shopify请求: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);

      if (config.query) {
        console.log(`📊 GraphQL查询: ${config}...`);
      }

      const response = await instance(requestConfig);
      return this.handleShopifyResponse<T>(response);
    } catch (error) {
      return this.handleShopifyError(error as AxiosError);
    }
  }

  /**
   * 处理 Shopify 响应
   */
  private handleShopifyResponse<T>(response: AxiosResponse): T {
    const shopifyResponse = response.data as ShopifyResponse<T>;

    // 检查 GraphQL 错误
    if (shopifyResponse.errors && shopifyResponse.errors.length > 0) {
      if(shopifyResponse.errors[0].extensions?.code === 'ACCESS_DENIED'){
        console.log (`Shopify API权限不足,需要商店升级Shopify套餐：${shopifyResponse.errors[0].message}`)
      }
      else{
        const errorMessage = shopifyResponse.errors.map(err => err.message).join('; ');
        console.log(`Shopify API错误: ${errorMessage}`);
      }
    }

    // 检查 API 限制
    if (shopifyResponse.extensions?.cost) {
      const cost = shopifyResponse.extensions.cost;
      console.log(`📈 API成本: ${cost.actualQueryCost}/${cost.throttleStatus.maximumAvailable}`);

      // 如果剩余配额较少，给出警告
      if (cost.throttleStatus.currentlyAvailable < cost.throttleStatus.maximumAvailable * 0.1) {
        console.warn('⚠️ Shopify API 配额即将用尽，请优化查询');
      }
    }

    return shopifyResponse.data as T;
  }

  /**
   * 处理 Shopify 错误
   */
  private handleShopifyError(error: AxiosError): never {
    if (error.response) {
      const status = error.response.status;
      let errorMessage = 'Shopify API错误';

      switch (status) {
        case 401:
          errorMessage = '认证失败，请检查访问令牌';
          break;
        case 402:
          errorMessage = '商店套餐不支持此功能';
          break;
        case 403:
          errorMessage = '权限不足，请检查API权限范围';
          break;
        case 404:
          errorMessage = '资源不存在';
          break;
        case 422:
          errorMessage = '请求数据验证失败';
          break;
        case 429:
          errorMessage = 'API调用频率超限，请稍后重试';
          break;
        default:
          errorMessage = `Shopify API错误: ${status}`;
      }

      // 尝试获取 Shopify 具体的错误信息
      const shopifyError = (error.response.data as any)?.errors;
      if (shopifyError) {
        errorMessage += ` - ${JSON.stringify(shopifyError)}`;
      }

      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error('网络错误，无法连接到Shopify');
    } else {
      throw new Error(`请求配置错误: ${error.message}`);
    }
  }

  // REST API 方法
  async get<T = any>(config: Omit<ShopifyRequestConfig, 'method'>): Promise<T> {
    return this.request<T>({ ...config, method: 'GET' });
  }

  async post<T = any>(config: Omit<ShopifyRequestConfig, 'method'>): Promise<T> {
    return this.request<T>({ ...config, method: 'POST' });
  }

  async put<T = any>(config: Omit<ShopifyRequestConfig, 'method'>): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT' });
  }

  async delete<T = any>(config: Omit<ShopifyRequestConfig, 'method'>): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE' });
  }

  // GraphQL 专用方法
  async graphql<T = any>(config: Omit<ShopifyRequestConfig, 'method' | 'query'> & {
    query: string;
    variables?: Record<string, any>;
  }): Promise<T> {
    return this.request<T>({ ...config, method: 'POST' });
  }
}

// 创建基础的 axios 实例（移除了固定的 baseURL）
const instance = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 请求拦截器
instance.interceptors.request.use(function (config: AxiosRequestConfig) {
  console.log(`🛍️ 发送Shopify请求: ${config.method?.toUpperCase()} ${config.url}`);
  return config;
}, (err: AxiosError) => {
  console.error('❌ Shopify请求错误:', err);
  return Promise.reject(err);
});

// 响应拦截器 - 简化版本，主要错误处理在 ShopifyAPI 类中
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ Shopify请求成功: ${response.config.url}`);
    return response;
  },
  async (err: AxiosError) => {
    const config = err.config as AxiosRequestConfig & { retryCount?: number; retryDelay?: number };

    if (!config) {
      return Promise.reject(err);
    }

    // 重试机制（针对网络错误）
    config.retryCount = config.retryCount || 0;
    const maxRetry = config.retryCount ?? 2;
    const retryDelay = config.retryDelay ?? 1000;

    if ((err.code === 'ECONNABORTED' || !err.response) && config.retryCount! < maxRetry) {
      config.retryCount!++;
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return instance(config);
    }

    return Promise.reject(err);
  }
);

// 创建并导出 Shopify API 实例
export const shopifyAPI = new ShopifyAPI();

// 便捷方法导出
export const { get, post, put, delete: deleteRequest, graphql } = shopifyAPI;
