# StarClaw 进阶优化方案

## 一、浏览器操作能力确认 ✅

### 当前状态

StarClaw **已经集成 OpenClaw**，支持完整的浏览器操作能力：

```env
# .env 配置
OPENCLAW_ENABLED=true
OPENCLAW_API=http://127.0.0.1:18789
OPENCLAW_TOKEN=a8351b767e724cf1924a4f9565b8b476.ATNkJF3bScIStuhe
```

### 支持的操作

通过 OpenClaw 集成，StarClaw 可以：

| 能力 | 状态 | 说明 |
|------|------|------|
| 浏览器打开/导航 | ✅ | 打开网页、搜索、导航 |
| 页面截图 | ✅ | 截取页面内容 |
| 元素操作 | ✅ | 点击、输入、滚动 |
| 表单填写 | ✅ | 登录、提交表单 |
| 文件操作 | ✅ | 读写、创建、删除 |
| 代码执行 | ✅ | JavaScript/Python/Shell |
| 系统命令 | ✅ | 应用控制、进程管理 |

### 调用方式

```javascript
// 方式1：通过对话触发
用户: "帮我打开浏览器搜索今天的新闻"
小易: ✅ 任务已执行

// 方式2：通过工作流引擎
{
    type: STEP_TYPES.OPENCLAW,
    task: "打开浏览器访问淘宝搜索iPhone 15",
    inputKey: "keywords",
    outputKey: "searchResults"
}

// 方式3：通过 API
POST /api/openclaw/execute
{
    "task": "打开浏览器并登录Gmail",
    "sessionId": "user-123"
}
```

---

## 二、server-with-openclaw.js 拆分方案

### 问题分析

当前文件 ~67KB，超过 1600 行，包含：
- Express 路由
- 智谱 AI 集成
- OpenClaw WebSocket
- 飞书机器人
- 多模态服务
- 静态文件服务

### 拆分方案

```
xiaoyue-web/
├── server/
│   ├── index.js                    # 入口文件 (~100行)
│   ├── app.js                      # Express 配置 (~80行)
│   │
│   ├── routes/
│   │   ├── chat.js                 # 对话路由 (~200行)
│   │   ├── agents.js               # Agent 路由 (~150行)
│   │   ├── workflow.js             # 工作流路由 (~150行)
│   │   ├── openclaw.js             # OpenClaw 路由 (~150行)
│   │   ├── feishu.js               # 飞书路由 (~150行)
│   │   ├── multimodal.js           # 多模态路由 (~100行)
│   │   └── admin.js                # 管理接口 (~100行)
│   │
│   ├── services/
│   │   ├── zhipu.js                # 智谱 AI 服务 (~200行)
│   │   ├── openclaw.js             # OpenClaw 服务 (~200行)
│   │   ├── feishu.js               # 飞书服务 (~150行)
│   │   ├── voice.js                # 语音服务 (~150行)
│   │   └── storage.js              # 存储服务 (~100行)
│   │
│   ├── middleware/
│   │   ├── auth.js                 # 认证中间件 (~50行)
│   │   ├── error.js                # 错误处理 (~50行)
│   │   └── logger.js               # 日志中间件 (~50行)
│   │
│   └── config/
│       ├── index.js                # 配置入口 (~50行)
│       ├── agents.js               # Agent 配置 (~100行)
│       └── prompts.js              # 提示词配置 (~200行)
│
├── starclaw/                       # 已有的核心引擎
│   ├── executor.js
│   ├── ContextEngine.js
│   ├── WorkflowEngine.js
│   └── ModelRouter.js
│
└── public/                         # 前端页面
```

### 拆分后的入口文件

```javascript
// server/index.js
const app = require('./app');
const { initServices } = require('./services');

async function start() {
    // 初始化所有服务
    await initServices();
    
    // 启动服务器
    const PORT = process.env.PORT || 3003;
    app.listen(PORT, () => {
        console.log(`[StarClaw] 服务器启动: http://localhost:${PORT}`);
    });
}

