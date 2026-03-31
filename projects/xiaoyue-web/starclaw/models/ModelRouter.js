/**
 * ModelRouter - StarClaw 本地模型路由器
 * 
 * 功能：
 * 1. 本地模型支持（Ollama / LM Studio / vLLM / OpenAI 兼容）
 * 2. 云端模型支持（智谱 AI / Moonshot / DeepSeek）
 * 3. 智能路由（根据任务类型和隐私等级选择模型）
 * 4. 降级机制（本地不可用时自动切换云端）
 * 5. 成本优化（优先使用免费本地模型）
 * 
 * 架构：
 * ┌─────────────────────────────────────────────────────┐
 * │                   ModelRouter                       │
 * ├─────────────────────────────────────────────────────┤
 * │                 路由决策层                          │
 * │  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
 * │  │ 隐私检测 │  │ 任务分析 │  │ 成本评估 │           │
 * │  └─────────┘  └─────────┘  └─────────┘           │
 * ├─────────────────────────────────────────────────────┤
 * │                   模型适配层                        │
 * │  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
 * │  │ Ollama  │  │智谱 AI  │  │ LM Studio│           │
 * │  │ (本地)  │  │ (云端)  │  │  (本地)  │           │
 * │  └─────────┘  └─────────┘  └─────────┘           │
 * │  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
 * │  │  vLLM   │  │Moonshot │  │ DeepSeek │           │
 * │  │ (本地)  │  │ (云端)  │  │ (云端)   │           │
 * │  └─────────┘  └─────────┘  └─────────┘           │
 * └─────────────────────────────────────────────────────┘
 */

const axios = require('axios');

// ==================== 配置 ====================

