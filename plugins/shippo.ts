import {Shippo} from 'shippo';
import {beginLogger} from './bullTaskQueue.ts';

/**
 * Shippo API 配置接口
 */
interface ShippoConfig {
  apiKey: string; // Shippo API Token
  apiVersion?: string; // API 版本，默认为 'v1'
}

/**
 * 地址信息接口
 */
export interface Address {
  name: string; // 收件人姓名
  company?: string; // 公司名称（可选）
  street1: string; // 街道地址
  street2?: string; // 街道地址2（可选）
  city: string; // 城市
  state: string; // 州/省
  zip: string; // 邮编
  country: string; // 国家代码，如 'US', 'CN'
  phone?: string; // 电话号码（可选）
  email?: string; // 邮箱（可选）
  isResidential?: boolean; // 是否为住宅地址
  validate?: boolean; // 是否验证地址
}

/**
 * 包裹信息接口
 */
export interface Parcel {
  length: string; // 长度（英寸）
  width: string; // 宽度（英寸）
  height: string; // 高度（英寸）
  distance_unit: string; // 距离单位，如 'in', 'cm'
  weight: string; // 重量（磅）
  mass_unit: string; // 重量单位，如 'lb', 'kg'
}

/**
 * 运单创建参数接口
 */
export interface ShipmentParams {
  addressFrom: Address; // 发件人地址
  addressTo: Address; // 收件人地址
  parcels: Parcel[]; // 包裹列表
  async?: boolean; // 是否异步处理
}

/**
 * 运单响应接口
 */
export interface ShipmentResponse {
  objectId: string;
  objectOwner: string;
  status: string;
  addressFrom: Address;
  addressTo: Address;
  parcels: Parcel[];
  rates: Rate[];
  carrierAccounts: string[];
  metadata: string;
  test: boolean;
}

/**
 * 运费信息接口
 */
export interface Rate {
  objectId: string;
  objectCreated: string;
  objectUpdated: string;
  objectOwnerId: string;
  provider: string;
  servicelevelName: string;
  servicelevelToken: string;
  carrier: string;
  durationTerms: string;
  amount: string;
  currency: string;
  estimatedDays: number;
  attributes: string[];
  messages: string[];
}

/**
 * 运单标签接口
 */
export interface Label {
  objectId: string;
  objectCreated: string;
  objectUpdated: string;
  objectOwnerId: string;
  status: string;
  trackingNumber: string;
  trackingStatus: string;
  trackingUrlProvider: string;
  labelUrl: string;
  commercialInvoiceUrl: string;
  trackingHistory: TrackingEvent[];
  metadata: string;
}

/**
 * 追踪事件接口
 */
