# GEO智链平台 - 技术实施架构文档 V2.0

> 基于DRD需求文档，将AI123、STARCLAW、Skill商店、热点引擎四大组件深度整合

## 一、现有资产分析

### 1.1 四大组件现状评估

| 组件 | 当前状态 | 技术栈 | 成熟度 | 整合优先级 |
|------|---------|--------|--------|-----------|
| **AI123导航站** | TOPGO发现导航，9大场景分类，800+工具收录 | 静态HTML+JS (Vercel部署) | 高 | P0 - 流量入口 |
| **STARCLAW平台** | 22+智能体注册表，资源编排中心，团队构建器 | Node.js/Express + SQLite | 高 | P0 - 执行引擎 |
| **Skill商店** | EnhancedSkillMarket，80+内置技能，GitHub/ClawHub聚合 | Node.js/Express API | 中 | P0 - 交易核心 |
| **热点引擎** | 尚未独立成模块，散落在各服务中 | 概念阶段 | 低 | P1 - 趋势驱动 |

### 1.2 现有核心能力清单

**STARCLAW 核心服务（已具备）：**
- `ResourceOrchestrator.js` - 资源编排中心（决策→匹配→执行→创建）
- `TeamBuilderService.js` - 动态团队构建（需求分析→设计→创建→注册）
- `EnhancedSkillMarket.js` - 技能市场（本地+GitHub+ClawHub三源聚合）
- `SkillManager.js` - 技能安装/卸载/启用/禁用
- `ExternalResourceIntegration.js` - 外部资源整合（Coze/N8N）
- `OpenClawChatService.js` - OpenClaw网关集成
- `ModelRouter.js` - 多模型路由（智谱/方舟/Claude/GPT）

**AI123 导航站（已具备）：**
- 场景化卡片导航（9大业务场景）
- 地区化推荐（5大地区）
- 解决方案包展示
- StarClaw入口引导
- SEO优化（JSON-LD/OG标签）

**关键数据模型：**
- `registry.json` - 22+智能体注册表（含五层架构团队）
- `skills.json` - 16+技能定义
- `context.db` - SQLite上下文/记忆数据库

---

## 二、目标架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                      GEO智链 统一工作台                              │
│              (geochain-dashboard.html + API)                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │我的战队   │ │订阅订单   │ │数据看板   │ │消息中心   │ │GEO报告   │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
├───────┼────────────┼────────────┼────────────┼────────────┼─────────┤
│                    GEO智链 API 网关 (api-gateway.js)                │
│         SSO认证 │ 商品管理 │ 订单管理 │ 部署引擎 │ 数据总线          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  AI123-GEO专区    │  │   Skill商店      │  │  STARCLAW引擎    │  │
│  │  (流量与发现层)    │  │  (供给与交易层)  │  │  (承载与执行层)  │  │
│  │                  │  │                  │  │                  │  │
│  │ • 方案榜单       │  │ • 商品详情       │  │ • 战队模板       │  │
│  │ • 案例研究       │  │ • 购买/订阅      │  │ • 多租户空间     │  │
│  │ • 一键购买入口   │  │ • 自动部署API    │  │ • 任务协同       │  │
│  │ • GEO知识图谱    │  │ • 订单管理       │  │ • 效果面板       │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                     │            │
├───────────┼─────────────────────┼─────────────────────┼────────────┤
│           │     统一数据中台 (data-hub.js)             │            │
│           │  • 用户账户  • 商品目录  • 订单状态        │            │
│           │  • 部署配置  • 效果指标  • 事件消息         │            │
├─────────────────────────────────────────────────────────────────────┤
│                     趋势驱动层 (news-engine)                         │
│              热点监控 → 趋势解析 → 智能推荐 → 预警推送               │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构规划

