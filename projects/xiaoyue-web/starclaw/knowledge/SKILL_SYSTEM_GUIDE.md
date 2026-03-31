# StarClaw 技能系统使用指南

## 概述

StarClaw 技能系统是一个完整的技能管理框架，参考了 WorkBuddy (腾讯代码助手) 的扩展系统和 OpenClaw 的技能系统设计，同时保留了 StarClaw 自己的特色：

### StarClaw 的特色

1. **明星团队协作** - 每个技能可以关联多个 AI 明星智能体
2. **工作流集成** - 技能可以无缝集成到工作流引擎中
3. **记忆系统联动** - 技能可以访问上下文记忆和知识库
4. **多模型路由** - 智能选择最佳模型执行技能
5. **MCP 集成** - 支持 Model Context Protocol 扩展

## 快速开始

### 1. 查看已安装技能

```bash
cd starclaw/scripts
node install-skill.js --list
```

或在浏览器中访问：`http://localhost:3000/skill-manager.html`

### 2. 从技能市场安装

**命令行方式：**
```bash
# 查看技能市场
node install-skill.js --market

# 安装技能
node install-skill.js https://github.com/user/skill-name.git
```

**Web 界面方式：**
1. 访问 `http://localhost:3000/skill-manager.html`
2. 切换到"技能市场"标签
3. 点击"安装"按钮

### 3. 从本地安装

```bash
node install-skill.js ./path/to/my-skill
```

### 4. 从 npm 安装

```bash
node install-skill.js npm://openclaw-skill-example
```

## 技能文件结构

### 标准技能目录结构

```
my-skill/
├── SKILL.md              # 技能定义文件（必需）
├── package.json          # 依赖配置（可选）
├── src/                  # 源代码（可选）
│   ├── index.js         # 主入口
│   └── utils/           # 工具函数
├── prompts/              # 提示词模板（可选）
│   └── templates.md
├── tests/                # 测试文件（可选）
│   └── test.js
└── README.md             # 说明文档（可选）
```

### SKILL.md 文件格式

```markdown
---
name: my-skill
title: 我的技能
version: 1.0.0
description: 技能描述
author: Your Name
agents:
  - cto
  - ceo
allowed-tools:
  - Bash
  - Read
  - Write
tags:
  - 标签1
  - 标签2
category: development
---

# 技能标题

## 功能描述
详细描述技能的功能和用途。

## 使用场景
- 场景1
- 场景2

## 输入格式
```json
{
  "param1": "value1",
  "param2": "value2"
}
```

## 输出格式
```markdown
# 输出标题
...
```

## 示例调用
用户: "执行某个任务"
输出: 预期输出示例
```

## API 接口

### 技能管理 API

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/skills` | GET | 获取已安装技能列表 |
| `/api/skills/market` | GET | 获取技能市场列表 |
| `/api/skills/search?q=keyword` | GET | 搜索技能 |
| `/api/skills/:skillId` | GET | 获取技能详情 |
| `/api/skills/install` | POST | 安装技能 |
| `/api/skills/:skillId/uninstall` | POST | 卸载技能 |
| `/api/skills/:skillId/enable` | POST | 启用技能 |
| `/api/skills/:skillId/disable` | POST | 禁用技能 |
| `/api/skills/:skillId/execute` | POST | 执行技能 |

### 安装技能示例

```javascript
// 通过 API 安装技能
fetch('/api/skills/install', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'https://github.com/user/skill.git',
    id: 'my-skill',
    autoEnable: true
  })
});
```

### 执行技能示例

```javascript
// 通过 API 执行技能
fetch('/api/skills/code_development/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: {
      task: '写一个 Python 爬虫',
      language: 'Python'
    },
    context: {
      sessionId: 'session-123',
      agent: 'cto'
    }
  })
});
```

## 与 OpenClaw 的兼容性

### 兼容 OpenClaw 技能格式

StarClaw 完全兼容 OpenClaw 的技能格式：

1. **SKILL.md 格式** - 使用相同的 Frontmatter 格式
2. **技能调用** - 支持通过 LLM 执行技能定义
3. **安装方式** - 支持 Git、npm、本地路径安装

### 从 OpenClaw 迁移

如果你有 OpenClaw 技能，可以直接复制到 StarClaw：

```bash
# 方法1：直接复制
cp -r ~/.openclaw/skills/my-skill starclaw/skills/