start().catch(console.error);
```

---

## 三、向量搜索性能优化

### 当前问题

`SimpleVectorStore` 使用简单的特征哈希：

```javascript
// 当前实现 - 效果有限
embed(text) {
    const words = text.toLowerCase().split(/\s+/);
    words.forEach((word, i) => {
        const hash = this.hashWord(word);
        vector[pos] += hash;
    });
}
```

**缺点**：
- 无法捕获语义相似性
- 中文支持差（按空格分词）
- 向量维度低（384维）

### 优化方案

#### 方案A：使用 Ollama 本地嵌入模型

```javascript
// context/OllamaEmbedding.js
const axios = require('axios');

class OllamaEmbedding {
    constructor(baseUrl = 'http://127.0.0.1:11434', model = 'nomic-embed-text') {
        this.baseUrl = baseUrl;
        this.model = model;
    }
    
    async embed(text) {
        const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
            model: this.model,
            prompt: text
        });
        return response.data.embedding; // 768维高质量向量
    }
    
    async embedBatch(texts) {
        return Promise.all(texts.map(t => this.embed(t)));
    }
}

module.exports = { OllamaEmbedding };
```

#### 方案B：使用智谱 AI Embedding API

```javascript
// context/ZhipuEmbedding.js
const axios = require('axios');