```
projects/
├── ai123/                          # AI123导航站（已有，需扩展GEO专区）
│   ├── public/
│   │   ├── index.html              # 首页（增加GEO智链入口）
│   │   ├── geo-region.html         # 地区推荐（已有）
│   │   ├── geo-solutions.html      # [新增] GEO解决方案市场
│   │   ├── geo-case-studies.html   # [新增] GEO案例研究库
│   │   ├── starclaw.html           # StarClaw入口（已有）
│   │   └── geochain.html           # [新增] GEO智链统一工作台
│   └── data/
│       └── geo-solutions.json      # [新增] GEO方案数据
│
├── xiaoyue-web/starclaw/           # STARCLAW平台（已有，需增强）
│   ├── agents/
│   │   ├── registry.json           # 智能体注册表（已有）
│   │   ├── geo_lobster_team/       # GEO龙虾团队（已有）
│   │   └── geo_guardian/           # [新增] GEO风控卫兵战队
│   ├── skills/
│   │   ├── skills.json             # 技能定义（已有）
│   │   └── geo-*/                  # [新增] GEO专项技能
│   ├── services/
│   │   ├── ResourceOrchestrator.js # 资源编排（已有）
│   │   ├── TeamBuilderService.js   # 团队构建（已有）
│   │   ├── EnhancedSkillMarket.js  # 技能市场（已有）
│   │   ├── GeoChainGateway.js      # [新增] GEO智链API网关
│   │   ├── AuthService.js          # [新增] 统一认证服务
│   │   ├── OrderService.js         # [新增] 订单管理服务
│   │   ├── DeploymentService.js    # [新增] 自动部署服务
│   │   ├── GeoNewsEngine.js        # [新增] 新闻热点引擎
│   │   └── DataHubService.js       # [新增] 数据中台服务
│   ├── routes/
│   │   ├── skillRoutes.js          # 技能路由（已有）
│   │   ├── geochainRoutes.js       # [新增] GEO智链路由
│   │   └── orderRoutes.js          # [新增] 订单路由
│   └── templates/
│       └── team-templates/         # [新增] 预置战队模板
│           ├── geo-guardian.json   # GEO风控卫兵模板
│           ├── source-health.json  # 信源健康度诊断师模板
│           └── trend-monitor.json  # 趋势监控模板
│
└── geochain/                        # [新增] GEO智链核心平台
    ├── public/
    │   ├── dashboard.html          # 统一工作台前端
    │   ├── marketplace.html        # Skill商店增强版
    │   └── deployment-center.html  # 部管理中心
    ├── src/
    │   ├── api-gateway.js          # API网关主入口
    │   ├── auth/                   # 认证模块
    │   │   └── sso.js             # SSO实现
    │   ├── models/                 # 数据模型
    │   │   ├── User.js
    │   │   ├── Product.js
    │   │   ├── Order.js
    │   │   └── Deployment.js
    │   └── middleware/             # 中间件
    │       ├── auth.js
    │       └── rateLimit.js
    └── config/
        └── geochain.config.js      # 平台配置
```

---

## 三、核心模块详细设计

### 3.1 统一工作台 (Dashboard)

**功能模块：**
1. **我的数字战队** - 展示已部署的GEO战队列表，状态监控
2. **我的订阅订单** - 从Skill商店购买的技能/战队商品
3. **智能仪表盘** - 核心KPI汇总（保护品牌数、发现风险数、健康度趋势）
4. **消息通知中心** - 系统告警、战队动态、热点情报
5. **GEO快速入口** - 一键跳转AI123方案页 / Skill商店 / STARCLAW控制台

### 3.2 AI123-GEO专区转型

**从通用导航 → GEO垂直方案市场的转变：**

在现有AI123首页基础上，新增：
- **GEO解决方案市场页** (`geo-solutions.html`)
  - 按行业（金融/医疗/教育/电商/政务）展示GEO方案
  - 每个方案卡片关联Skill商店SKU
  - "一键试用" / "立即购买" CTA按钮
- **案例研究库** (`geo-case-studies.html`)
  - Before/After对比案例
  - 客户证言和数据效果
  - 可量化ROI展示

**首发GEO解决方案（Phase 1 MVP）：**

| 方案名称 | 目标客户 | 关联战队模板 | 价格 |
|---------|---------|-------------|------|
| GEO风控卫兵 | 品牌公关部 | geo-guardian | ¥2,999/月 |
| 信源健康度诊断师 | 市场部/SEO组 | source-health | ¥1,999/月 |
| AI引擎曝光优化师 | 增长团队 | trend-monitor | ¥3,999/月 |

### 3.3 Skill商店商品化改造

**商品形态定义：**

