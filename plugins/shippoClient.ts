import { ShippoService } from './shippo.ts';

/**
 * Shippo 客户端管理器
 * 管理全局唯一的 Shippo 实例
 */
class ShippoClientManager {
  private static instance: ShippoClientManager;
  private shippoService: ShippoService | null = null;

  private constructor() {}

  /**
   * 获取 ShippoClientManager 单例实例
   */
  static getInstance(): ShippoClientManager {
    if (!ShippoClientManager.instance) {
      ShippoClientManager.instance = new ShippoClientManager();
    }
    return ShippoClientManager.instance;
  }

  /**
   * 初始化 Shippo 服务
   * @param apiKey Shippo API Key
   */
  initialize(apiKey: string): void {
    if (!this.shippoService) {
      this.shippoService = new ShippoService({ apiKey });
    }
  }

  /**
   * 获取 Shippo 服务实例
   * @returns ShippoService 实例
   * @throws 如果 Shippo 服务未初始化
   */
  getShippoService(): ShippoService {
    if (!this.shippoService) {
      throw new Error('Shippo service not initialized. Please call initialize() first.');
    }
    return this.shippoService;
  }

  /**
   * 检查 Shippo 服务是否已初始化
   */
  isInitialized(): boolean {
    return this.shippoService !== null;
  }
}

// 导出单例实例
export const shippoClientManager = ShippoClientManager.getInstance();
