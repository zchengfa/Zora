import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool, ChatCompletionMessage } from 'openai/resources/chat/completions';
import { aiToolsManager } from './aiTools.ts';
import type { PrismaClient } from '@prisma/client';
import type { IShopifyApiClient } from './shopifyUtils';
import { applyPromptEngineering } from './promptEngineer.ts';
import type { PromptEngineerOptions } from './promptEngineer.ts';

// 默认配置常量
const DEFAULT_CONFIG = {
  MODEL: 'qwen-flash' as const,
  TEMPERATURE: 1,
  MAX_TOKENS: 2048,
  TIMEOUT: 60000, // 60秒超时
} as const;

// 创建OpenAI客户端实例
const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE_URL,
  timeout: DEFAULT_CONFIG.TIMEOUT,
});

/**
 * 工具调用上下文
 */
interface ToolCallContext {
  prisma: PrismaClient;
  shopifyApiClient?: IShopifyApiClient;
}

/**
 * AI对话函数配置参数
 */
export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  messages?: ChatCompletionMessageParam[];
  tools?: ChatCompletionTool[];
  enableTools?: boolean; // 是否启用工具调用
  toolCallContext?: ToolCallContext; // 工具调用上下文
  promptEngineerOptions?: PromptEngineerOptions; // 提示词工程选项
  systemPrompt?: string; // 系统提示词（会覆盖promptEngineerOptions中的设置）
}

/**
 * 处理工具调用
 * @param toolCalls 工具调用列表
 * @param context 工具调用上下文
 * @returns 工具调用结果消息
 */
async function handleToolCalls(
  toolCalls: ChatCompletionMessage.ToolCall[],
  context: ToolCallContext
): Promise<ChatCompletionMessage[]> {
  const results: ChatCompletionMessage[] = [];

  for (const toolCall of toolCalls) {
    const { id, function: func } = toolCall;
    const { name, arguments: args } = func;

    try {
      const parsedArgs = JSON.parse(args);
      const result = await aiToolsManager.executeTool(name, {
        ...context,
        ...parsedArgs
      });

      results.push({
        role: 'tool',
        tool_call_id: id,
        content: JSON.stringify(result)
      });
    } catch (error) {
      results.push({
        role: 'tool',
        tool_call_id: id,
        content: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : '工具调用失败'
        })
      });
    }
  }

  return results;
}

/**
 * AI对话函数
 * @param prompt 用户输入的提示词
 * @param options 可选配置参数
 * @returns AI的回复内容
 */
