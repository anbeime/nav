---
name: team_builder
title: 团队构建器
version: 1.0.0
description: 分析需求并动态创建新的多智能体团队，实现 StarClaw 的自我进化能力
agents:
  - meta_architect
  - cto
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
tags:
  - 元能力
  - 动态创建
  - 自我进化
  - 团队构建
category: meta
---

# 团队构建器技能

## 功能描述
这是 StarClaw 的核心元能力技能。它可以分析用户的新需求，设计并创建新的智能体团队来完成该需求。

## 使用场景
- 用户提出全新领域的任务需求
- 现有团队无法满足的复杂任务
- 需要组建临时项目团队
- 系统需要扩展新能力领域

## 输入格式
```json
{
  "requirement": "需求描述（自然语言）",
  "domain": "领域（可选）",
  "priority": "high|medium|low",
  "deadline": "截止时间（可选）"
}
```

## 输出格式
```json
{
  "success": true,
  "team": {
    "teamId": "new_team_xxx",
    "name": "团队名称",
    "agents": ["agent1", "agent2"],
    "skills": ["skill1", "skill2"]
  },
  "files_created": [
    "agents/new_agent/SOUL.md",
    "skills/new_skill/SKILL.md"
  ],
  "validation": {
    "agents_registered": true,
    "skills_registered": true,
    "test_passed": true
  }
}
```

## 执行步骤

### 步骤 1：需求分析
- 解析用户需求的自然语言描述
- 识别任务类型、领域、复杂度
- 确定需要的能力集合

### 步骤 2：团队设计
- 设计智能体角色分工
- 规划技能组合
- 定义协作流程

### 步骤 3：创建智能体定义
为每个新智能体创建 SOUL.md：
```markdown
# 智能体名称 - StarClaw 职位

## 身份
- **名字**：智能体名
- **职位**：职位描述
- **团队**：所属团队
- **召唤**：`[召唤:智能体名]`

## 人设核心
...

## 性格特质
...

## 工作方式
...
```

### 步骤 4：创建技能定义
为团队创建配套 SKILL.md：
```markdown
---
name: skill_name
title: 技能标题
agents:
  - agent1
  - agent2
---

# 技能描述

## 功能描述
...

## 执行步骤
...
```

### 步骤 5：注册到系统
- 更新 agents/registry.json 添加新智能体
- 更新 skills/skills.json 添加新技能
- 重新加载系统配置

### 步骤 6：验证测试
- 检查文件是否创建成功
- 验证 JSON 格式是否正确
- 测试新智能体是否能被召唤

## 示例调用

### 输入
```
我需要一个专门做电商数据分析的团队，包括数据采集、清洗、分析、可视化全套能力
```

### 输出
创建团队：
- 数据采集师 - 负责爬取电商数据
- 数据分析师 - 负责数据清洗和分析
- 可视化设计师 - 负责图表和报告
- 电商运营顾问 - 负责业务解读

配套技能：
- ecommerce_data_collection
- data_analysis
- visualization
- business_insight

## 注意事项
1. 创建前检查是否已存在类似团队
2. 新智能体的 ID 不能与现有冲突
3. 创建后必须验证才能返回成功
4. 记录创建历史到记忆系统
