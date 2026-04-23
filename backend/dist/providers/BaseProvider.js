"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProvider = void 0;
/**
 * 基础提供商抽象类
 * 提供通用的默认实现
 */
class BaseProvider {
    constructor(config) {
        this.config = config;
    }
    /**
     * 提取JSON从响应文本
     */
    extractJson(text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            }
            catch (e) {
                throw new Error(`Failed to parse JSON: ${e}`);
            }
        }
        throw new Error('No JSON found in response');
    }
}
exports.BaseProvider = BaseProvider;