const DEFAULT_CONFIG = {
    // ==================== 本地模型 ====================
    
    // Ollama 配置
    ollama: {
        enabled: true,
        baseUrl: 'http://127.0.0.1:11434',
        defaultModel: 'qwen2.5:7b',
        timeout: 60000
    },
    
    // LM Studio 配置（OpenAI 兼容）
    lmstudio: {
        enabled: true,
        baseUrl: 'http://127.0.0.1:1234/v1',
        defaultModel: 'local-model',
        timeout: 60000,
        apiKey: 'lm-studio' // LM Studio 不需要真实 API Key
    },
    
    // vLLM 配置（OpenAI 兼容）
    vllm: {
        enabled: false,
        baseUrl: 'http://127.0.0.1:8000/v1',
        defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
        timeout: 60000,
        apiKey: 'vllm'
    },
    
    // LocalAI 配置
    localai: {
        enabled: false,
        baseUrl: 'http://127.0.0.1:8080',
        defaultModel: 'qwen2.5-7b',
        timeout: 60000
    },
    
    // 通用 OpenAI 兼容接口（可用于任何本地部署）
    openai_compatible: {
        enabled: false,
        baseUrl: 'http://127.0.0.1:8080/v1',
        defaultModel: 'local-model',
        timeout: 60000,
        apiKey: 'none'
    },
    
    // ==================== 云端模型 ====================
    
    // 智谱 AI 配置
    zhipu: {
        apiKey: process.env.ZHIPU_API_KEY,
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        defaultModel: 'glm-4-flash',
        timeout: 30000
    },
    
    // Moonshot (月之暗面) 配置
    moonshot: {
        apiKey: process.env.MOONSHOT_API_KEY,
        baseUrl: 'https://api.moonshot.cn/v1',
        defaultModel: 'moonshot-v1-8k',
        timeout: 60000
    },
    
    // DeepSeek 配置
    deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseUrl: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
        timeout: 60000
    },
    
    // ==================== 方舟 Coding Plan 配置 ====================
    // 火山引擎方舟 Coding Plan API（优先使用）
    // 官方文档: https://www.volcengine.com/docs/82379/1330310
    // 
    // 【Pro 套餐配额】
    // - 每5小时: 最多约 6,000 次请求
    // - 每周: 最多约 45,000 次请求
    // - 每订阅月: 最多约 90,000 次请求
    //
    // 【Base URL 注意事项】
    // - OpenAI 兼容: https://ark.cn-beijing.volces.com/api/coding/v3 ✅ (使用此URL消耗Coding Plan额度)
    // - Anthropic兼容: https://ark.cn-beijing.volces.com/api/coding
    // - 警告: https://ark.cn-beijing.volces.com/api/v3 ❌ (不消耗Coding Plan额度，会产生额外费用)
    //
    // 【模型选择】
    // - ark-code-latest: 指定模型为最新稳定版
    // - auto: Auto模式，智能选择效果+速度最佳模型
    // - 可通过开通管理页面选择或切换目标模型（切换后3-5分钟生效）
    ark: {
        apiKey: process.env.ARK_API_KEY,
        baseUrl: 'https://ark.cn-beijing.volces.com/api/coding/v3', // OpenAI 兼容端点
        defaultModel: 'ark-code-latest', // 使用 ark-code-latest 消耗 Coding Plan 额度
        timeout: 60000,
        enabled: true,
        plan: 'pro', // Pro 套餐
        // ==================== 可用模型列表 ====================
        // Coding Plan 支持多种模型，包括 Doubao、GLM、DeepSeek、Kimi 等
        models: {
            // ---------- 文本对话模型 ----------
            'ark-code-latest': { 
                name: '方舟最新稳定版', 
                type: 'general', 
                priority: 1,
                capabilities: ['text', 'code', 'analysis'],
                maxTokens: 4096,
                description: '通用对话、代码、分析（推荐）' 
            },
            'auto': { 
                name: 'Auto 智能模式', 
                type: 'auto', 
                priority: 0,
                capabilities: ['text', 'code', 'analysis'],
                maxTokens: 4096,
                description: '智能选择效果+速度最佳模型' 
            },
            'deepseek-v3': { 
                name: 'DeepSeek V3', 
                type: 'reasoning', 
                priority: 2,
                capabilities: ['text', 'code', 'reasoning'],
                maxTokens: 8192,
                description: '深度推理、代码生成' 
            },
            'doubao-seed-1-6': { 
                name: '豆包 Seed', 
                type: 'fast', 
                priority: 3,
                capabilities: ['text', 'chat'],
                maxTokens: 2048,
                description: '快速响应、日常对话' 
            },
            // ---------- 方舟平台更多模型 ----------
            // 豆包系列
            'doubao-1.5-pro': {
                name: '豆包 1.5 Pro',
                type: 'pro',
                priority: 1,
                capabilities: ['text', 'code', 'reasoning'],
                maxTokens: 256000,
                contextLength: 256000,
                description: '专业版大模型，知识代码推理能力强'
            },
            'doubao-1.5-lite': {
                name: '豆包 1.5 Lite',
                type: 'lite',
                priority: 2,
                capabilities: ['text', 'chat'],
                maxTokens: 12000,
                contextLength: 32000,
                description: '轻量版，更快更便宜'
            },
            'doubao-1.5-vision': {
                name: '豆包 1.5 Vision',
                type: 'vision',
                priority: 1,
                capabilities: ['text', 'image', 'ocr', 'multimodal'],
                maxTokens: 12000,
                contextLength: 32000,
                maxImages: 50,
                description: '视觉理解模型，支持图片识别、OCR'
            },
            // GLM 系列（智谱）
            'glm-4-flash': {
                name: 'GLM-4 Flash',
                type: 'fast',
                priority: 2,
                capabilities: ['text', 'chat'],
                maxTokens: 4096,
                description: '智谱快速模型'
            },
            // Kimi 系列（月之暗面）
            'kimi-latest': {
                name: 'Kimi',
                type: 'long_context',
                priority: 1,
                capabilities: ['text', 'long_context'],
                maxTokens: 8192,
                contextLength: 128000,
                description: '长文本理解，支持超长上下文'
            }
        },
        // ==================== 多模态能力说明 ====================
        // 【重要】Coding Plan 仅支持文本对话和图片识别（多模态理解）
        // 图片生成（文生图）需要使用 /api/v3 端点，会产生额外费用，不在 Coding Plan 额度内
        // 因此这里不启用图片生成功能，避免意外产生费用
        imageGeneration: {
            enabled: false, // 禁用图片生成，避免额外费用
            note: '图片生成会产生额外费用，不在 Coding Plan 额度内'
        }
    },
    
    // ==================== 路由策略 ====================
    
    routing: {
        // 隐私敏感任务强制本地
        privacySensitiveKeywords: ['密码', '密钥', '私钥', 'token', 'secret', '密码', '账号', '身份证', '银行卡'],
        
        // 任务类型 -> 模型映射
        taskModelMapping: {
            'code': 'ollama:qwen2.5-coder:7b',
            'creative': 'zhipu:glm-4-flash',
            'analysis': 'ollama:qwen2.5:7b',
            'translation': 'ollama:qwen2.5:7b',
            'chat': 'zhipu:glm-4-flash',
            'long_context': 'moonshot:moonshot-v1-128k',
            'reasoning': 'deepseek:deepseek-reasoner',
            'default': 'zhipu:glm-4-flash'
        },
        
        // 默认路由：local-first / cloud-first / auto
        defaultRouting: 'auto',
        
        // 本地模型不可用时的降级
        fallbackToCloud: true,
        
        // 本地模型优先级（按顺序尝试）
        localPriority: ['ollama', 'lmstudio', 'vllm', 'localai', 'openai_compatible']
    }
};

