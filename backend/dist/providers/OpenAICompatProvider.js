"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAICompatProvider = void 0;
const BaseProvider_1 = require("./BaseProvider");
const errors_1 = require("./errors");
/**
 * OpenAI兼容格式提供商
 * 适用于: 火山引擎豆包、OpenAI官方、Azure OpenAI、自部署开源模型
 */
class OpenAICompatProvider extends BaseProvider_1.BaseProvider {
    constructor(config) {
        super(config);
        this.defaultModel = 'gpt-4o-mini';
        this.defaultBaseURL = 'https://api.openai.com/v1';
    }
    async initialize() {
        if (!this.config.apiKey) {
            throw new errors_1.AIConfigError('API key is required for OpenAI-compatible provider', 'openai-compat');
        }
    }
    get baseURL() {
        return this.config.baseURL || this.defaultBaseURL;
    }
    get model() {
        return this.config.model || this.defaultModel;
    }
    async generateStructured(systemPrompt, userPrompt, maxTokens) {
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ];
        const response = await this.fetchCompletion({
            messages,
            max_tokens: maxTokens,
            temperature: this.config.temperature || 0.7,
        });
        const text = response.choices[0]?.message?.content;
        if (!text) {
            throw new errors_1.AIError('INVALID_RESPONSE', 'No content in response', 'openai-compat');
        }
        return this.extractJson(text);
    }
    async *chat(request) {
        const messages = this.buildMessages(request);
        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                model: this.model,
                messages,
                stream: true,
                max_tokens: request.maxTokens || 1000,
                temperature: request.temperature || this.config.temperature || 0.7,
            }),
            signal: this.getTimeoutSignal(),
        });
        if (!response.ok) {
            await this.handleErrorResponse(response);
        }
        const reader = response.body?.getReader();
        if (!reader) {
            throw new errors_1.AIError('INVALID_RESPONSE', 'No response body', 'openai-compat');
        }
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]')
                    continue;
                if (trimmed.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(trimmed.slice(6));
                        const chunk = data.choices[0]?.delta?.content;
                        if (chunk) {
                            yield chunk;
                        }
                    }
                    catch (e) {
                        // Skip malformed chunks
                        continue;
                    }
                }
            }
        }
    }
    async chatComplete(request) {
        const messages = this.buildMessages(request);
        const response = await this.fetchCompletion({
            messages,
            max_tokens: request.maxTokens || 1000,
            temperature: request.temperature || this.config.temperature || 0.7,
        });
        const text = response.choices[0]?.message?.content;
        if (!text) {
            throw new errors_1.AIError('INVALID_RESPONSE', 'No content in response', 'openai-compat');
        }
        return text;
    }
    async checkHealth() {
        try {
            // Simple request to check API key validity
            await this.fetchCompletion({
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5,
                temperature: 0.7,
            });
            return true;
        }
        catch (e) {
            console.error('[OpenAICompatProvider] Health check failed:', e);
            return false;
        }
    }
    getProviderInfo() {
        return {
            id: 'openai-compat',
            name: 'OpenAI-compatible',
            model: this.model,
            configured: !!this.config.apiKey,
        };
    }
    buildMessages(request) {
        const messages = [...request.messages];
        if (request.systemPrompt) {
            messages.unshift({ role: 'system', content: request.systemPrompt });
        }
        return messages;
    }
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
        };
    }
    getTimeoutSignal() {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), this.config.timeout);
        return controller.signal;
    }
    async fetchCompletion(params) {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                model: this.model,
                ...params,
            }),
            signal: this.getTimeoutSignal(),
        });
        if (!response.ok) {
            await this.handleErrorResponse(response);
        }
        return await response.json();
    }
    async handleErrorResponse(response) {
        let errorMessage = response.statusText;
        try {
            const error = await response.json();
            errorMessage = error.error?.message || errorMessage;
        }
        catch (e) {
            // Ignore
        }
        switch (response.status) {
            case 401:
                throw new errors_1.AIError('INVALID_API_KEY', `Invalid API key: ${errorMessage}`, 'openai-compat');
            case 429:
                throw new errors_1.AIError('RATE_LIMIT_EXCEEDED', `Rate limit exceeded: ${errorMessage}`, 'openai-compat');
            case 413:
            case 400:
                throw new errors_1.AIError('CONTEXT_OVERFLOW', `Context overflow: ${errorMessage}`, 'openai-compat');
            case 503:
                throw new errors_1.AIError('SERVICE_UNAVAILABLE', `Service unavailable: ${errorMessage}`, 'openai-compat');
            default:
                throw new errors_1.AIError('NETWORK_ERROR', `HTTP ${response.status}: ${errorMessage}`, 'openai-compat');
        }
    }
}
exports.OpenAICompatProvider = OpenAICompatProvider;
