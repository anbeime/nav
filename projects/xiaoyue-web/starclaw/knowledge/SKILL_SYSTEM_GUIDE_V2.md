# StarClaw 技能系统使用指南 v2.0

## 概述

StarClaw 技能系统是一个完整的技能管理框架,参考了 WorkBuddy (腾讯代码助手) 的扩展系统和 OpenClaw 的技能系统设计,并集成了本地技能库管理能力。

### StarClaw 技能系统特色

1. **本地技能库集成** - 自动扫描和导入本地已有技能
2. **智能分类系统** - 12大分类,自动识别技能类型
3. **多源安装** - 支持 Git、本地路径、npm 多种安装方式
4. **明星团队协作** - 每个技能可以关联多个 AI 明星智能体
5. **工作流集成** - 技能可以无缝集成到工作流引擎中
6. **记忆系统联动** - 技能可以访问上下文记忆和知识库
7. **多模型路由** - 智能选择最佳模型执行技能

## 快速开始

### 1. 一键设置

```bash
cd xiaoyue-web/starclaw/scripts
node setup-skill-system.js
```

这将自动:
- ✅ 检查环境依赖
- ✅ 创建必要目录
- ✅ 安装所需依赖
- ✅ 配置技能市场
- ✅ 批量导入本地技能
- ✅ 生成启动脚本

### 2. 启动服务

```bash
# 方法1: 使用启动脚本
./start-skill-system.bat

# 方法2: 直接启动
node server-with-openclaw.js
```

### 3. 访问界面

启动后访问: `http://localhost:3000/skill-store.html`

## 技能分类

StarClaw 技能系统包含 12 大分类:

| 分类 | 图标 | 描述 | 示例技能 |
|------|------|------|----------|
| 内容创作 | ✍️ | 文案、视频、音频、图片创作 | 视频创作、文案生成、音乐创作 |
| 开发工具 | 💻 | 代码开发、调试、测试 | 代码生成、调试工具、测试框架 |
| 数据分析 | 📊 | 数据处理、可视化、分析报告 | 数据分析、图表生成、统计报告 |
| 办公效率 | 📁 | 文档、表格、PPT、PDF处理 | PDF处理、Word生成、Excel分析 |
| 营销推广 | 📢 | 营销策划、推广文案、社媒运营 | 小红书运营、微信推广、营销策划 |
| 视觉设计 | 🎨 | 图片设计、视频制作、UI设计 | 海报设计、视频编辑、UI设计 |
| 商务办公 | 💼 | 简历、求职、商业计划 | 简历生成、商业计划书、求职信 |
| 生活助手 | 🏠 | 日程管理、天气查询、生活服务 | 天气查询、日程管理、记账助手 |
| 教育学习 | 📚 | 学习辅导、知识问答、翻译 | 论文分析、翻译工具、学习辅导 |
| 技术研究 | 🔬 | 论文分析、技术研究、调研报告 | 学术搜索、技术调研、专利分析 |
| 电商运营 | 🛒 | 商品文案、营销视频、运营分析 | 商品视频、电商文案、运营分析 |
| 其他 | 🔧 | 其他类型技能 | 自定义工具、实验性功能 |

## 使用方式

### Web 界面

访问 `http://localhost:3000/skill-store.html` 进行可视化管理:

1. **浏览技能** - 按分类查看所有可用技能
2. **搜索技能** - 通过关键词快速定位
3. **安装技能** - 一键安装本地或在线技能
4. **查看详情** - 查看技能文档和配置
5. **管理技能** - 启用/禁用/卸载技能

### 命令行工具

```bash
# 列出已安装技能
node install-skill.js --list

# 查看技能市场
node install-skill.js --market

# 搜索技能
node install-skill.js --search 视频创作

# 安装技能
node install-skill.js https://github.com/user/skill.git

# 查看技能详情
node install-skill.js --info skill_id

# 启用/禁用技能
node install-skill.js --enable skill_id
node install-skill.js --disable skill_id

# 卸载技能
node install-skill.js --uninstall skill_id
```

### API 调用

#### 获取已安装技能
```bash
GET /api/skills
```

#### 获取技能市场
```bash
GET /api/skills/market
```

#### 按分类获取技能
```bash
GET /api/skills/categories
```

#### 搜索技能
```bash
GET /api/skills/search?q=关键词
```