// ==================== 通用 OpenAI 兼容提供商 ====================

class OpenAICompatibleProvider {
    /**
     * 通用的 OpenAI 兼容 API 提供商
     * 支持: LM Studio, vLLM, 任何 OpenAI 兼容接口
     */
    constructor(name, config) {
        this.name = name;
        this.config = config;
        this.available = false;
        this.models = [];
    }
    
    async checkAvailability() {
        try {
            const response = await axios.get(`${this.config.baseUrl}/models`, {
                timeout: 3000,
                headers: this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}
            });
            this.available = true;
            this.models = response.data.data || [{ id: this.config.defaultModel }];
            console.log(`[${this.name}] 可用，检测到 ${this.models.length} 个模型`);
            return true;
        } catch (e) {
            // 尝试不带 /models 路径的健康检查
            try {
                const baseUrl = this.config.baseUrl.replace('/v1', '');
                await axios.get(`${baseUrl}/health`, { timeout: 2000 });
                this.available = true;
                this.models = [{ id: this.config.defaultModel }];
                console.log(`[${this.name}] 可用（健康检查通过）`);
                return true;
            } catch (e2) {
                this.available = false;
                console.log(`[${this.name}] 不可用:`, e.message);
                return false;
            }
        }
    }
    
    async chat(messages, options = {}) {
        if (!this.available) {
            throw new Error(`${this.name} 不可用`);
        }
        
        const model = options.model || this.config.defaultModel;
        const timeout = options.timeout || this.config.timeout;
        
        console.log(`[${this.name}] 调用模型: ${model}`);
        
        const response = await axios.post(
            `${this.config.baseUrl}/chat/completions`,
            {
                model,
                messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 2000,
                stream: false
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {})
                },
                timeout
            }
        );
        
        return {
            success: true,
            content: response.data.choices[0]?.message?.content || '',
            model: response.data.model,
            provider: this.name.toLowerCase(),
            usage: response.data.usage
        };
    }
    
    async generate(prompt, options = {}) {
        return this.chat([{ role: 'user', content: prompt }], options);
    }
    
    async embeddings(text, options = {}) {
        if (!this.available) {
            throw new Error(`${this.name} 不可用`);
        }
        
        const model = options.model || 'text-embedding-ada-002';
        
        const response = await axios.post(
            `${this.config.baseUrl}/embeddings`,
            { model, input: text },
            {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {})
                },
                timeout: 30000
            }
        );
        
        return {
            success: true,
            embedding: response.data.data[0]?.embedding,
            provider: this.name.toLowerCase()
        };
    }
    
    getAvailableModels() {
        return this.models.map(m => ({
            name: m.id,
            provider: this.name.toLowerCase(),
            type: 'local'
        }));
    }
}

// ==================== Ollama 提供商 ====================

class OllamaProvider {
    constructor(config) {
        this.config = config;
        this.available = false;
        this.models = [];
    }
    
    async checkAvailability() {
        try {
            const response = await axios.get(`${this.config.baseUrl}/api/tags`, {
                timeout: 3000
            });
            this.available = true;
            this.models = response.data.models || [];
            console.log(`[Ollama] 可用，已安装 ${this.models.length} 个模型`);
            return true;
        } catch (e) {
            this.available = false;
            console.log('[Ollama] 不可用:', e.message);
            return false;
        }
    }
    