```javascript
// Product SKU 数据模型
{
  id: "geo-guardian-pro",
  name: "GEO风控卫兵 专业版",
  type: "digital-team",        // digital-team | skill-pack | custom-service
  category: "geo-risk-control",
  pricing: {
    model: "subscription",     // subscription | one-time | usage-based
    price: 2999,
    unit: "month",
    trialDays: 7
  },
  deployment: {
    templateId: "geo-guardian", // 对应STARCLAW战队模板
    autoDeploy: true,           // 购买后自动部署
    setupTime: "< 5min"
  },
  features: [
    "7x24负面信息监控",
    "AI引擎引用追踪",
    "自动预警推送",
    "危机应对建议"
  ],
  linkedSolution: "ai123://geo-solutions/risk-control"  // 关联AI123方案页
}
```

**购买→部署闭环流程：**
```
用户点击"购买" 
  → OrderService创建订单 
  → 支付确认(模拟/真实) 
  → DeploymentService调用TeamBuilderService 
  → 在用户工作空间创建战队实例 
  → 回传部署状态到订单页和工作台
```

### 3.4 STARCLAW多租户战队模板

**预置战队模板结构：**

```javascript
// templates/team-templates/geo-guardian.json
{
  "id": "geo-guardian",
  "name": "GEO风控卫兵",
  "description": "负面/不实信息监控与应对的自动化AI战队",
  "version": "1.0.0",
  "tier": "pro",                    // free | pro | enterprise
  
  "agents": [
    {
      "id": "geo_scout_risk",
      "role": "风险感知雷达",
      "personality": "敏锐的风险嗅觉，7x24不间断监测...",
      "skills": ["risk_detection", "sentiment_analysis"],
      "tools": ["web_search", "news_api", "social_listen"]
    },
    {
      "id": "geo_analyst_risk",
      "role": "风险评估分析师",
      "personality": "冷静的数据分析师，用事实说话...",
      "skills": ["risk_assessment", "impact_analysis"],
      "tools": ["data_visualization", "report_generator"]
    },
    {
      "id": "geo_responder",
      "role": "危机应对专家",
      "personality": "经验丰富的危机公关，快速响应...",
      "skills": ["crisis_response", "content_drafting"],
      "tools": ["template_library", "distribution_channels"]
    }
  ],
  
  "workflow": {
    "trigger": "scheduled | manual | webhook",
    "steps": [
      { "agent": "geo_scout_risk", "action": "scan_risks", "schedule": "0 */6 * * *" },
      { "agent": "geo_analyst_risk", "action": "analyze_finding", "condition": "risk_found" },
      { "agent": "geo_responder", "action": "draft_response", "condition": "severity > medium" }
    ]
  },
  
  "dashboard": {
    "metrics": ["risks_detected", "false_positives", "response_time", "trend_line"],
    "reports": ["daily_digest", "weekly_summary", "monthly_report"]
  }
}
```

### 3.5 统一账户体系 (SSO)

**轻量级SSO方案（MVP阶段）：**

```javascript
// services/AuthService.js
class GeoChainAuthService {
  // 基于JWT的Token认证
  // MVP阶段支持：邮箱注册 / 手机号登录 / 第三方OAuth(GitHub)
  
  async register(email, password, profile) {
    // 创建统一账户
    // 同步初始化：AI123收藏夹 + STARCLAW工作空间 + Skill商店购物车
  }
  
  async login(credentials) {
    // 验证并签发JWT
    // Token包含：userId, role, tenantId(企业租户), permissions
  }
  
  async getProfile(token) {
    // 返回用户在各子系统的统一视图
  }
  
  syncToSubsystems(user) {
    // 账户同步到AI123/STARCLAW/Skill商店
  }
}
```

### 3.6 数据中台与事件总线

**统一数据模型：**

```javascript
// services/DataHubService.js
class DataHubService {
  // 核心数据实体
  entities: {
    User: { id, email, profile, subscriptions, deployments },
    Product: { id, sku, name, type, pricing, templateId },
    Order: { id, userId, productId, status, createdAt, deployedAt },
    Deployment: { id, userId, templateId, config, status, metrics },
    Event: { id, type, source, payload, timestamp }  // 事件流
  };
  
  // 事件总线
  eventBus: {
    'order.created' → [DeploymentService.deploy, NotificationService.notify],
    'deployment.completed' → [OrderService.updateStatus, DashboardService.refresh],
    'metric.updated' → [AnalyticsService.aggregate, ReportService.generate],
    'news.trend_detected' → [RecommendationEngine.push, AlertService.notify]
  };
}
```

---

## 四、Phase 1 MVP 实施计划

### 4.1 MVP范围（Month 1-3）

