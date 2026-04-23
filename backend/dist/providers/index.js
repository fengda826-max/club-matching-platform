"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProvider = createProvider;
exports.loadConfigFromEnv = loadConfigFromEnv;
const AnthropicProvider_1 = require("./AnthropicProvider");
const OpenAICompatProvider_1 = require("./OpenAICompatProvider");
const errors_1 = require("./errors");
/**
 * 根据配置创建AI提供商实例
 */
function createProvider(config) {
    switch (config.provider) {
        case 'anthropic':
            return new AnthropicProvider_1.AnthropicProvider(config);
        case 'openai-compat':
            return new OpenAICompatProvider_1.OpenAICompatProvider(config);
        default:
            throw new errors_1.AIConfigError(`Unsupported AI provider: ${config.provider}`, config.provider);
    }
}
/**
 * 从环境变量加载AI配置
 */
function loadConfigFromEnv() {
    const provider = process.env.AI_PROVIDER || 'anthropic';
    const apiKey = process.env.AI_API_KEY || '';
    const baseURL = process.env.AI_BASE_URL;
    const model = process.env.AI_MODEL;
    const timeout = parseInt(process.env.AI_TIMEOUT || '30000', 10);
    const maxRetries = parseInt(process.env.AI_MAX_RETRIES || '2', 10);
    const temperature = process.env.AI_TEMPERATURE ? parseFloat(process.env.AI_TEMPERATURE) : undefined;
    return {
        provider,
        apiKey,
        baseURL,
        model,
        timeout,
        maxRetries,
        temperature,
    };
}
__exportStar(require("./types"), exports);
__exportStar(require("./errors"), exports);
