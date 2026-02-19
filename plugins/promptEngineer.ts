
/**
 * 提示词工程模块
 * 用于在将用户问题发送给AI之前进行包装和优化
 */

/**
 * 会话模板类型
 */
export type SessionTemplate = 'default' | 'creative' | 'analytical' | 'technical' | 'conversational';

/**
 * 语气类别类型
 */
export type ToneType = 'professional' | 'friendly' | 'formal' | 'casual' | 'humorous' | 'empathetic';

/**
 * 提示词工程选项
 */
export interface PromptEngineerOptions {
  template?: SessionTemplate; // 会话模板
  tone?: ToneType; // 语气类别
}

/**
 * 会话模板配置
 */
interface SessionTemplateConfig {
  systemPrompt: string;
}

/**
 * 语气配置
 */
interface ToneConfig {
  toneDescription: string;
}

/**
 * 各种会话模板的配置
 */
const SESSION_TEMPLATES: Record<SessionTemplate, SessionTemplateConfig> = {
  default: {
    systemPrompt: '你是一个专业的跨境电商客服助手，能够准确理解客户的购物咨询并提供有用的回答。你熟悉跨境电商的购物流程、国际订单管理、跨境物流、关税、支付方式、售后服务等业务。'
  },
  creative: {
    systemPrompt: '你是一个富有创意的跨境电商客服助手，擅长为客户提供创新的跨境购物建议和独特的国际商品推荐。请用富有想象力的方式帮助客户发现全球优质商品。'
  },
  analytical: {
    systemPrompt: '你是一个分析型跨境电商客服助手，擅长分析客户的跨境购物需求和全球市场趋势。请提供深入的国际商品分析和有条理的跨境购物建议。'
  },
  technical: {
    systemPrompt: '你是一个跨境电商技术支持专家，精通跨境电商平台的技术问题，包括国际订单系统、跨境支付、多币种结算、国际物流跟踪等技术支持。请提供准确、实用的技术解决方案。'
  },
  conversational: {
    systemPrompt: '你是一个友好的跨境电商客服助手，能够进行自然、流畅的对话，帮助客户解决跨境购物过程中的各种问题。'
  }
};

/**
 * 通用限制条件
 */
const GENERAL_CONSTRAINTS = '\n\n重要提示：如果你不知道如何回答客户的问题，或者不确定答案的准确性，请直接告诉客户你不知道或不确定，不要编造或猜测答案。对于涉及关税、法规、国际物流等可能因国家和地区而异的问题，请特别谨慎，建议客户咨询当地相关部门或联系人工客服获取准确信息。请诚实地表达你的局限性。';

/**
 * 各种语气类别的配置
 */
const TONE_CONFIGS: Record<ToneType, ToneConfig> = {
  professional: {
    toneDescription: '请使用专业、客观的语气，表达清晰、准确，避免过于随意的表达。在处理跨境订单、国际物流、关税等售后问题时，保持专业态度。'
  },
  friendly: {
    toneDescription: '请使用友好、亲切的语气，表达温暖、热情，让客户感到舒适。在推荐国际商品、解答跨境购物疑问时，保持友好的服务态度。'
  },
  formal: {
    toneDescription: '请使用正式、礼貌的语气，表达严谨、规范，符合商务沟通的标准。在处理重要国际订单、跨境投诉问题时，使用正式语气。'
  },
  casual: {
    toneDescription: '请使用轻松、随意的语气，表达自然、亲切，像朋友一样交流。在与老客户沟通、日常跨境购物咨询时，可以使用轻松语气。'
  },
  humorous: {
    toneDescription: '请使用幽默、风趣的语气，在适当的时候加入幽默元素，让对话更有趣。在推荐国际商品、活跃气氛时，可以适当使用幽默语气。'
  },
  empathetic: {
    toneDescription: '请使用共情、理解的语气，表达关怀、体贴，能够理解客户的情感和需求。在处理跨境客户投诉、国际退换货等问题时，使用共情语气。'
  }
};

/**
 * 构建系统提示词
 * @param options 提示词工程选项
 * @returns 系统提示词
 */
function buildSystemPrompt(options: PromptEngineerOptions): string {
  const template = SESSION_TEMPLATES[options.template || 'default'];
  let systemPrompt = template.systemPrompt;

  // 添加语气设置
  if (options.tone) {
    const toneConfig = TONE_CONFIGS[options.tone];
    systemPrompt += `\n\n${toneConfig.toneDescription}`;
  }

  // 添加通用限制条件
  systemPrompt += GENERAL_CONSTRAINTS;

  return systemPrompt;
}

/**
 * 应用提示词工程
 * @param userPrompt 用户原始提示词
 * @param options 提示词工程选项
 * @returns 包含系统提示词和用户提示词的对象
 */
export function applyPromptEngineering(
  userPrompt: string,
  options: PromptEngineerOptions = {}
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: buildSystemPrompt(options),
    userPrompt: userPrompt
  };
}
