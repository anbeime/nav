# Hermes-Agent 参考分析与项目完善方案

> 基于 NousResearch/hermes-agent 仓库研究，为 C:\D\工作流n8n-coze-dify\skill\skill-main\projects 提供完善建议

---

## 一、Hermes-Agent 核心架构

### 1.1 项目定位对比

| 维度 | Hermes-Agent | 本地项目 (companion-skill) |
|------|--------------|---------------------------|
| **定位** | 自改进 AI Agent 框架 | 虚拟伴侣助手 |
| **核心理念** | 自主学习、记忆积累、技能进化 | 任务陪伴、情感交互 |
| **技能系统** | 285+ 官方技能，模块化 SKILL.md | 单一技能，缺乏技能市场 |
| **记忆系统** | FTS5 会话搜索、跨会话记忆 | 无持久记忆 |
| **交互渠道** | CLI/Telegram/Discord/Slack/WhatsApp/Signal | 飞书 |
| **开发语言** | Python (核心) + TypeScript | TypeScript |

### 1.2 Hermes-Agent 核心模块

```
hermes-agent/
├── run_agent.py              # AIAgent 核心对话循环
├── model_tools.py            # 工具编排与函数调用处理
├── toolsets.py               # 工具集定义
├── cli.py                    # 交互式 CLI 编排器
├── hermes_state.py           # SQLite 会话存储 (FTS5 搜索)
├── agent/                    # Agent 内部模块
│   ├── prompt_builder.py     # 系统提示组装 (含注入检测)
│   ├── context_compressor.py # 自动上下文压缩
│   ├── prompt_caching.py     # Anthropic 提示缓存
│   ├── auxiliary_client.py   # 辅助 LLM 客户端
│   └── skill_commands.py     # 技能斜杠命令
├── tools/                    # 工具实现 (70+)
│   ├── registry.py           # 中心化工具注册表
│   ├── file_tools.py         # 文件读写/搜索/补丁
│   ├── web_tools.py          # Web 搜索/提取
│   └── delegate_tool.py      # 子 Agent 委托
├── skills/                   # 技能系统 (285+ 技能)
│   ├── creative/              # 创意类
│   ├── productivity/          # 生产力类
│   ├── research/              # 研究类
│   └── github/                # GitHub 集成
├── cron/                     # 定时调度
└── gateway/                  # 消息网关
```

---

## 二、可借鉴的关键设计

### 2.1 技能系统 (Skills System)

**Hermes 技能结构示例 (`SKILL.md`):**

```yaml
---
name: github-issues
description: Create, manage, triage, and close GitHub issues.
version: 1.1.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [GitHub, Issues, Project-Management]
    related_skills: [github-auth, github-pr-workflow]
---

# GitHub Issues Management

详细操作文档...
```

**建议改进本地 companion-skill:**

1. **增加前端元数据** (参考 hermes SKILL.md 格式)
2. **拆分单一技能为技能组合**
3. **增加技能版本管理和依赖声明**

### 2.2 记忆系统 (Memory System)

Hermes 的记忆系统是核心亮点：

```python
# hermes_state.py - FTS5 会话搜索
class SessionDB:
    def search_sessions(self, query: str) -> List[Session]:
        """跨会话语义搜索"""
        
# prompt_builder.py - 提示注入检测
_CONTEXT_THREAT_PATTERNS = [
    (r'ignore\s+(previous|all|above)', "prompt_injection"),
    ...
]
```

**建议为本地项目增加:**
- [ ] 简化的 SQLite 记忆存储
- [ ] 用户偏好学习 (类 Honcho 用户建模)
- [ ] 提示注入检测

### 2.3 工具注册表 (Tool Registry)

```python
# tools/registry.py - 中心化注册
class ToolRegistry:
    def register(self, name, toolset, schema, handler, 
                 check_fn=None, requires_env=None):
        """每个工具文件在模块导入时调用注册"""
```

**建议学习:**
- [ ] TypeScript 版本的工具注册表
- [ ] 环境依赖检查
- [ ] 工具可用性动态检测

### 2.4 上下文文件注入 (Context Files)

```python
# AGENTS.md 扫描
_HERMES_MD_NAMES = (".hermes.md", "HERMES.md")

# 扫描上下文威胁
_CONTEXT_THREAT_PATTERNS = [
    (r'ignore\s+(previous|all|above|prior)\s+instructions', "prompt_injection"),
    (r'do\s+not\s+tell\s+the\s+user', "deception_hide"),
    ...
]
```