export interface TrackingEvent {
  status: string;
  statusDate: string;
  statusDetail: string;
  location: {
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

/**
 * 追踪信息接口
 */
export interface TrackingInfo {
  objectId: string;
  trackingNumber: string;
  trackingStatus: string;
  eta: string;
  originalEta: string;
  servicelevelToken: string;
  trackingHistory: TrackingEvent[];
  metadata: string;
  test: boolean;
}

type ShippoTrackingNumberTest = 'SHIPPO_PRE_TRANSIT'| 'SHIPPO_TRANSIT'| 'SHIPPO_DELIVERED'| 'SHIPPO_RETURNED'| 'SHIPPO_FAILURE' | 'SHIPPO_UNKNOWN'

/**
 * Shippo 类封装
 * 提供 Shippo API 的主要功能：生成运单、获取物流信息、追踪货物轨迹
 */
export class ShippoService {
  private shippo: any;

  constructor(config: ShippoConfig) {
    this.shippo = new Shippo({
      apiKeyHeader: config.apiKey
    });
  }

  /**
   * 创建运单
   * @param params 运单参数
   * @returns 运单响应
   */
  async createShipment(params: {
      addressFrom: { zip: any; country: any; city: any; name: any; street1: any; street2: any; state: any };
      addressTo: {
          zip: string;
          country: string;
          city: string;
          name: string;
          street1: string;
          street2: string;
          state: string
      };
      parcels: {
          distanceUnit: string;
          length: string;
          width: string;
          weight: string;
          massUnit: string;
          height: string
      }[]
  }): Promise<ShipmentResponse> {
    try {
      beginLogger({
        level: 'info',
        message: '开始创建运单',
        meta: {
          addressTo: params.addressTo,
          parcelsCount: params.parcels.length,
        }
      }).then();

      const shipment = await this.shippo.shipments.create({
        addressFrom: params.addressFrom,
        addressTo: params.addressTo,
        parcels: params.parcels,
        async: params.async || false,
      });

      beginLogger({
        level: 'info',
        message: '运单创建成功',
        meta: {
          shipmentId: shipment.objectId,
        }
      }).then();

      return shipment;
    } catch (error) {
      beginLogger({
        level: 'error',
        message: '创建运单失败',
        meta: { error }
      }).then();
      throw error;
    }
  }

  /**
   * 获取运费列表
   * @param shipmentId 运单ID
   * @returns 运费列表
   */
  async getRates(shipmentId: string): Promise<Rate[]> {
    try {
      beginLogger({
        level: 'info',
        message: '获取运费列表',
        meta: { shipmentId }
      }).then();

      // 获取运单详情，其中包含运费列表
      const shipment = await this.shippo.shipments.get(shipmentId);

      beginLogger({
        level: 'info',
        message: '获取运费列表成功',
        meta: {
          shipmentId,
          ratesCount: shipment.rates?.length || 0,
        }
      }).then();

      return shipment.rates || [];
    } catch (error) {
      beginLogger({
        level: 'error',
        message: '获取运费列表失败',
        meta: { error }
      }).then();
      throw error;
    }
  }

  /**
   * 购买运单标签
   * @param rateId 运费ID
   * @param metadata 元数据（可选）
   * @returns 运单标签
   */
  async purchaseLabel(rateId: string, metadata?: string): Promise<Label> {
    try {
      beginLogger({
        level: 'info',
        message: '购买运单标签',
        meta: { rateId }
      }).then();

      const label = await this.shippo.transactions.create({
        rate: rateId,
        label_file_type: 'PDF',
        metadata: metadata || '',
      });

      beginLogger({
        level: 'info',
        message: '购买运单标签成功',
        meta: {
          labelId: label.objectId,
          trackingNumber: label.trackingNumber,
        }
      }).then();

      return label;
    } catch (error) {
      beginLogger({
        level: 'error',
        message: '购买运单标签失败',
        meta: { error }
      }).then();
      throw error;
    }
  }

  /**
   * 获取运单标签
   * @param labelId 标签ID
   * @returns 运单标签
   */
  async getLabel(labelId: string): Promise<Label> {
    try {
      beginLogger({
        level: 'info',
        message: '获取运单标签',
        meta: { labelId }
      }).then();

      const label = await this.shippo.transaction.retrieve(labelId);

      beginLogger({
        level: 'info',
        message: '获取运单标签成功',
        meta: {  }
      }).then();

      return label;
    } catch (error) {
      beginLogger({
        level: 'error',
        message: '获取运单标签失败',
        meta: { error }
      }).then();
      throw error;
    }
  }

  /**
   * 追踪货物轨迹
   * @param trackingNumber 追踪号
   * @param carrier 承运商代码（可选）
   * @returns 追踪信息
   */
  async trackShipment(
    trackingNumber: string,
    carrier?: string
  ): Promise<TrackingInfo> {
    try {
      // 始终使用 shippo 作为承运商
      const validCarrier = 'shippo';

      beginLogger({
        level: 'info',
        message: '追踪货物轨迹',
        meta: { trackingNumber, carrier: validCarrier }
      }).then();

      const tracking = await this.shippo.trackingStatus.get(
        trackingNumber,
        validCarrier
      );

      beginLogger({
        level: 'info',
        message: '追踪货物轨迹成功',
        meta: {
          trackingStatus: tracking.tracking_status,
        }
      }).then();

      return tracking;
    } catch (error) {
      beginLogger({
        level: 'error',
        message: '追踪货物轨迹失败',
        meta: { error }
      }).then();
      throw error;
    }
  }

  /**
   * 获取所有承运商列表
   * @returns 承运商列表
   */
  async getCarriers(): Promise<any[]> {
    try {
      //获取承运商列表
      const carriers = await this.shippo.carrierAccounts.list({});

      beginLogger({
        level: 'info',
        message: '获取承运商列表成功',
        meta: {
          carriersCount: carriers.results?.length || 0,
        }
      }).then();

      // 格式化承运商列表，设置承运商可用
      return (carriers.results || []).map((carrier: any) => ({
        label: carrier.display_name || carrier.carrier || carrier.account_id,
        value: carrier.carrier || carrier.account_id,
        enabled: true // 获取的承运商都可用
      }));
    } catch (error) {
      beginLogger({
        level: 'error',
        message: '获取承运商列表失败',
        meta: { error }
      }).then();
      throw error;
    }
  }

  /**
   * 创建地址
   * @param address 地址信息
   * @returns 创建的地址
   */
  async createAddress(address: Address): Promise<Address> {
    try {
      beginLogger({
        level: 'info',
        message: '创建地址',
        meta: {
          address: `${address.street1}, ${address.city}, ${address.state} ${address.zip}`,
        }
      }).then();

      const createdAddress = await this.shippo.address.create(address);

      beginLogger({
        level: 'info',
        message: '创建地址成功',
        meta: {
          addressId: createdAddress.objectId,
        }
      }).then();

      return createdAddress;
    } catch (error) {
      beginLogger({
        level: 'error',
        message: '创建地址失败',
        meta: { error }
      }).then();
      throw error;
    }
  }

  /**
   * 验证地址
   * @param address 地址信息
   * @returns 验证后的地址
   */
  async validateAddress(address: Address): Promise<Address> {
    try {
      beginLogger({
        level: 'info',
        message: '验证地址',
        meta: {
          address: `${address.street1}, ${address.city}, ${address.state} ${address.zip}`,
        }
      }).then();

      const validatedAddress = await this.shippo.address.validate(address);

      beginLogger({
        level: 'info',
        message: '验证地址成功',
        meta: {
          isValid: validatedAddress.validationResults?.isValid || false,
        }
      }).then();

      return validatedAddress;
    } catch (error) {
      beginLogger({
        level: 'error',
        message: '验证地址失败',
        meta: { error }
      }).then();
      throw error;
    }
  }

  /**
   * 获取运单详情
   * @param shipmentId 运单ID
   * @returns 运单详情
   */
  async getShipment(shipmentId: string): Promise<ShipmentResponse> {
    return  await this.shippo.shipment.retrieve(shipmentId);
  }

  /**
   * 获取预设包裹模板
   */
  async getCarrierParcelPackages(carrier:string): Promise<any[]> {
    return await this.shippo.carrierParcelTemplates.list(undefined,carrier)
  }

  /**
   * 创建追踪单
   */
  async createTracking(trackingParams:{carrier:string,metadata:string,trackingNumber:string | ShippoTrackingNumberTest},testMode:boolean):Promise<any>{
    const paramsObj = testMode ? {
      carrier:'shippo',
      metadata:trackingParams.metadata,
      trackingNumber: trackingParams.trackingNumber || 'SHIPPO_TRANSIT'
    }
    :trackingParams
    const result = await this.shippo.trackingStatus.create({...paramsObj});

    if (testMode){
      result.tracking_url = `${process.env.SHIPPO_BASE_TRACKING_URL_TEST}${paramsObj.carrier}/${paramsObj.trackingNumber}`
    }

    return result
  }

  /**
   * 根据包裹token获取包裹模板数据
   */
  async getCarrierParcelByToken(token:string): Promise<any> {
    return await this.shippo.carrierParcelTemplates.get(token)
  }
}

// 默认导出 ShippoService 类
export default ShippoService;
