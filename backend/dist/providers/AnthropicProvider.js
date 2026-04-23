"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const BaseProvider_1 = require("./BaseProvider");
const errors_1 = require("./errors");
/**
 * Anthropic Claude 原生实现
 */
class AnthropicProvider extends BaseProvider_1.BaseProvider {
    constructor(config) {
        super(config);
        this.client = null;
        this.defaultModel = 'claude-3-7-sonnet-20250219';
    }
    async initialize() {
        if (!this.config.apiKey) {
            throw new errors_1.AIConfigError('API key is required for Anthropic provider', 'anthropic');
        }
        this.client = new sdk_1.default({
            apiKey: this.config.apiKey,
            baseURL: this.config.baseURL || 'https://api.anthropic.com',
            maxRetries: this.config.maxRetries,
            timeout: this.config.timeout,
        });
    }
    async generateStructured(systemPrompt, userPrompt, maxTokens) {
        if (!this.client) {
            throw new errors_1.AIConfigError('Client not initialized', 'anthropic');
        }
        try {
            const response = await this.client.messages.create({
                model: this.config.model || this.defaultModel,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: maxTokens,
                temperature: this.config.temperature || 0.7,
            });
            const content = response.content[0];
            if (content && content.type === 'text') {
                return this.extractJson(content.text);
            }
            throw new errors_1.AIError('INVALID_RESPONSE', 'No text content in response', 'anthropic');
        }
        catch (e) {
            this.handleError(e);
            throw e;
        }
    }
    async *chat(request) {
        if (!this.client) {
            throw new errors_1.AIConfigError('Client not initialized', 'anthropic');
        }
        try {
            // Anthropic doesn't allow 'system' role in messages array
            // Extract system messages and combine with systemPrompt
            let systemContent = request.systemPrompt || '';
            const userMessages = [];
            for (const msg of request.messages) {
                if (msg.role === 'system') {
                    if (systemContent)
                        systemContent += '\n\n';
                    systemContent += msg.content;
                }
                else {
                    userMessages.push(msg);
                }
            }
            const stream = await this.client.messages.create({
                model: this.config.model || this.defaultModel,
                system: systemContent,
                messages: userMessages,
                max_tokens: request.maxTokens || 1000,
                temperature: request.temperature || this.config.temperature || 0.7,
                stream: true,
            });
            for await (const chunk of stream) {
                if (chunk.type === 'content_block_delta') {
                    if (chunk.delta.type === 'text_delta') {
                        yield chunk.delta.text;
                    }
                }
            }
        }
        catch (e) {
            this.handleError(e);
            throw e;
        }
    }
    async chatComplete(request) {
        if (!this.client) {
            throw new errors_1.AIConfigError('Client not initialized', 'anthropic');
        }
        try {
            // Anthropic doesn't allow 'system' role in messages array
            // Extract system messages and combine with systemPrompt
            let systemContent = request.systemPrompt || '';
            const userMessages = [];
            for (const msg of request.messages) {
                if (msg.role === 'system') {
                    if (systemContent)
                        systemContent += '\n\n';
                    systemContent += msg.content;
                }
                else {
                    userMessages.push(msg);
                }
            }
            const response = await this.client.messages.create({
                model: this.config.model || this.defaultModel,
                system: systemContent,
                messages: userMessages,
                max_tokens: request.maxTokens || 1000,
                temperature: request.temperature || this.config.temperature || 0.7,
            });
            const content = response.content[0];
            if (content && content.type === 'text') {
                return content.text;
            }
            throw new errors_1.AIError('INVALID_RESPONSE', 'No text content in response', 'anthropic');
        }
        catch (e) {
            this.handleError(e);
            throw e;
        }
    }
    async checkHealth() {
        if (!this.client)
            return false;
        try {
            // Simple request to check API key validity
            await this.client.messages.create({
                model: this.config.model || this.defaultModel,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5,
            });
            return true;
        }
        catch (e) {
            return false;
        }
    }
    getProviderInfo() {
        return {
            id: 'anthropic',
            name: 'Anthropic Claude',
            model: this.config.model || this.defaultModel,
            configured: this.client !== null,
        };
    }
    handleError(e) {
        if (e.status === 401) {
            throw new errors_1.AIError('INVALID_API_KEY', 'Invalid API key', 'anthropic', e);
        }
        if (e.status === 429) {
            throw new errors_1.AIError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 'anthropic', e);
        }
        if (e.status === 503) {
            throw new errors_1.AIError('SERVICE_UNAVAILABLE', 'Service unavailable', 'anthropic', e);
        }
        throw new errors_1.AIError('NETWORK_ERROR', e.message || 'Network error', 'anthropic', e);
    }
}
exports.AnthropicProvider = AnthropicProvider;