    async chat(messages, options = {}) {
        if (!this.available) {
            throw new Error('Ollama 不可用');
        }
        
        const model = options.model || this.config.defaultModel;
        const timeout = options.timeout || this.config.timeout;
        
        console.log(`[Ollama] 调用模型: ${model}`);
        
        const response = await axios.post(
            `${this.config.baseUrl}/api/chat`,
            {
                model,
                messages,
                stream: false,
                options: {
                    temperature: options.temperature || 0.7,
                    num_predict: options.maxTokens || 2000
                }
            },
            { timeout }
        );
        
        return {
            success: true,
            content: response.data.message?.content || '',
            model: response.data.model,
            provider: 'ollama',
            usage: {
                promptTokens: response.data.prompt_eval_count || 0,
                completionTokens: response.data.eval_count || 0,
                totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
            }
        };
    }
    
    async generate(prompt, options = {}) {
        if (!this.available) {
            throw new Error('Ollama 不可用');
        }
        
        const model = options.model || this.config.defaultModel;
        
        const response = await axios.post(
            `${this.config.baseUrl}/api/generate`,
            {
                model,
                prompt,
                stream: false,
                options: {
                    temperature: options.temperature || 0.7,
                    num_predict: options.maxTokens || 2000
                }
            },
            { timeout: options.timeout || this.config.timeout }
        );
        
        return {
            success: true,
            content: response.data.response || '',
            model: response.data.model,
            provider: 'ollama'
        };
    }
    
    async embeddings(text, options = {}) {
        if (!this.available) {
            throw new Error('Ollama 不可用');
        }
        
        const model = options.model || 'nomic-embed-text';
        
        const response = await axios.post(
            `${this.config.baseUrl}/api/embeddings`,
            { model, prompt: text },
            { timeout: 30000 }
        );
        
        return {
            success: true,
            embedding: response.data.embedding,
            provider: 'ollama'
        };
    }
    
    getAvailableModels() {
        return this.models.map(m => ({
            name: m.name,
            size: m.size,
            modified: m.modified_at,
            provider: 'ollama',
            type: 'local'
        }));
    }
}

// ==================== 云端模型提供商 ====================

class ZhipuProvider {
    constructor(config) {
        this.config = config;
        this.available = !!config.apiKey;
    }
    
    async checkAvailability() {
        this.available = !!this.config.apiKey;
        console.log(`[智谱AI] ${this.available ? '可用' : '不可用（缺少 API Key）'}`);
        return this.available;
    }
    
    async chat(messages, options = {}) {
        if (!this.available) {
            throw new Error('智谱 AI 不可用');
        }
        
        const model = options.model || this.config.defaultModel;
        
        const response = await axios.post(
            `${this.config.baseUrl}/chat/completions`,
            {
                model,
                messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 2000
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: options.timeout || this.config.timeout
            }
        );
        
        return {
            success: true,
            content: response.data.choices[0]?.message?.content || '',
            model: response.data.model,
            provider: 'zhipu',
            usage: response.data.usage
        };
    }
    