class ZhipuEmbedding {
    constructor(apiKey, baseUrl = 'https://open.bigmodel.cn/api/paas/v4') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    
    async embed(text) {
        const response = await axios.post(
            `${this.baseUrl}/embeddings`,
            {
                model: 'embedding-2',
                input: text
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data.data[0].embedding; // 1024维向量
    }
}
```

#### 方案C：集成向量数据库

对于大规模场景，建议使用：
- **ChromaDB** - 轻量级，适合本地
- **Milvus** - 生产级，支持分布式
- **Pinecone** - 云服务，无需维护

```javascript
// context/ChromaStore.js
const { ChromaClient } = require('chromadb');

class ChromaStore {
    constructor() {
        this.client = new ChromaClient();
        this.collection = null;
    }
    
    async init() {
        this.collection = await this.client.createCollection({
            name: 'starclaw_memory',
            metadata: { description: 'StarClaw 记忆系统' }
        });
    }
    
    async add(id, text, metadata = {}) {
        await this.collection.add({
            ids: [id],
            documents: [text],
            metadatas: [metadata]
        });
    }
    
    async search(query, nResults = 5) {
        const results = await this.collection.query({
            queryTexts: [query],
            nResults
        });
        return results;
    }
}
```

### 推荐配置

```javascript
// context/ContextEngine.js 改进
const { OllamaEmbedding } = require('./OllamaEmbedding');
const { ZhipuEmbedding } = require('./ZhipuEmbedding');

class ContextEngine {
    constructor(config) {
        // 智能选择嵌入服务
        if (config.ollama?.enabled) {
            this.embedding = new OllamaEmbedding(
                config.ollama.baseUrl,
                config.ollama.model || 'nomic-embed-text'
            );
            console.log('[ContextEngine] 使用 Ollama 嵌入');
        } else if (config.zhipu?.apiKey) {
            this.embedding = new ZhipuEmbedding(config.zhipu.apiKey);
            console.log('[ContextEngine] 使用智谱 AI 嵌入');
        } else {
            this.embedding = new SimpleVectorStore(config.vectorPath);
            console.log('[ContextEngine] 使用简化嵌入（降级模式）');
        }
    }
}
```

---

## 四、工作流模板扩展

### 新增模板

```javascript
// workflow/templates.js

const WORKFLOW_TEMPLATES = {
    // ========== 现有模板 ==========
    content_creation: { /* ... */ },
    marketing_campaign: { /* ... */ },
    code_development: { /* ... */ },
    strategic_decision: { /* ... */ },
    
    // ========== 新增模板 ==========
    
    // 产品发布工作流
    product_launch: {
        name: '产品发布',
        description: '从产品定位到市场推广的完整流程',
        steps: [
            { type: 'agent', agent: 'cmo_product', action: '产品定位分析', outputKey: 'positioning' },
            { type: 'parallel', steps: [
                { type: 'agent', agent: 'creative_comedy', action: '宣传创意', inputKey: 'positioning', outputKey: 'creative' },
                { type: 'agent', agent: 'production_visual', action: '视觉设计', inputKey: 'positioning', outputKey: 'visual' },
                { type: 'agent', agent: 'music_director', action: '宣传配乐', inputKey: 'positioning', outputKey: 'music' }
            ]},
            { type: 'agent', agent: 'market_youth', action: '社媒传播方案', inputKey: 'creative', outputKey: 'socialPlan' },
            { type: 'agent', agent: 'production_management', action: '执行排期', outputKey: 'schedule' }
        ]
    },
    
    // 危机公关工作流
    crisis_management: {
        name: '危机公关',
        description: '快速响应和危机处理流程',
        steps: [
            { type: 'agent', agent: 'cro', action: '危机风险评估', outputKey: 'risk' },
            { type: 'parallel', steps: [
                { type: 'agent', agent: 'cso', action: '应对策略', inputKey: 'risk', outputKey: 'strategy' },
                { type: 'agent', agent: 'production_quality', action: '合规审查', inputKey: 'risk', outputKey: 'compliance' }
            ]},
            { type: 'agent', agent: 'coo_domestic', action: '舆论引导', inputKey: 'strategy', outputKey: 'guidance' },
            { type: 'agent', agent: 'ceo', action: '最终决策', outputKey: 'decision' }
        ]
    },
    
    // 内容审核工作流
    content_review: {
        name: '内容审核',
        description: '多维度内容审核流程',
        steps: [
            { type: 'agent', agent: 'production_quality', action: '品质初审', outputKey: 'quality' },
            { type: 'parallel', steps: [
                { type: 'agent', agent: 'cro', action: '风险评估', inputKey: 'quality', outputKey: 'risk' },
                { type: 'agent', agent: 'creative_drama', action: '内容价值评估', inputKey: 'quality', outputKey: 'value' }
            ]},
            { type: 'condition', condition: 'risk.level === "high"', 
                trueStep: { type: 'agent', agent: 'ceo', action: '高风险内容决策', outputKey: 'final' },
                falseStep: { type: 'agent', agent: 'production_management', action: '安排发布', outputKey: 'schedule' }
            }
        ]
    },
    
    // 品牌升级工作流
    brand_upgrade: {
        name: '品牌升级',
        description: '品牌形象全面提升流程',
        steps: [
            { type: 'agent', agent: 'brand_premium', action: '品牌现状分析', outputKey: 'analysis' },
            { type: 'agent', agent: 'production_visual', action: '视觉升级方案', inputKey: 'analysis', outputKey: 'visual' },
            { type: 'parallel', steps: [
                { type: 'agent', agent: 'cmo_international', action: '国际市场定位', outputKey: 'international' },
                { type: 'agent', agent: 'market_youth', action: '年轻化策略', outputKey: 'youth' }
            ]},
            { type: 'agent', agent: 'cmo_product', action: '整合营销方案', outputKey: 'marketing' },
            { type: 'openclaw', task: '生成品牌升级报告文档', inputKey: 'marketing', outputKey: 'report' }
        ]
    },
    
    // 数据分析工作流
    data_analysis: {
        name: '数据分析',
        description: '从数据收集到洞察输出',
        steps: [
            { type: 'openclaw', task: '收集相关数据', outputKey: 'data' },
            { type: 'skill', skill: 'data_processing', inputKey: 'data', outputKey: 'processed' },
            { type: 'parallel', steps: [
                { type: 'agent', agent: 'cfo', action: '财务数据分析', inputKey: 'processed', outputKey: 'financial' },
                { type: 'agent', agent: 'cro', action: '风险数据评估', inputKey: 'processed', outputKey: 'risk' },
                { type: 'agent', agent: 'cmo_product', action: '市场数据分析', inputKey: 'processed', outputKey: 'market' }
            ]},
            { type: 'agent', agent: 'ceo', action: '综合决策建议', outputKey: 'insight' }
        ]
    },
    
    // 用户调研工作流
    user_research: {
        name: '用户调研',
        description: '用户需求洞察研究流程',
        steps: [
            { type: 'agent', agent: 'market_youth', action: '目标用户定义', outputKey: 'target' },
            { type: 'parallel', steps: [
                { type: 'agent', agent: 'coo_domestic', action: '问卷设计', inputKey: 'target', outputKey: 'survey' },
                { type: 'agent', agent: 'creative_idol', action: '访谈大纲', inputKey: 'target', outputKey: 'interview' }
            ]},
            { type: 'openclaw', task: '发布问卷并收集数据', inputKey: 'survey', outputKey: 'responses' },
            { type: 'agent', agent: 'cfo', action: '数据分析', inputKey: 'responses', outputKey: 'analysis' },
            { type: 'agent', agent: 'cmo_product', action: '用户画像输出', inputKey: 'analysis', outputKey: 'persona' }
        ]
    }
};
```

---

## 五、统一配置管理

### 配置架构

```javascript
// config/index.js
const fs = require('fs');
const path = require('path');

class ConfigManager {
    constructor() {
        this.config = {};
        this.loadConfig();
    }
    
    loadConfig() {
        // 1. 加载 .env
        require('dotenv').config();
        
        // 2. 加载 starclaw.json
        const starclawPath = path.join(__dirname, '../starclaw/starclaw.json');
        if (fs.existsSync(starclawPath)) {
            this.config.starclaw = JSON.parse(fs.readFileSync(starclawPath, 'utf-8'));
        }
        
        // 3. 环境变量覆盖
        this.config.env = {
            port: parseInt(process.env.PORT) || 3003,
            
            // 智谱 AI
            zhipu: {
                apiKey: process.env.ZHIPU_API_KEY,
                baseUrl: process.env.ZHIPU_API_BASE || 'https://open.bigmodel.cn/api/paas/v4'
            },
            
            // OpenClaw
            openclaw: {
                enabled: process.env.OPENCLAW_ENABLED === 'true',
                api: process.env.OPENCLAW_API || 'http://127.0.0.1:18789',
                token: process.env.OPENCLAW_TOKEN,
                workspace: process.env.OPENCLAW_WORKSPACE
            },
            
            // 飞书
            feishu: {
                appId: process.env.FEISHU_APP_ID,
                appSecret: process.env.FEISHU_APP_SECRET
            },
            
            // 多模态
            tts: {
                server: process.env.TTS_SERVER || 'http://127.0.0.1:5050',
                edgeServer: process.env.EDGE_TTS_SERVER || 'http://127.0.0.1:5051'
            },
            
            // 模型路由
            models: {
                moonshot: { apiKey: process.env.MOONSHOT_API_KEY },
                deepseek: { apiKey: process.env.DEEPSEEK_API_KEY }
            }
        };
        
        // 4. 合并默认配置
        this.config.defaults = {
            timeout: 30000,
            maxRetries: 3,
            maxHistory: 50,
            maxConcurrent: 4
        };
    }
    
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
    }
    
    validate() {
        const errors = [];
        
        if (!this.get('env.zhipu.apiKey')) {
            errors.push('ZHIPU_API_KEY 未配置');
        }
        
        if (this.get('env.openclaw.enabled') && !this.get('env.openclaw.token')) {
            errors.push('OPENCLAW_TOKEN 未配置');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = new ConfigManager();
```

### 使用示例

```javascript
// 在各个模块中使用
const config = require('./config');

// 获取配置
const apiKey = config.get('env.zhipu.apiKey');
const timeout = config.get('defaults.timeout', 30000);

// 检查配置
const validation = config.validate();
if (!validation.valid) {
    console.error('配置错误:', validation.errors);
}
```

---

## 六、实施优先级

| 优化项 | 优先级 | 工作量 | 影响 |
|--------|--------|--------|------|
| 安全加固 | 🔴 P0 | 2h | 高 |
| 配置管理统一 | 🟡 P1 | 2h | 中 |
| 向量搜索优化 | 🟡 P1 | 4h | 高 |
| 工作流模板扩展 | 🟢 P2 | 2h | 中 |
| 服务器拆分 | 🟢 P2 | 4h | 低 |

---

## 七、下一步行动

```bash
# 1. 应用安全补丁（已完成）
cd starclaw
# 已创建 security-patch.js 和 executor-secure.js

# 2. 测试 OpenClaw 浏览器操作
# 确保 OpenClaw 网关运行中
# 访问 http://localhost:3003/voice.html
# 测试: "帮我打开浏览器搜索今天的新闻"

# 3. 优化向量搜索（可选）
# 安装 Ollama
# 拉取嵌入模型: ollama pull nomic-embed-text

# 4. 部署新工作流模板
# 将 templates.js 内容合并到 WorkflowEngine.js
```

---

**文档生成时间**：2026-03-26  
**StarClaw 版本**：v2.0.0  
**OpenClaw 集成状态**：✅ 已启用
