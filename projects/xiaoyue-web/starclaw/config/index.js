/**
 * StarClaw 统一配置管理器 v1.0
 * 
 * 功能：
 * 1. 统一管理所有配置来源（.env, starclaw.json, 环境变量）
 * 2. 配置验证和默认值
 * 3. 热更新支持
 * 4. 敏感信息保护
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ConfigManager {
    constructor(configPath = null) {
        this.configPath = configPath || path.join(__dirname, '../starclaw/starclaw.json');
        this.config = {};
        this.watchers = [];
        this.lastModified = 0;
        
        this.loadConfig();
    }
    
    /**
     * 加载所有配置
     */
    loadConfig() {
        // 1. 加载 .env
        try {
            require('dotenv').config({ path: path.join(__dirname, '../.env') });
        } catch (e) {
            console.log('[Config] .env 文件不存在或加载失败');
        }
        
        // 2. 加载 starclaw.json
        this.config.starclaw = this.loadJsonConfig(this.configPath);
        
        // 3. 环境变量配置
        this.config.env = this.loadEnvConfig();
        
        // 4. 默认配置
        this.config.defaults = this.getDefaultConfig();
        
        // 5. 合并运行时配置
        this.config.runtime = {
            startTime: new Date().toISOString(),
            nodeVersion: process.version,
            platform: process.platform
        };
        
        console.log('[Config] 配置加载完成');
    }
    
    /**
     * 加载 JSON 配置文件
     */
    loadJsonConfig(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                this.lastModified = fs.statSync(filePath).mtimeMs;
                return JSON.parse(content);
            }
        } catch (e) {
            console.error(`[Config] 加载 ${filePath} 失败:`, e.message);
        }
        return {};
    }
    
    /**
     * 从环境变量加载配置
     */
    loadEnvConfig() {
        return {
            // 服务器配置
            port: parseInt(process.env.PORT) || 3003,
            host: process.env.HOST || '0.0.0.0',
            
            // 智谱 AI（兜底）
            zhipu: {
                apiKey: process.env.ZHIPU_API_KEY,
                baseUrl: process.env.ZHIPU_API_BASE || 'https://open.bigmodel.cn/api/paas/v4',
                defaultModel: process.env.ZHIPU_MODEL || 'glm-4-flash'
            },
            
            // 方舟 Coding Plan（优先）
            ark: {
                apiKey: process.env.ARK_API_KEY,
                baseUrl: 'https://ark.cn-beijing.volces.com/api/coding/v3',
                defaultModel: 'ark-code-latest',
                enabled: true,
                models: {
                    'ark-code-latest': { name: '方舟最新稳定版', type: 'general' },
                    'deepseek-v3': { name: 'DeepSeek V3', type: 'reasoning' },
                    'doubao-seed-1-6': { name: '豆包 Seed', type: 'fast' }
                }
            },
            
            // OpenClaw 集成
            openclaw: {
                enabled: process.env.OPENCLAW_ENABLED === 'true',
                api: process.env.OPENCLAW_API || 'http://127.0.0.1:18789',
                token: process.env.OPENCLAW_TOKEN,
                workspace: process.env.OPENCLAW_WORKSPACE || path.join(require('os').homedir(), '.openclaw', 'workspace')
            },
            
            // 飞书
            feishu: {
                appId: process.env.FEISHU_APP_ID,
                appSecret: process.env.FEISHU_APP_SECRET,
                encryptKey: process.env.FEISHU_ENCRYPT_KEY,
                verificationToken: process.env.FEISHU_VERIFICATION_TOKEN
            },
            
            // 多模态服务
            tts: {
                server: process.env.TTS_SERVER || 'http://127.0.0.1:5050',
                edgeServer: process.env.EDGE_TTS_SERVER || 'http://127.0.0.1:5051',
                cosyvoiceServer: process.env.COSYVOICE_SERVER || 'http://127.0.0.1:5000'
            },
            
            // 向量嵌入
            embedding: {
                provider: process.env.EMBEDDING_PROVIDER || 'simple', // simple | ollama | zhipu
                ollama: {
                    baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
                    model: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'
                }
            },
            
            // 其他模型
            models: {
                moonshot: {
                    apiKey: process.env.MOONSHOT_API_KEY,
                    baseUrl: 'https://api.moonshot.cn/v1'
                },
                deepseek: {
                    apiKey: process.env.DEEPSEEK_API_KEY,
                    baseUrl: 'https://api.deepseek.com/v1'
                },
                ollama: {
                    enabled: process.env.OLLAMA_ENABLED !== 'false',
                    baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
                }
            },
            
            // 安全配置
            security: {
                enableAudit: process.env.ENABLE_AUDIT !== 'false',
                auditLog: process.env.AUDIT_LOG || path.join(__dirname, '../logs/audit.log'),
                sandboxDirs: (process.env.SANDBOX_DIRS || '').split(',').filter(Boolean)
            }
        };
    }
    
    /**
     * 默认配置
     */
    getDefaultConfig() {
        return {
            // 超时配置
            timeout: {
                default: 30000,
                max: 300000,
                step: 60000,
                workflow: 300000
            },
            
            // 重试配置
            retry: {
                maxRetries: 3,
                delayMs: 1000,
                backoffMultiplier: 2
            },
            
            // 会话配置
            session: {
                maxHistory: 50,
                maxConcurrent: 4,
                persistence: true
            },
            
            // 记忆系统
            memory: {
                workingMemoryLimit: 10,
                sessionMemoryLimit: 50,
                longTermMemoryLimit: 1000,
                forgetThreshold: 30, // 天
                compressionInterval: 3600000 // 毫秒
            },
            
            // 向量搜索
            vector: {
                dimension: 384,
                similarityThreshold: 0.7,
                maxResults: 10
            },
            
            // Agent 配置
            agent: {
                temperature: 0.85,
                maxTokens: 2000,
                defaultModel: 'zhipu/glm-4-flash'
            }
        };
    }
    
    /**
     * 获取配置值
     * @param {string} key - 配置键，支持点分隔路径
     * @param {*} defaultValue - 默认值
     * @returns {*}
     */
    get(key, defaultValue = null) {
        const keys = key.split('.');
        let value = this.config;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }
    
    /**
     * 设置配置值（运行时）
     * @param {string} key - 配置键
     * @param {*} value - 配置值
     */
    set(key, value) {
        const keys = key.split('.');
        let obj = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in obj)) {
                obj[keys[i]] = {};
            }
            obj = obj[keys[i]];
        }
        
        obj[keys[keys.length - 1]] = value;
        
        // 通知监听器
        this.notifyWatchers(key, value);
    }
    
    /**
     * 检查配置是否存在
     */
    has(key) {
        return this.get(key) !== null;
    }
    
    /**
     * 验证配置完整性
     */
    validate() {
        const errors = [];
        const warnings = [];
        
        // 必需配置
        if (!this.get('env.zhipu.apiKey')) {
            errors.push('ZHIPU_API_KEY 未配置');
        }
        
        // OpenClaw 配置检查
        if (this.get('env.openclaw.enabled')) {
            if (!this.get('env.openclaw.token')) {
                errors.push('OPENCLAW_ENABLED=true 但 OPENCLAW_TOKEN 未配置');
            }
        }
        
        // 飞书配置检查
        const feishuAppId = this.get('env.feishu.appId');
        const feishuSecret = this.get('env.feishu.appSecret');
        if (feishuAppId && !feishuSecret) {
            warnings.push('FEISHU_APP_ID 已配置但 FEISHU_APP_SECRET 未配置');
        }
        
        // 目录检查
        const workspace = this.get('env.openclaw.workspace');
        if (workspace && !fs.existsSync(workspace)) {
            warnings.push(`工作目录不存在: ${workspace}`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * 获取配置摘要（脱敏）
     */
    getSummary() {
        return {
            // 服务器信息
            server: {
                port: this.get('env.port'),
                host: this.get('env.host')
            },
            
            // AI 服务状态
            services: {
                ark: !!this.get('env.ark.apiKey'),
                zhipu: !!this.get('env.zhipu.apiKey'),
                openclaw: this.get('env.openclaw.enabled'),
                feishu: !!(this.get('env.feishu.appId') && this.get('env.feishu.appSecret')),
                ollama: this.get('env.models.ollama.enabled')
            },
            
            // 多模态
            multimodal: {
                tts: !!this.get('env.tts.server'),
                edgeTts: !!this.get('env.tts.edgeServer')
            },
            
            // 明星团队
            agents: {
                count: Object.keys(this.get('starclaw.agents.agents', {})).length,
                teams: Object.keys(this.get('starclaw.teams', {}))
            },
            
            // 运行时
            runtime: this.get('runtime')
        };
    }
    
    /**
     * 导出配置（用于调试）
     */
    export(sensitive = false) {
        const exported = JSON.parse(JSON.stringify(this.config));
        
        if (!sensitive) {
            // 脱敏处理
            this.sanitizeObject(exported, [
                'apiKey', 'secret', 'token', 'password', 'credential'
            ]);
        }
        
        return exported;
    }
    
    /**
     * 敏感信息脱敏
     */
    sanitizeObject(obj, sensitiveKeys) {
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.sanitizeObject(obj[key], sensitiveKeys);
            } else if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                if (typeof obj[key] === 'string' && obj[key].length > 8) {
                    obj[key] = obj[key].substring(0, 8) + '***REDACTED***';
                } else {
                    obj[key] = '***REDACTED***';
                }
            }
        }
    }
    
    /**
     * 监听配置变化
     */
    watch(callback) {
        this.watchers.push(callback);
        return () => {
            const index = this.watchers.indexOf(callback);
            if (index > -1) {
                this.watchers.splice(index, 1);
            }
        };
    }
    
    /**
     * 通知监听器
     */
    notifyWatchers(key, value) {
        for (const watcher of this.watchers) {
            try {
                watcher(key, value);
            } catch (e) {
                console.error('[Config] 监听器执行失败:', e.message);
            }
        }
    }
    
    /**
     * 重新加载配置
     */
    reload() {
        console.log('[Config] 重新加载配置...');
        this.loadConfig();
        this.notifyWatchers('*', this.config);
    }
    
    /**
     * 保存配置到文件
     */
    save(filePath = null) {
        const targetPath = filePath || this.configPath;
        const dir = path.dirname(targetPath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(targetPath, JSON.stringify(this.config.starclaw, null, 2), 'utf-8');
        console.log(`[Config] 配置已保存到 ${targetPath}`);
    }
}

// 创建单例
const config = new ConfigManager();

// 导出
module.exports = {
    ConfigManager,
    config,
    // 便捷方法
    get: config.get.bind(config),
    set: config.set.bind(config),
    has: config.has.bind(config),
    validate: config.validate.bind(config),
    getSummary: config.getSummary.bind(config)
};
