"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIConfigError = exports.AIError = void 0;
/**
 * 统一的AI错误
 */
class AIError extends Error {
    constructor(code, message, provider, cause) {
        super(message);
        this.name = 'AIError';
        this.code = code;
        this.provider = provider;
        this.cause = cause;
    }
}
exports.AIError = AIError;
/**
 * 配置错误
 */
class AIConfigError extends AIError {
    constructor(message, provider) {
        super('INVALID_CONFIG', message, provider);
        this.name = 'AIConfigError';
    }
}
exports.AIConfigError = AIConfigError;