# 方法2：通过安装命令
node install-skill.js ~/.openclaw/skills/my-skill
```

## 与 WorkBuddy 的对比

| 特性 | StarClaw | WorkBuddy | OpenClaw |
|------|----------|-----------|----------|
| **技能格式** | SKILL.md | VSCode Extension | SKILL.md |
| **安装方式** | Git/npm/本地 | VSIX/Marketplace | Git/npm/本地 |
| **执行方式** | LLM + 工作流 | VSCode API | LLM + Agent |
| **智能体** | 18位明星团队 | 无 | 单一 Agent |
| **记忆系统** | ✅ 多级记忆 | ❌ 无 | ✅ 简单记忆 |
| **工作流** | ✅ 完整引擎 | ❌ 无 | ⚠️ 基础支持 |
| **模型路由** | ✅ 智能路由 | ❌ 单模型 | ⚠️ 简单路由 |
| **MCP 支持** | ✅ 集成 | ✅ 集成 | ⚠️ 规划中 |
| **Web 管理界面** | ✅ 有 | ✅ 有 | ❌ 无 |

## StarClaw 特色功能

### 1. 明星团队协作

每个技能可以指定关联的 AI 明星：

```yaml
---
agents:
  - ceo      # 埃隆·马斯克 - 战略决策
  - cto      # OpenClaw创始人 - 技术架构
  - cfo      # 沃伦·巴菲特 - 成本评估
---
```

执行时，系统会自动路由到对应的明星智能体。

### 2. 工作流集成

在工作流中调用技能：

```javascript
{
  "steps": [
    {
      "type": "skill",
      "skill": "code_development",
      "inputKey": "userRequest",
      "outputKey": "codeResult"
    },
    {
      "type": "agent",
      "agent": "cto",
      "inputKey": "codeResult",
      "outputKey": "reviewResult"
    }
  ]
}
```

### 3. 记忆系统集成

技能可以访问上下文记忆：

```javascript
// 在技能执行时
const context = {
  memories: await contextEngine.search(query),
  knowledge: await knowledgeBase.get(skillId),
  history: await sessionManager.getHistory(sessionId)
};
```

### 4. 智能模型路由

系统自动选择最佳模型执行技能：

```javascript
// 根据技能类型选择模型
const model = modelRouter.route({
  skill: 'code_development',
  complexity: 'high',
  privacy: 'normal'
});
// 结果: 'zhipu/glm-4-flash' 或 'ark/ark-code-latest'
```

### 5. MCP 集成

支持 Model Context Protocol：

```javascript
// MCP 集成示例
{
  "mcp": {
    "servers": {
      "filesystem": {
        "command": "mcp-server-filesystem",
        "args": ["--path", "/workspace"]
      }
    }
  }
}
```

## 技能开发指南

### 创建新技能

1. **创建技能目录**
```bash
mkdir -p starclaw/skills/my-skill
```

2. **编写 SKILL.md**
```bash
cat > starclaw/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
title: 我的技能
description: 技能描述
agents:
  - cto
---

# 我的技能

## 功能描述
详细描述...

## 使用示例
示例...
EOF
```

3. **注册技能**
```bash
node install-skill.js ./starclaw/skills/my-skill
```

### 技能最佳实践

1. **明确的输入输出格式**
   - 使用 JSON Schema 定义输入格式
   - 提供清晰的输出示例

2. **合理的智能体关联**
   - 技术技能关联 `cto`
   - 策略技能关联 `ceo`
   - 内容技能关联 `creative_*`

3. **详细的提示词**
   - 在 SKILL.md 中提供详细的执行指导
   - 包含错误处理说明

4. **版本管理**
   - 使用语义化版本号
   - 记录变更日志

## 故障排查

### 技能安装失败

```bash
# 检查 Git 是否安装
git --version

# 检查网络连接
curl -I https://github.com

# 查看详细错误
node install-skill.js <source> 2>&1 | tee error.log
```

### 技能执行失败

```bash
# 检查技能是否启用
node install-skill.js --info <skill-id>

# 查看技能内容
cat starclaw/skills/<skill-id>/SKILL.md

# 检查关联的智能体
cat starclaw/agents/registry.json
```

### 模型调用失败

```bash
# 检查 API Key
cat .env | grep API_KEY

# 测试模型连接
curl -X POST https://open.bigmodel.cn/api/paas/v4/chat/completions \
  -H "Authorization: Bearer $ZHIPU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"glm-4-flash","messages":[{"role":"user","content":"test"}]}'
```

## 高级用法

### 自定义技能源

```javascript
// 添加自定义技能市场
const market = new SkillMarket({
  marketUrl: 'https://your-skill-market.com/skills'
});
```

### 技能依赖管理

```json
{
  "name": "my-skill",
  "dependencies": {
    "axios": "^1.6.0",
    "cheerio": "^1.0.0"
  }
}
```

### 技能权限控制

```yaml
---
allowed-tools:
  - Read      # 只读文件
  - Bash(npm:*)  # 只允许 npm 命令
---
```

## 参考资料

- [OpenClaw 技能系统](https://github.com/anbeime/openclaw)
- [VSCode Extension API](https://code.visualstudio.com/api)
- [MCP 协议规范](https://modelcontextprotocol.io/)
- [StarClaw 明星团队](../agents/README.md)

## 更新日志

### v2.0.0 (2026-03-30)
- ✅ 实现完整的技能管理系统
- ✅ 支持 Git/npm/本地安装
- ✅ 兼容 OpenClaw 技能格式
- ✅ 集成明星团队系统
- ✅ 工作流引擎集成
- ✅ Web 管理界面

### v1.0.0 (2025-01-01)
- 基础技能系统
- SKILL.md 格式支持