    async embeddings(text, options = {}) {
        if (!this.available) {
            throw new Error('智谱 AI 不可用');
        }
        
        const response = await axios.post(
            `${this.config.baseUrl}/embeddings`,
            { model: 'embedding-3', input: text },
            {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        return {
            success: true,
            embedding: response.data.data[0]?.embedding,
            provider: 'zhipu'
        };
    }
}

class MoonshotProvider extends OpenAICompatibleProvider {
    constructor(config) {
        super('Moonshot', config);
    }
    
    async checkAvailability() {
        this.available = !!this.config.apiKey;
        console.log(`[Moonshot] ${this.available ? '可用' : '不可用（缺少 API Key）'}`);
        return this.available;
    }
}

class DeepSeekProvider extends OpenAICompatibleProvider {
    constructor(config) {
        super('DeepSeek', config);
    }
    
    async checkAvailability() {
        this.available = !!this.config.apiKey;
        console.log(`[DeepSeek] ${this.available ? '可用' : '不可用（缺少 API Key）'}`);
        return this.available;
    }
}

// ==================== 方舟 Coding Plan 提供商 ====================

class ArkProvider extends OpenAICompatibleProvider {
    /**
     * 方舟 Coding Plan API 提供商
     * 支持模型: Doubao、GLM、DeepSeek、Kimi 等多种模型
     * 支持能力: 文本对话、代码生成、图片识别(多模态)、图片生成
     * 
     * 官方文档: https://www.volcengine.com/docs/82379/1330310
     */
    constructor(config) {
        super('Ark', config);
        this.models = config.models || {};
        this.imageGeneration = config.imageGeneration || {};
    }
    
    async checkAvailability() {
        this.available = !!this.config.apiKey && this.config.enabled !== false;
        console.log(`[方舟Coding] ${this.available ? '可用' : '不可用（缺少 API Key 或已禁用）'}`);
        
        if (this.available) {
            const textModels = Object.keys(this.models).filter(id => 
                this.models[id].capabilities && this.models[id].capabilities.includes('text')
            );
            const visionModels = Object.keys(this.models).filter(id => 
                (this.models[id].capabilities && this.models[id].capabilities.includes('image')) || 
                (this.models[id].capabilities && this.models[id].capabilities.includes('multimodal'))
            );
            console.log(`[方舟Coding] 文本模型: ${textModels.length} 个`);
            console.log(`[方舟Coding] 视觉模型: ${visionModels.length} 个 (${visionModels.join(', ')})`);
            console.log(`[方舟Coding] 图片生成: ${this.imageGeneration.enabled ? '支持' : '不支持'}`);
        }
        return this.available;
    }
    
    /**
     * 根据任务类型选择最佳模型
     */
    selectModelForTask(taskType) {
        const modelMapping = {
            'code': 'ark-code-latest',
            'reasoning': 'deepseek-v3',
            'chat': 'doubao-seed-1-6',
            'creative': 'ark-code-latest',
            'analysis': 'deepseek-v3',
            'vision': 'doubao-1.5-vision',
            'ocr': 'doubao-1.5-vision',
            'multimodal': 'doubao-1.5-vision',
            'long_context': 'kimi-latest',
            'pro': 'doubao-1.5-pro',
            'lite': 'doubao-1.5-lite',
            'default': 'ark-code-latest'
        };
        return modelMapping[taskType] || modelMapping.default;
    }
    
    /**
     * 多模态对话 - 支持图片输入
     * @param {Array} messages - 消息数组，支持图片 URL
     * @param {Object} options - 选项
     */
    async chatWithImage(messages, options) {
        options = options || {};
        if (!this.available) {
            throw new Error('方舟 Coding 不可用');
        }
        
        const model = options.model || 'doubao-1.5-vision';
        const modelInfo = this.models[model];
        
        if (modelInfo && !modelInfo.capabilities.includes('image') && !modelInfo.capabilities.includes('multimodal')) {
            console.warn(`[方舟Coding] 模型 ${model} 不支持图片输入，使用 doubao-1.5-vision`);
            options.model = 'doubao-1.5-vision';
        }
        
        return this.chat(messages, options);
    }
    
    /**
     * 图片生成 - 文生图
     * 【重要】此功能会产生额外费用，不在 Coding Plan 额度内
     * @param {string} prompt - 图片描述
     * @param {Object} options - 生成选项
     */
    async generateImage(prompt, options) {
        options = options || {};
        if (!this.available) {
            throw new Error('方舟 Coding 不可用');
        }
        
        // 强制检查：图片生成会产生额外费用
        if (!this.imageGeneration.enabled) {
            throw new Error('图片生成功能已禁用。原因：' + (this.imageGeneration.note || '会产生额外费用，不在 Coding Plan 额度内'));
        }
        
        // 二次确认：即使启用也要警告
        console.warn('[方舟Coding] 警告：图片生成会产生额外费用，不在 Coding Plan 额度内！');
        
        throw new Error('图片生成功能已禁用，避免产生额外费用。如需使用，请在配置中手动启用 imageGeneration.enabled');
    }
    
    /**
     * 获取模型能力信息
     */
    getModelCapabilities(modelId) {
        const model = this.models[modelId];
        if (!model) return null;
        
        return {
            id: modelId,
            name: model.name,
            type: model.type,
            capabilities: model.capabilities || [],
            maxTokens: model.maxTokens,
            contextLength: model.contextLength,
            description: model.description
        };
    }
    
    /**
     * 获取支持特定能力的模型列表
     */
    getModelsByCapability(capability) {
        return Object.entries(this.models)
            .filter(function(entry) {
                var info = entry[1];
                return info.capabilities && info.capabilities.includes(capability);
            })
            .map(function(entry) {
                var id = entry[0];
                var info = entry[1];
                return {
                    id: id,
                    name: info.name,
                    type: info.type,
                    description: info.description
                };
            });
    }
    
    getAvailableModels() {
        return Object.entries(this.models).map(function(entry) {
            var id = entry[0];
            var info = entry[1];
            return {
                name: id,
                displayName: info.name,
                type: info.type,
                priority: info.priority,
                capabilities: info.capabilities || [],
                maxTokens: info.maxTokens,
                contextLength: info.contextLength,
                provider: 'ark',
                location: 'cloud',
                description: info.description
            };
        });
    }
}

// ==================== 模型路由器 ====================

class ModelRouter {
    /**
     * StarClaw 模型路由器
     * 根据任务类型、隐私等级和成本优化选择最佳模型
     */
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        
        // 初始化本地提供商
        this.providers = {
            ollama: new OllamaProvider(this.config.ollama),
            lmstudio: new OpenAICompatibleProvider('LMStudio', this.config.lmstudio),
            vllm: new OpenAICompatibleProvider('vLLM', this.config.vllm),
            localai: new OpenAICompatibleProvider('LocalAI', this.config.localai),
            openai_compatible: new OpenAICompatibleProvider('OpenAICompatible', this.config.openai_compatible)
        };
        
        // 初始化云端提供商
        // 方舟 Coding Plan 优先（计划优先使用一个月）
        this.providers.ark = new ArkProvider(this.config.ark);
        // 其他云端作为兜底
        this.providers.zhipu = new ZhipuProvider(this.config.zhipu);
        this.providers.moonshot = new MoonshotProvider(this.config.moonshot);
        this.providers.deepseek = new DeepSeekProvider(this.config.deepseek);
        
        // 统计信息
        this.stats = {
            totalRequests: 0,
            localRequests: 0,
            cloudRequests: 0,
            fallbackCount: 0,
            providerStats: {}
        };
    }
    
    /**
     * 初始化 - 检查所有提供商可用性
     */
    async initialize() {
        console.log('[ModelRouter] 初始化模型路由器...');
        
        // 并行检查所有提供商
        await Promise.all(
            Object.entries(this.providers).map(async ([name, provider]) => {
                try {
                    await provider.checkAvailability();
                } catch (e) {
                    console.log(`[${name}] 检查失败:`, e.message);
                }
            })
        );
        
        console.log('[ModelRouter] 初始化完成');
        this.logStatus();
    }
    
    /**
     * 记录状态
     */
    logStatus() {
        console.log('[ModelRouter] 模型状态:');
        
        // 本地模型
        const localProviders = ['ollama', 'lmstudio', 'vllm', 'localai', 'openai_compatible'];
        console.log('  本地模型:');
        localProviders.forEach(name => {
            const provider = this.providers[name];
            if (provider.config.enabled !== false) {
                const status = provider.available ? '✅ 可用' : '❌ 不可用';
                console.log(`    - ${name}: ${status}`);
            }
        });
        
        // 云端模型（方舟优先）
        const cloudProviders = ['ark', 'zhipu', 'moonshot', 'deepseek'];
        console.log('  云端模型:');
        cloudProviders.forEach(name => {
            const provider = this.providers[name];
            const status = provider.available ? '✅ 可用' : '❌ 不可用';
            const priority = name === 'ark' ? ' (优先)' : '';
            console.log(`    - ${name}: ${status}${priority}`);
        });
    }
    
    /**
     * 获取可用的本地提供商
     */
    getAvailableLocalProvider() {
        const priority = this.config.routing.localPriority;
        
        for (const name of priority) {
            const provider = this.providers[name];
            if (provider && provider.available && provider.config?.enabled !== false) {
                return { name, provider };
            }
        }
        
        return null;
    }
    
    /**
     * 分析任务类型
     */
    analyzeTask(messages) {
        const lastMessage = messages[messages.length - 1]?.content || '';
        
        // 检测隐私敏感（添加安全检查）
        const privacyKeywords = this.config.routing?.privacySensitiveKeywords || [];
        const isPrivacySensitive = privacyKeywords.some(
            keyword => lastMessage.toLowerCase().includes(keyword.toLowerCase())
        );
        
        // 检测任务类型
        let taskType = 'default';
        
        if (/代码|code|编程|函数|bug|debug/i.test(lastMessage)) {
            taskType = 'code';
        } else if (/创作|写|故事|文案|剧本/i.test(lastMessage)) {
            taskType = 'creative';
        } else if (/分析|评估|比较|总结/i.test(lastMessage)) {
            taskType = 'analysis';
        } else if (/翻译|translate/i.test(lastMessage)) {
            taskType = 'translation';
        } else if (/推理|思考|逻辑|推演/i.test(lastMessage)) {
            taskType = 'reasoning';
        } else if (lastMessage.length > 10000) {
            taskType = 'long_context';
        }
        
        return {
            taskType,
            isPrivacySensitive,
            messageLength: lastMessage.length
        };
    }
    
    /**
     * 选择最佳模型
     */
    selectModel(taskAnalysis, options = {}) {
        const { taskType, isPrivacySensitive } = taskAnalysis;
        
        // 隐私敏感强制本地
        if (isPrivacySensitive) {
            const local = this.getAvailableLocalProvider();
            if (local) {
                return { provider: local.name, reason: '隐私敏感任务，强制本地模型' };
            }
            console.warn('[ModelRouter] 警告：隐私敏感任务但本地模型不可用');
        }
        
        // 用户指定模型
        if (options.model) {
            const [provider] = options.model.split(':');
            if (this.providers[provider]?.available) {
                return { provider, model: options.model, reason: '用户指定' };
            }
        }
        
        // 方舟 Coding Plan 优先策略（计划优先使用一个月）
        if (this.providers.ark?.available) {
            const arkModel = this.providers.ark.selectModelForTask(taskType);
            return {
                provider: 'ark',
                model: arkModel,
                reason: `方舟优先策略 - 任务类型: ${taskType}`
            };
        }
        
        // 根据任务类型选择（兜底）
        const mapping = this.config.routing?.taskModelMapping?.[taskType] || 
                        this.config.routing?.taskModelMapping?.default || 'zhipu:glm-4-flash';
        const [preferredProvider, preferredModel] = mapping.split(':');
        
        // 检查首选提供商是否可用
        if (this.providers[preferredProvider]?.available) {
            return { 
                provider: preferredProvider, 
                model: preferredModel, 
                reason: `任务类型: ${taskType} (兜底)` 
            };
        }
        
        // 路由策略
        if (this.config.routing?.defaultRouting === 'local-first') {
            const local = this.getAvailableLocalProvider();
            if (local) {
                return { provider: local.name, reason: '本地优先策略' };
            }
        }
        
        // 降级到云端（方舟优先）
        if (this.config.routing?.fallbackToCloud !== false) {
            const cloudProviders = ['ark', 'zhipu', 'deepseek', 'moonshot'];
            for (const name of cloudProviders) {
                if (this.providers[name]?.available) {
                    return { provider: name, reason: '降级到云端' };
                }
            }
        }
        
        // 最后尝试本地
        const local = this.getAvailableLocalProvider();
        if (local) {
            return { provider: local.name, reason: '最后备选' };
        }
        
        return { provider: 'zhipu', reason: '默认' };
    }
    
    /**
     * 统一聊天接口
     */
    async chat(messages, options = {}) {
        this.stats.totalRequests++;
        
        // 分析任务
        const taskAnalysis = this.analyzeTask(messages);
        
        // 选择模型
        const selection = this.selectModel(taskAnalysis, options);
        const { provider: providerName } = selection;
        
        console.log(`[ModelRouter] 选择模型: ${providerName} (${selection.reason})`);
        
        try {
            // 调用提供商
            const provider = this.providers[providerName];
            if (!provider || !provider.available) {
                throw new Error(`提供商 ${providerName} 不可用`);
            }
            
            const result = await provider.chat(messages, {
                ...options,
                model: selection.model
            });
            
            // 更新统计
            const isLocal = ['ollama', 'lmstudio', 'vllm', 'localai', 'openai_compatible'].includes(providerName);
            if (isLocal) {
                this.stats.localRequests++;
            } else {
                this.stats.cloudRequests++;
            }
            
            // 更新提供商统计
            this.stats.providerStats[providerName] = (this.stats.providerStats[providerName] || 0) + 1;
            
            return {
                ...result,
                routing: selection
            };
            
        } catch (error) {
            console.error(`[ModelRouter] ${providerName} 调用失败:`, error.message);
            
            // 尝试降级
            if (this.config.routing.fallbackToCloud) {
                const isLocalProvider = ['ollama', 'lmstudio', 'vllm', 'localai', 'openai_compatible'].includes(providerName);
                // 方舟优先降级
                const fallbackProviders = isLocalProvider 
                    ? ['ark', 'zhipu', 'deepseek', 'moonshot']
                    : ['ark', 'ollama', 'lmstudio', 'vllm'];
                
                for (const fallbackName of fallbackProviders) {
                    if (this.providers[fallbackName]?.available) {
                        console.log(`[ModelRouter] 降级到 ${fallbackName}`);
                        this.stats.fallbackCount++;
                        
                        try {
                            const result = await this.providers[fallbackName].chat(messages, options);
                            return {
                                ...result,
                                routing: { provider: fallbackName, reason: '降级' }
                            };
                        } catch (fallbackError) {
                            console.error(`[ModelRouter] 降级也失败:`, fallbackError.message);
                        }
                    }
                }
            }
            
            return {
                success: false,
                error: error.message,
                provider: providerName
            };
        }
    }
    
    /**
     * 生成嵌入向量
     */
    async embeddings(text, options = {}) {
        // 优先使用本地（Ollama 或 LM Studio）
        if (this.providers.ollama.available) {
            try {
                return await this.providers.ollama.embeddings(text, options);
            } catch (e) {
                console.log('[ModelRouter] Ollama embeddings 失败，尝试其他提供商');
            }
        }
        
        if (this.providers.lmstudio.available) {
            try {
                return await this.providers.lmstudio.embeddings(text, options);
            } catch (e) {
                console.log('[ModelRouter] LM Studio embeddings 失败');
            }
        }
        
        // 降级到云端
        if (this.providers.zhipu.available) {
            return this.providers.zhipu.embeddings(text, options);
        }
        
        throw new Error('无可用的嵌入模型');
    }
    
    /**
     * 获取可用模型列表
     */
    getAvailableModels() {
        const models = [];
        
        // 本地模型
        ['ollama', 'lmstudio', 'vllm', 'localai', 'openai_compatible'].forEach(name => {
            const provider = this.providers[name];
            if (provider.available) {
                const providerModels = provider.getAvailableModels ? provider.getAvailableModels() : [];
                models.push(...providerModels);
            }
        });
        
        // 云端模型（方舟优先）
        if (this.providers.ark.available) {
            const arkModels = this.providers.ark.getAvailableModels();
            models.push(...arkModels);
        }
        
        if (this.providers.zhipu.available) {
            models.push(
                { name: 'glm-4-flash', provider: 'zhipu', type: 'cloud' },
                { name: 'glm-4.7-flash', provider: 'zhipu', type: 'cloud' }
            );
        }
        
        if (this.providers.moonshot.available) {
            models.push(
                { name: 'moonshot-v1-8k', provider: 'moonshot', type: 'cloud' },
                { name: 'moonshot-v1-32k', provider: 'moonshot', type: 'cloud' },
                { name: 'moonshot-v1-128k', provider: 'moonshot', type: 'cloud' }
            );
        }
        
        if (this.providers.deepseek.available) {
            models.push(
                { name: 'deepseek-chat', provider: 'deepseek', type: 'cloud' },
                { name: 'deepseek-reasoner', provider: 'deepseek', type: 'cloud' }
            );
        }
        
        return models;
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        const localProviders = ['ollama', 'lmstudio', 'vllm', 'localai', 'openai_compatible'];
        const providerStatus = {};
        
        Object.entries(this.providers).forEach(([name, provider]) => {
            providerStatus[name] = provider.available;
        });
        
        return {
            ...this.stats,
            providers: providerStatus,
            localRatio: this.stats.totalRequests > 0 
                ? (this.stats.localRequests / this.stats.totalRequests * 100).toFixed(1) + '%'
                : '0%'
        };
    }
    
    /**
     * 设置路由策略
     */
    setRoutingStrategy(strategy) {
        if (['local-first', 'cloud-first', 'auto'].includes(strategy)) {
            this.config.routing.defaultRouting = strategy;
            console.log(`[ModelRouter] 路由策略已更新: ${strategy}`);
            return true;
        }
        return false;
    }
    
    /**
     * 手动注册本地模型提供商
     */
    registerProvider(name, config) {
        this.providers[name] = new OpenAICompatibleProvider(name, config);
        console.log(`[ModelRouter] 已注册提供商: ${name}`);
        
        // 异步检查可用性
        this.providers[name].checkAvailability().catch(e => {
            console.log(`[${name}] 检查失败:`, e.message);
        });
    }
}

// ==================== 导出 ====================

module.exports = {
    ModelRouter,
    OllamaProvider,
    OpenAICompatibleProvider,
    ZhipuProvider,
    MoonshotProvider,
    DeepSeekProvider,
    ArkProvider,
    DEFAULT_CONFIG
};
