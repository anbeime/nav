# 🔗 AI123 发现导航

> 发现800+精选AI工具，按业务场景一键直达

[![部署状态](https://img.shields.io/badge/Vercel-部署成功-green)](https://ai123.miyucaicai.cn)
[![工具数量](https://img.shields.io/badge/AI工具-843+-blue)](https://ai123.miyucaicai.cn)
[![场景分类](https://img.shields.io/badge/场景-9个-orange)](https://ai123.miyucaicai.cn)

## 🌟 功能特性

- **智能场景导航** - 9大业务场景分类（智能办公、内容创作、AI编程、视频制作等）
- **快速筛选** - 支持地区筛选（全球/中国）、搜索过滤
- **一键访问** - 点击卡片直接跳转到对应AI工具官网
- **自动同步** - 每天自动从 aibase.com 同步最新AI工具数据
- **StarClaw入口** - 集成 StarClaw 智能体控制台
- **GEO智链方案** - 企业级品牌保护解决方案

## 🚀 快速访问

| 功能            | 地址                                                |
| --------------- | --------------------------------------------------- |
| **AI123首页**   | https://ai123.miyucaicai.cn                         |
| **GEO解决方案** | https://ai123.miyucaicai.cn/geo-solutions.html      |
| **GEO工作台**   | https://ai123.miyucaicai.cn/geochain-dashboard.html |
| **StarClaw**    | https://ai123.miyucaicai.cn/starclaw.html           |
| **场景中心**    | https://ai123.miyucaicai.cn/scenario-hub.html       |

## 📂 项目结构

```
ai123/
├── public/                    # 前端页面
│   ├── index.html           # 首页（工具导航）
│   ├── geo-solutions.html   # GEO解决方案市场
│   ├── geochain-dashboard.html  # GEO智链工作台
│   ├── starclaw.html        # StarClaw入口
│   └── scenario-hub.html    # 场景中心
├── data/
│   └── db.json              # AI工具数据库（843+工具）
├── scripts/
│   ├── sync-ai-tools.js     # 基础同步模块
│   └── sync-ai-tools-http.js # HTTP抓取版本
├── .github/
│   └── workflows/
│       └── sync-ai-tools.yml # 自动同步工作流
└── package.json
```

## 🔄 数据同步

### 手动同步

```bash
cd projects/ai123
npm install
npm run sync
```

### 自动同步

GitHub Actions 每天0点自动执行同步：

1. 从 aibase.com 获取最新AI工具
2. 合并去重
3. 按场景分类
4. 提交更新 → 触发Vercel部署

## 🎯 场景分类

| 场景        | 工具数 | 说明                              |
| ----------- | ------ | --------------------------------- |
| 💼 智能办公 | ~30    | ChatGPT、Claude、NotionAI等       |
| ✍️ 内容创作 | ~30    | Jasper、Grammarly、Copy.ai等      |
| 💻 AI编程   | ~30    | GitHub Copilot、Cursor、Codeium等 |
| 🎬 视频制作 | ~30    | Runway、Pika、HeyGen等            |
| 🎨 设计创意 | ~30    | Canva、Midjourney、Remove.bg等    |
| 📈 营销SEO  | ~30    | SEMrush、Ahrefs、HubSpot等        |
| 📊 数据分析 | ~30    | Tableau、PowerBI、Metabase等      |
| 📚 教育学习 | ~30    | Khanmigo、Duolingo、Quizlet等     |
| 🛒 电商运营 | ~30    | Shopify、Amazon工具等             |

## 🔧 本地开发

```bash
# 安装依赖
npm install

# 本地运行（Vercel CLI）
vercel dev

# 构建
vercel build
```

## 📝 更新日志

### 2026-04-18

- ✨ 用skill-store风格重写首页
- 📊 生成843个AI工具数据
- 🚀 添加StarClaw/GEO智链快速入口
- 🔄 配置GitHub Actions自动同步

---

**最后更新**: 2026-04-18  
**托管平台**: Vercel  
**数据源**: aibase.com