export async function chatWithAI(
  prompt: string,
  options: ChatOptions = {}
): Promise<string> {
  try {
    const {
      model = DEFAULT_CONFIG.MODEL,
      temperature = DEFAULT_CONFIG.TEMPERATURE,
      maxTokens = DEFAULT_CONFIG.MAX_TOKENS,
      tools,
      enableTools = false,
      toolCallContext,
      promptEngineerOptions,
      systemPrompt: customSystemPrompt,
    } = options;

    // 应用提示词工程
    const { systemPrompt, userPrompt } = applyPromptEngineering(prompt, promptEngineerOptions);
    const finalSystemPrompt = customSystemPrompt || systemPrompt;

    // 不合并消息历史，只使用当前消息，减少token消耗
    const allMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: finalSystemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 如果启用工具调用且提供了工具定义
    const availableTools = enableTools ? aiToolsManager.getToolDefinitions() : [];
    const toolsToUse = tools || (availableTools.length > 0 ? availableTools : undefined);

    // 如果启用了工具调用但没有提供上下文，给出警告
    if (enableTools && !toolCallContext) {
      console.warn('工具调用已启用但未提供 toolCallContext，工具调用可能失败');
    }

    // 循环处理可能的工具调用
    const maxIterations = 5;
    let iteration = 0;

    while (iteration < maxIterations) {
      const completion = await ai.chat.completions.create({
        model,
        messages: allMessages,
        temperature,
        max_completion_tokens: maxTokens,
        ...(toolsToUse && { tools: toolsToUse }),
      });

      const message = completion.choices[0]?.message;

      // 如果没有工具调用，直接返回结果
      if (!message?.tool_calls) {
        return message?.content || 'No response from AI';
      }

      // 如果有工具调用但没有上下文，返回错误
      if (!toolCallContext) {
        throw new Error('工具调用需要提供 toolCallContext');
      }

      // 处理工具调用
      const toolResults = await handleToolCalls(message.tool_calls, toolCallContext);

      // 添加助手消息和工具结果到消息历史
      allMessages.push(message);
      allMessages.push(...toolResults);

      iteration++;
    }

    throw new Error('达到最大工具调用迭代次数');
  } catch (error) {
    console.error('AI chat error:', error);
    throw new Error(`AI请求失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 流式AI对话函数
 * @param prompt 用户输入的提示词
 * @param onChunk 每次收到数据块时的回调函数
 * @param options 可选配置参数
 */
export async function streamChatWithAI(
  prompt: string,
  onChunk: (chunk: string) => void,
  options: ChatOptions = {}
): Promise<void> {
  try {
    const {
      model = DEFAULT_CONFIG.MODEL,
      temperature = DEFAULT_CONFIG.TEMPERATURE,
      maxTokens = DEFAULT_CONFIG.MAX_TOKENS,
      tools,
      enableTools = false,
      toolCallContext,
      promptEngineerOptions,
      systemPrompt: customSystemPrompt,
    } = options;

    // 应用提示词工程
    const { systemPrompt, userPrompt } = applyPromptEngineering(prompt, promptEngineerOptions);
    const finalSystemPrompt = customSystemPrompt || systemPrompt;

    // 不合并消息历史，只使用当前消息，减少token消耗
    const allMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: finalSystemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 如果启用工具调用且提供了工具定义
    const availableTools = enableTools ? aiToolsManager.getToolDefinitions() : [];
    const toolsToUse = tools || (availableTools.length > 0 ? availableTools : undefined);

    // 如果启用了工具调用但没有提供上下文，给出警告
    if (enableTools && !toolCallContext) {
      console.warn('工具调用已启用但未提供 toolCallContext，工具调用可能失败');
    }

    // 循环处理可能的工具调用
    const maxIterations = 5;
    let iteration = 0;
    let currentToolCalls: ChatCompletionMessage.ToolCall[] = [];

    while (iteration < maxIterations) {
      const stream = await ai.chat.completions.create({
        model,
        messages: allMessages,
        temperature,
        max_completion_tokens: maxTokens,
        stream: true,
        ...(toolsToUse && { tools: toolsToUse }),
      });

      let assistantMessage: ChatCompletionMessageParam | null = null;
      let hasToolCalls = false;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        // 处理内容流
        if (delta?.content) {
          onChunk(delta.content);
          if (!assistantMessage) {
            assistantMessage = { role: 'assistant', content: delta.content };
          } else {
            assistantMessage.content = (assistantMessage.content || '') + delta.content;
          }
        }
        
        // 处理工具调用流
        if (delta?.tool_calls) {
          hasToolCalls = true;
          for (const toolCall of delta.tool_calls) {
            if (toolCall.index !== undefined) {
              if (!currentToolCalls[toolCall.index]) {
                currentToolCalls[toolCall.index] = {
                  id: toolCall.id || `call_${Date.now()}_${toolCall.index}`,
                  type: 'function' as const,
                  function: {
                    name: toolCall.function?.name || '',
                    arguments: toolCall.function?.arguments || '',
                  },
                };
              } else {
                // 追加参数
                if (toolCall.function?.arguments) {
                  currentToolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
                }
              }
            }
          }
        }
      }

      // 如果没有工具调用，直接返回
      if (!hasToolCalls) {
        return;
      }

      // 如果有工具调用但没有上下文，返回错误
      if (!toolCallContext) {
        throw new Error('工具调用需要提供 toolCallContext');
      }

      // 处理工具调用
      const toolResults = await handleToolCalls(currentToolCalls, toolCallContext);

      // 添加助手消息和工具结果到消息历史
      if (assistantMessage) {
        assistantMessage.tool_calls = currentToolCalls;
        allMessages.push(assistantMessage);
      } else {
        allMessages.push({
          role: 'assistant',
          tool_calls: currentToolCalls,
        });
      }
      allMessages.push(...toolResults);

      // 重置工具调用状态
      currentToolCalls = [];
      iteration++;
    }

    throw new Error('达到最大工具调用迭代次数');
  } catch (error) {
    console.error('AI stream chat error:', error);
    throw new Error(`AI流式请求失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
