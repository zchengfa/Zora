import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// 精简配置接口
interface ZoraRequestConfig extends AxiosRequestConfig {
  retryCount?: number;
  retryDelay?: number;
}

const baseURL = "http://localhost:8080";
const timeout = 10000;

const instance = axios.create({
  baseURL,
  timeout,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 请求拦截器
instance.interceptors.request.use(function (config: AxiosRequestConfig) {
  // 添加认证token
  const token = localStorage.getItem('zora_auth_token');
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }

  console.log(`🛍️ 发送请求: ${config.method?.toUpperCase()} ${config.url}`);
  return config;
}, (err: AxiosError) => {
  console.error('❌ 请求错误:', err);
  return Promise.reject(err);
});

// 响应拦截器
instance.interceptors.response.use((response: AxiosResponse) => {
  console.log(`✅ 请求成功: ${response.config.url}`);

  // 统一响应格式处理
  if (response.data && response.data.success !== undefined) {
    if (response.data.success) {
      return response.data.data || response.data;
    } else {
      const errorMsg = response.data.message || '请求失败';
      return Promise.reject(new Error(errorMsg));
    }
  }

  return response.data;
}, async (err: AxiosError) => {
  const config = err.config as ZoraRequestConfig;

  if (!config) {
    return Promise.reject(err);
  }

  // 重试机制
  config.retryCount = config.retryCount || 0;
  const maxRetry = config.retryCount ?? 2;
  const retryDelay = config.retryDelay ?? 1000;

  if (err.code === 'ECONNABORTED' || !err.response) {
    if (config.retryCount! < maxRetry) {
      config.retryCount!++;
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return instance(config);
    }
  }

  // 错误处理
  let errorMessage = '网络错误';

  if (err.response) {
    const status = err.response.status;
    switch (status) {
      case 401:
        errorMessage = '未授权';
        break;
      case 404:
        errorMessage = '资源不存在';
        break;
      case 500:
        errorMessage = '服务器错误';
        break;
      default:
        errorMessage = `请求失败: ${status}`;
    }
  }

  console.error('❌ 响应错误:', errorMessage);
  return Promise.reject(new Error(errorMessage));
});

// 导出请求方法
export const Get = (config: ZoraRequestConfig) => instance({ ...config, method: 'GET' });
export const Post = (config: ZoraRequestConfig) => instance({ ...config, method: 'POST' });
export const Put = (config: ZoraRequestConfig) => instance({ ...config, method: 'PUT' });
export const Delete = (config: ZoraRequestConfig) => instance({ ...config, method: 'DELETE' });

export default instance;
