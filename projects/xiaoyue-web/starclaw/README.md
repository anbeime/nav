# StarClaw OS

**虚拟娱乐公司操作系统 - 18位具有实干能力的 AI 明星团队**

## 核心功能

### 四大核心模块

1. **记忆系统 (ContextEngine)**
   - 多级记忆：工作记忆、会话记忆、长期记忆
   - SQLite 结构化存储（sql.js 纯 JS 实现）
   - 向量语义搜索
   - 知识库集成
   - 记忆压缩与遗忘机制

2. **工作流引擎 (WorkflowEngine)**
   - 多步骤任务编排
   - Agent 协作调度
   - Skill 调用
   - OpenClaw 任务执行集成
   - 自然语言工作流解析

3. **模型路由器 (ModelRouter)**
   - 本地模型支持：Ollama / LocalAI
   - 云端模型支持：智谱 AI
   - 智能路由：隐私敏感任务强制本地
   - 成本优化：优先免费本地模型
   - 自动降级机制

4. **Web 管理控制台**
   - 可视化仪表盘
   - 明星团队管理
   - 记忆系统管理
   - 工作流监控
   - 模型路由配置
   - 实时系统日志

## 快速开始

### 方式一：一键安装
1. 双击 `StarClaw-Install.bat` 完成安装
2. 编辑 `.env` 文件，填入你的智谱 AI API Key
3. 双击桌面 `StarClaw` 图标启动

### 方式二：手动启动
```bash
npm install
npm start
# 或
node server-with-openclaw.js
```

访问地址：
- 对话界面：http://localhost:3000
- 管理控制台：http://localhost:3000/admin.html
- 语音版：http://localhost:3000/voice.html

## 明星团队

### 战略决策层
| 明星 | 职位 | 专长 | 召唤命令 |
|------|------|------|----------|
| 埃隆·马斯克 | CEO | 战略决策、第一性原理 | `[召唤:马斯克]` |
| 沃伦·巴菲特 | CFO | 财务管理、价值投资 | `[召唤:巴菲特]` |
| 乔治·索罗斯 | CRO | 风险预警、危机应对 | `[召唤:索罗斯]` |
| 唐纳德·特朗普 | CSO | 谈判策略、品牌建设 | `[召唤:特朗普]` |

### 营销运营层
| 明星 | 职位 | 专长 | 召唤命令 |
|------|------|------|----------|
| 雷军 | 联席CMO | 爆品营销、发布会 | `[召唤:雷军]` |
| 贾跃亭 | 联席CMO | 生态叙事、融资 | `[召唤:贾跃亭]` |
| 泰勒·斯威夫特 | 联席CMO | 国际市场、粉丝经济 | `[召唤:泰勒]` |
| 杨幂 | COO | 流量运营、变现 | `[召唤:杨幂]` |
| 侯明昊 | 市场总监 | Z世代、B站 | `[召唤:侯明昊]` |
| 黎明 | 品牌总监 | 高端品牌、格调 | `[召唤:黎明]` |

### 创意制作层
| 明星 | 职位 | 专长 | 召唤命令 |
|------|------|------|----------|
| 周星驰 | 喜剧创意总监 | 喜剧、搞笑剧本 | `[召唤:周星驰]` |
| 胡歌 | 戏剧创意总监 | 深度内容、角色 | `[召唤:胡歌]` |
| 任嘉伦 | 偶像内容总监 | 偶像陪伴、古风 | `[召唤:任嘉伦]` |
| 张艺谋 | 视觉总监 | 视觉设计、美学 | `[召唤:张艺谋]` |
| 周杰伦 | 音乐总监 | 音乐创作、配乐 | `[召唤:周杰伦]` |

### 执行保障层
| 明星 | 职位 | 专长 | 召唤命令 |
|------|------|------|----------|
| 刘德华 | 制片总监 | 项目管理、进度 | `[召唤:刘德华]` |
| 古天乐 | 品质总监 | 品质审核、合规 | `[召唤:古天乐]` |
| OpenClaw创始人 | CTO | 技术架构、代码开发 | `[召唤:OpenClaw]` |

