
# 提示词工程使用指南

## 概述

提示词工程模块专为跨境电商客服场景设计，允许您在将客户问题发送给AI之前进行包装和优化，以获得更好的AI客服响应效果。该模块支持会话模板和语气类别设置，特别关注跨境物流、关税、国际支付等跨境电商特有业务。

## 重要特性

所有会话模板都内置了一个重要限制：当AI不知道如何回答客户的问题，或者不确定答案的准确性时，会直接告诉客户它不知道或不确定，不会编造或猜测答案。对于涉及关税、法规、国际物流等可能因国家和地区而异的问题，AI会特别谨慎，建议客户咨询当地相关部门或联系人工客服获取准确信息。这确保了AI客服回答的诚实性和可靠性。

## 会话模板

系统提供以下跨境电商客服会话模板：
- `default`: 默认跨境电商客服助手，熟悉跨境购物流程、国际订单管理、跨境物流、关税、支付方式、售后服务等业务
- `creative`: 创意跨境电商客服助手，擅长提供创新的跨境购物建议和独特的国际商品推荐
- `analytical`: 分析型跨境电商客服助手，擅长分析客户的跨境购物需求和全球市场趋势
- `technical`: 跨境电商技术支持专家，精通国际订单系统、跨境支付、多币种结算、国际物流跟踪等技术支持
- `conversational`: 友好的跨境电商客服助手，能够进行自然、流畅的对话

## 语气类别

系统提供以下跨境电商客服语气类别：
- `professional`: 专业、客观，适合处理跨境订单、国际物流、关税等售后问题
- `friendly`: 友好、亲切，适合推荐国际商品、解答跨境购物疑问
- `formal`: 正式、礼貌，适合处理重要国际订单、跨境投诉问题
- `casual`: 轻松、随意，适合与老客户沟通、日常跨境购物咨询
- `humorous`: 幽默、风趣，适合推荐国际商品、活跃气氛
- `empathetic`: 共情、理解，适合处理跨境客户投诉、国际退换货等问题

## 基本使用

### 1. 使用默认模板

```typescript
import { chatWithAI } from './plugins/openAI';

// 使用默认跨境电商客服模板
const response = await chatWithAI('你好，我想了解一下跨境订单的退换货政策和关税问题');
```

### 2. 使用预设会话模板

```typescript
import { chatWithAI } from './plugins/openAI';

// 使用创意模板，推荐国际商品
const response = await chatWithAI('我想给女朋友买个礼物，有什么国际商品推荐吗？', {
  promptEngineerOptions: {
    template: 'creative'
  }
});

// 使用技术模板，处理跨境技术问题
const response = await chatWithAI('我的跨境订单支付失败了，显示错误代码500，怎么办？', {
  promptEngineerOptions: {
    template: 'technical'
  }
});

// 使用分析模板，分析跨境购物需求
const response = await chatWithAI('我想从国外买一台笔记本电脑，需要考虑哪些因素？', {
  promptEngineerOptions: {
    template: 'analytical'
  }
});
```

### 3. 设置语气类别

```typescript
import { chatWithAI } from './plugins/openAI';

// 使用专业语气，处理跨境订单问题
const response = await chatWithAI('我的跨境订单已经一周了还没发货，什么时候能发货？', {
  promptEngineerOptions: {
    tone: 'professional'
  }
});

// 使用友好语气，解答跨境购物疑问
const response = await chatWithAI('这款国际商品有其他颜色可选吗？', {
  promptEngineerOptions: {
    tone: 'friendly'
  }
});

// 使用幽默语气，推荐国际商品
const response = await chatWithAI('我想买个有趣的国际礼物送朋友，有什么推荐吗？', {
  promptEngineerOptions: {
    tone: 'humorous'
  }
});
```

### 4. 组合使用会话模板和语气类别

```typescript
import { chatWithAI } from './plugins/openAI';

// 使用技术模板 + 专业语气，处理跨境技术问题
const response = await chatWithAI('我的跨境订单支付后没有收到确认邮件，怎么办？', {
  promptEngineerOptions: {
    template: 'technical',
    tone: 'professional'
  }
});

// 使用创意模板 + 幽默语气，推荐国际商品
const response = await chatWithAI('我想买个有趣的国际礼物送朋友，有什么推荐吗？', {
  promptEngineerOptions: {
    template: 'creative',
    tone: 'humorous'
  }
});

// 使用分析模板 + 正式语气，处理重要跨境订单
const response = await chatWithAI('我订购的批量国际商品什么时候能到货？需要多长时间清关？', {
  promptEngineerOptions: {
    template: 'analytical',
    tone: 'formal'
  }
});

// 使用对话模板 + 共情语气，处理跨境客户投诉
const response = await chatWithAI('我收到的国际商品有质量问题，我很不满意', {
  promptEngineerOptions: {
    template: 'conversational',
    tone: 'empathetic'
  }
});
```

### 5. 自定义系统提示词

```typescript
const response = await chatWithAI('我想了解一下你们跨境电商平台的会员权益和国际运费优惠', {
  systemPrompt: '你是一个专业的跨境电商客服助手，熟悉平台的会员制度、国际运费优惠和跨境购物政策。请详细、清晰地介绍会员权益，帮助客户了解如何享受更多跨境购物优惠。'
});
```

## 流式对话中使用提示词工程

```typescript
import { streamChatWithAI } from './plugins/openAI';

await streamChatWithAI(
  '我想了解一下你们的国际物流配送时间、范围和费用',
  (chunk) => {
    console.log(chunk);
  },
  {
    promptEngineerOptions: {
      template: 'default',
      tone: 'professional'
    }
  }
);
```

## 最佳实践

1. **选择合适的会话模板**：根据客户问题的性质选择最合适的模板
   - 国际商品推荐、创意建议使用 'creative'
   - 跨境购物需求分析、全球市场趋势使用 'analytical'
   - 国际订单系统、跨境支付、多币种结算、国际物流跟踪等技术问题使用 'technical'
   - 日常跨境购物咨询使用 'conversational'
   - 一般跨境电商客服问题使用 'default'

2. **设置合适的语气类别**：根据对话场景和客户需求选择语气
   - 处理跨境订单、国际物流、关税等售后问题使用 'professional'
   - 推荐国际商品、解答跨境购物疑问使用 'friendly'
   - 处理重要国际订单、跨境投诉问题使用 'formal'
   - 与老客户沟通、日常跨境购物咨询使用 'casual'
   - 处理跨境客户投诉、国际退换货等问题使用 'empathetic'
   - 推荐国际商品、活跃气氛使用 'humorous'

3. **组合使用模板和语气**：根据具体跨境客户问题灵活组合会话模板和语气类别，以获得最佳跨境电商客服体验

4. **自定义系统提示词**：对于特定跨境电商平台或业务的客服场景，自定义系统提示词可以获得更好的效果