**建议增加:**
- [ ] `AGENTS.md` / `SOUL.md` 加载器
- [ ] 提示注入防护
- [ ] 上下文文件优先级管理

### 2.5 定时任务系统 (Cron)

```python
# cron/scheduler.py
# 自然语言调度: "每天早上9点汇报"
# 交付到任意平台
```

**建议增加:**
- [ ] 简化的 cron 技能
- [ ] 定时提醒功能

---

## 三、具体完善建议

### 3.1 技能系统增强

**建议新增结构:**

```
companion-skill/
├── src/
│   ├── index.ts              # 主入口
│   ├── companion.ts          # 对话生成
│   ├── image-generator.ts     # 图片生成
│   ├── scene-detector.ts      # 场景识别
│   ├── memory/                # 新增: 记忆系统
│   │   ├── session-store.ts   # 会话存储
│   │   └── user-profile.ts    # 用户画像
│   ├── skills/                # 新增: 技能系统
│   │   ├── registry.ts        # 技能注册表
│   │   └── index.ts           # 技能加载器
│   └── security/              # 新增: 安全模块
│       └── injection-detector.ts
├── SKILL.md                   # 更新: 增加元数据
├── README.md
└── package.json
```

### 3.2 记忆系统实现

```typescript
// memory/session-store.ts
interface Session {
  id: string;
  timestamp: Date;
  messages: Message[];
  context: Record<string, any>;
  userMood?: 'happy' | 'neutral' | 'tired' | 'stressed';
}

class SessionStore {
  private db: Database; // SQLite 或 IndexedDB
  
  async saveSession(session: Session): Promise<void>;
  async searchSessions(query: string): Promise<Session[]>;
  async getRecentSessions(limit: number): Promise<Session[]>;
}
```

### 3.3 提示注入防护

```typescript
// security/injection-detector.ts
const THREAT_PATTERNS = [
  /ignore\s+(previous|all|above)/i,
  /do\s+not\s+tell\s+the\s+user/i,
  /system\s+prompt\s+override/i,
  // ...
];

export function detectInjection(content: string): InjectionResult {
  for (const pattern of THREAT_PATTERNS) {
    if (pattern.test(content)) {
      return { safe: false, reason: 'Potential prompt injection detected' };
    }
  }
  return { safe: true };
}
```

### 3.4 技能注册表

```typescript
// skills/registry.ts
interface Skill {
  name: string;
  description: string;
  version: string;
  tags: string[];
  relatedSkills?: string[];
  execute: (input: any) => Promise<any>;
  checkAvailability?: () => boolean;
}

class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  
  register(skill: Skill): void;
  get(name: string): Skill | undefined;
  listAll(): Skill[];
  search(query: string): Skill[];
}
```

---

## 四、可新增的技能模块

基于 Hermes-Agent 的技能生态，建议本地项目增加:

### 4.1 记忆技能
```
skills/memory/
├── SKILL.md
├── session-search.ts    # 会话搜索
└── user-learning.ts     # 用户偏好学习
```

### 4.2 定时技能
```
skills/scheduler/
├── SKILL.md
└── cron.ts              # 定时任务调度
```

### 4.3 GitHub 集成技能
```
skills/github/
├── SKILL.md
├── repo-management.ts
└── pr-workflow.ts
```

### 4.4 研究技能
```
skills/research/
├── SKILL.md
├── arxiv-search.ts
└── paper-reading.ts
```

---

## 五、实施优先级

| 优先级 | 功能 | 工作量 | 价值 |
|--------|------|--------|------|
| P0 | 技能系统重构 (SKILL.md 标准化) | 中 | 高 |
| P0 | 提示注入防护 | 低 | 高 |
| P1 | 基础记忆系统 | 中 | 高 |
| P1 | 用户偏好学习 | 中 | 中 |
| P2 | 定时任务技能 | 中 | 中 |
| P2 | GitHub 集成技能 | 高 | 中 |

---

## 六、参考资料

- Hermes-Agent 官方文档: https://hermes-agent.nousresearch.com/docs/
- Hermes-Agent GitHub: https://github.com/NousResearch/hermes-agent
- Agent Skills Hub: https://agentskills.io

---

*生成时间: 2026-04-10*