| 序号 | 功能模块 | 交付物 | 优先级 |
|------|---------|--------|-------|
| 1 | GEO智链统一工作台页面 | `geochain-dashboard.html` | P0 |
| 2 | AI123-GEO解决方案市场 | `geo-solutions.html` + 数据 | P0 |
| 3 | 3个预置GEO战队模板 | `team-templates/*.json` | P0 |
| 4 | Skill商店商品化改造 | Product SKU模型 + 购买流程 | P0 |
| 5 | 购买→自动部署闭环 | `DeploymentService.js` | P0 |
| 6 | 统一API网关 | `GeoChainGateway.js` | P0 |
| 7 | 轻量级认证系统 | `AuthService.js` | P1 |
| 8 | 基础数据看板 | Dashboard KPI面板 | P1 |

### 4.2 技术依赖关系

```
Step 1: 创建GEO智链目录结构和配置
  ↓
Step 2: 实现GeoChainGateway API网关（核心骨架）
  ↓
Step 3: 扩展EnhancedSkillMarket增加商品/SKU概念
  ↓
Step 4: 实现DeploymentService（购买→部署的关键桥梁）
  ↓
Step 5: 创建3个GEO战队模板
  ↓
Step 6: 构建AI123-GEO解决方案市场页
  ↓
Step 7: 构建GEO智链统一工作台前端
  ↓
Step 8: 实现基础认证和订单管理
  ↓
Step 9: 端到端测试：购买→部署→运行→查看效果
```

### 4.3 成功标准验证

- [ ] 用户可从AI123的GEO方案页一键跳转到Skill商店商品详情
- [ ] 用户可在Skill商店完成"购买"操作（MVP可用模拟支付）
- [ ] 购买成功后，用户的STARCLAW工作空间自动出现对应战队
- [ ] 战队可正常运行并产出结果
- [ ] 统一工作台可查看所有已部署战队和订单状态

---

## 五、关键技术决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 前端框架 | 纯HTML/CSS/JS（保持一致） | 与现有AI123/StarClaw技术栈一致，零构建依赖 |
| 后端运行时 | Node.js Express（复用StarClaw） | 已有完整的服务器基础设施 |
| 数据存储 | JSON文件 + SQLite（渐进式） | MVP足够，后续可迁移至PostgreSQL |
| 认证方案 | JWT + 本地用户存储 | 轻量级，无需引入外部Auth服务 |
| 部署方式 | Vercel(前端) + 自托管Node.js(后端) | 复用现有部署链路 |
| 模块通信 | 事件驱动 + REST API | 松耦合，便于后续微服务拆分 |

---

## 六、API接口规范

### 6.1 核心API列表

```
POST   /api/geochain/auth/register        # 注册
POST   /api/geochain/auth/login           # 登录
GET    /api/geochain/user/profile         # 用户画像
GET    /api/geochain/dashboard            # 工作台数据
GET    /api/geochain/products             # 商品列表
GET    /api/geochain/products/:id         # 商品详情
POST   /api/geochain/orders               # 创建订单
GET    /api/geochain/orders               # 订单列表
GET    /api/geochain/deployments          # 我的部署列表
POST   /api/geochain/deployments/:id/run  # 执行部署
GET    /api/geochain/deployments/:id/metrics  # 部署效果数据
GET    /api/geochain/news/trends          # 热点趋势
POST   /api/geochain/webhooks/deployment-complete  # 部署完成回调
```

### 6.2 购买→部署核心流程API时序

```
[AI123]          [Skill Store API]     [Order Service]     [Deploy Service]     [StarClaw]
   |                    |                     |                     |                |
   |-- 点击"购买" ------>|                     |                     |                |
   |<-- 商品详情 ---------|                     |                     |                |
   |-- 确认购买 -------->|                     |                     |                |
   |                    |-- POST /orders ----->|                     |                |
   |                    |<-- 订单创建(待支付) --|                     |                |
   |                    |-- 支付确认 --------->|                     |                |
   |                    |                     |-- 触发部署 ----------->|                |
   |                    |                     |                     |-- 创建战队实例 ->|
   |                    |                     |                     |<-- 部署完成 -----|
   |                    |                     |<-- 更新订单(已完成) ---|                |
   |<-- 跳转到工作台 -----|                     |                     |                |
   |                                          |                     |                |
```

---

*文档版本: V2.0 | 更新时间: 2026-04-18 | 作者: GEO智链架构组*