## 工作流模板

### 内容创作
```
创意构思 → 内容深化 → 品质审核
周星驰 → 胡歌 → 古天乐
```

### 营销策划
```
市场分析 → [年轻用户策略 | 品牌策略] → 执行方案
雷军 → [侯明昊 | 黎明] → 杨幂
```

### 战略决策
```
问题定义 → [财务分析 | 风险评估 | 战略分析] → 综合决策
马斯克 → [巴菲特 | 索罗斯 | 特朗普] → 马斯克
```

### 代码开发
```
需求分析 → 代码生成 → 测试运行
CTO → Skill → OpenClaw
```

## API 接口

### 记忆系统
```
GET  /api/memory/search?query=关键词     # 搜索记忆
POST /api/memory/remember                # 添加记忆
DELETE /api/memory/:memoryId             # 遗忘记忆
GET  /api/memory/context                 # 获取上下文
GET  /api/memory/stats                   # 统计信息
```

### 工作流引擎
```
GET  /api/workflow/templates             # 获取模板列表
POST /api/workflow/run                   # 执行工作流
POST /api/workflow/parse                 # 自然语言解析
GET  /api/workflow/running               # 运行中的工作流
GET  /api/workflow/history               # 历史记录
```

### 模型路由器
```
GET  /api/models                         # 可用模型列表
GET  /api/models/stats                   # 使用统计
POST /api/models/routing                 # 设置路由策略
POST /api/smart-chat                     # 智能聊天
POST /api/embeddings                     # 生成向量
```

### 核心接口
```
POST /api/chat                           # 对话
GET  /api/agents                         # 明星列表
POST /api/starclaw/chat                  # 明星对话
GET  /api/health                         # 健康检查
```

## 目录结构

```
xiaoyue-web/
├── starclaw/                 # StarClaw 核心目录
│   ├── starclaw.json         # 主配置文件
│   ├── agents/               # 18位明星 Agent
│   │   ├── registry.json     # Agent 注册表
│   │   └── {id}/SOUL.md      # 明星人设
│   ├── skills/               # 技能系统
│   │   └── {skill}/SKILL.md  # 技能定义
│   ├── knowledge/            # 知识库
│   ├── context/              # 记忆系统
│   │   └── ContextEngine.js  # 核心引擎
│   ├── workflow/             # 工作流引擎
│   │   └── WorkflowEngine.js # 核心引擎
│   ├── models/               # 模型路由器
│   │   └── ModelRouter.js    # 核心引擎
│   ├── data/                 # 数据存储
│   │   ├── context.db        # SQLite 数据库
│   │   └── vectors.json      # 向量存储
│   ├── workspace/            # 工作区
│   └── sessions/             # 会话存储
├── public/                   # 前端页面
│   ├── index.html            # 对话界面
│   ├── voice.html            # 语音版界面
│   └── admin.html            # 管理控制台
├── server-with-openclaw.js   # 主服务器
├── package.json
└── .env                      # 配置文件
```

## 配置说明

编辑 `.env` 文件：

```env
# 智谱 AI API Key（必填）
ZHIPU_API_KEY=your_api_key_here

# OpenClaw 集成（可选）
OPENCLAW_ENABLED=false
OPENCLAW_API=http://127.0.0.1:18789
OPENCLAW_TOKEN=your_token_here

# Ollama（可选，本地模型）
# 默认连接 http://127.0.0.1:11434

# 服务端口
PORT=3000
```

## 技术栈

- **后端**: Node.js + Express
- **AI**: 智谱 GLM-4-Flash + Ollama（可选）
- **数据库**: sql.js（纯 JS SQLite）
- **向量**: 简化版向量存储（可升级）
- **多模态**: Edge-TTS（可选）
- **集成**: OpenClaw（可选）

## License

MIT License