#### 安装技能
```bash
POST /api/skills/install
Content-Type: application/json

{
  "source": "https://github.com/user/skill.git",
  "id": "skill_id",
  "autoEnable": true
}
```

#### 卸载技能
```bash
POST /api/skills/:skillId/uninstall
```

#### 启用/禁用技能
```bash
POST /api/skills/:skillId/enable
POST /api/skills/:skillId/disable
```

#### 刷新缓存
```bash
POST /api/skills/refresh-cache
```

## 批量导入本地技能

如果您有大量本地技能,可以使用批量导入工具:

```bash
# 使用默认配置
node batch-import-skills.js

# 指定源路径
node batch-import-skills.js --source D:\my-skills

# 指定源和目标路径
node batch-import-skills.js --source D:\my-skills --target E:\starclaw\skills
```

导入工具会自动:
- 扫描指定目录的所有技能
- 解析技能元数据
- 智能分类和打标签
- 复制到目标目录
- 注册到技能系统

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
category: development
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
---

# 技能标题

## 功能描述
详细描述技能的功能和用途。

## 使用场景
- 场景1
- 场景2

## 输入格式
\`\`\`json
{
  "param1": "value1",
  "param2": "value2"
}
\`\`\`

## 输出格式
\`\`\`markdown
# 输出标题
...
\`\`\`

## 示例调用
用户: "执行某个任务"
输出: 预期输出示例
```

## 本地技能库配置

默认本地技能库路径: `C:\D\工作流n8n-coze-dify\skill`

您可以通过以下方式修改:

### 1. 环境变量
```bash
export LOCAL_SKILL_PATH=/path/to/skills
```

### 2. 配置文件
编辑 `starclaw/services/EnhancedSkillMarket.js`:
```javascript
this.localSkillPath = config.localSkillPath || '/your/custom/path';
```

### 3. API 参数
```bash
POST /api/skills/install
{
  "source": "local",
  "localPath": "/custom/path/to/skill"
}
```

## 与 WorkBuddy 的对比

| 特性 | StarClaw | WorkBuddy |
|------|----------|-----------|
| 技能管理 | ✅ | ✅ |
| 本地技能库 | ✅ 自动扫描 | ❌ |
| 分类系统 | ✅ 12大类 | ✅ 按功能分类 |
| 技能市场 | ✅ | ✅ SkillHub |
| 多源安装 | ✅ Git/本地/npm | ✅ 主要npm |
| 明星智能体 | ✅ 特色功能 | ❌ |
| 工作流集成 | ✅ | ✅ MCP |
| Web界面 | ✅ 增强版 | ✅ |

## 最佳实践

### 1. 技能开发
- 遵循标准目录结构
- 完善的 SKILL.md 文档
- 清晰的输入输出定义
- 合理的分类和标签

### 2. 技能管理
- 定期更新已安装技能
- 及时清理不用的技能
- 合理启用/禁用技能
- 备份重要的自定义技能

### 3. 性能优化
- 使用缓存减少网络请求
- 批量操作减少开销
- 按需加载技能
- 监控技能执行性能

## 故障排除

### Q: 技能安装失败?
检查:
1. 网络连接是否正常
2. Git 是否已安装
3. 目标目录是否有写入权限
4. 技能源是否有效

### Q: 本地技能无法识别?
检查:
1. 技能目录是否包含 SKILL.md
2. 目录路径是否正确
3. 文件权限是否正确

### Q: Web 界面无法访问?
检查:
1. 服务器是否正常启动
2. 端口是否被占用
3. 路由配置是否正确

## 相关文档

- [技能开发指南](./DEVELOPER_GUIDE.md)
- [API 文档](./API_REFERENCE.md)
- [工作流集成](./WORKFLOW_INTEGRATION.md)
- [最佳实践](./BEST_PRACTICES.md)

## 更新日志

### v2.0.0 (2024-04-01)
- ✨ 新增本地技能库自动扫描
- ✨ 新增增强版技能市场服务
- ✨ 新增12大分类系统
- ✨ 新增批量导入工具
- 🎨 重构Web界面,参考WorkBuddy设计
- 📝 完善文档和使用指南

### v1.0.0 (2024-01-01)
- 🎉 初始版本
- ✅ 基础技能管理功能
- ✅ Git/npm/本地安装支持
- ✅ 技能启用/禁用/卸载
