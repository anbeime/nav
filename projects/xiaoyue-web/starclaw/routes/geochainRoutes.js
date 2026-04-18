/**
 * GEO智链路由 - API endpoints
 */
const express = require("express");
const router = express.Router();
const path = require("path");

// 模拟数据存储
const users = new Map();
const orders = new Map();
const deployments = new Map();
const products = [
  {
    id: "geo-guardian-pro",
    name: "GEO风控卫兵 专业版",
    description: "负面/不实信息监控与应对的自动化AI战队，保护品牌声誉",
    type: "digital-team",
    category: "geo-risk-control",
    icon: "🛡️",
    pricing: { price: 2999, unit: "month", trialDays: 7 },
    deployment: { templateId: "geo-guardian", autoDeploy: true },
    features: [
      "7x24负面信息监控",
      "AI引擎引用追踪",
      "自动预警推送",
      "危机应对建议",
    ],
  },
  {
    id: "source-health-pro",
    name: "信源健康度诊断师 专业版",
    description: "AI内容来源可信度评估与健康度监测战队",
    type: "digital-team",
    category: "geo-source-health",
    icon: "🔍",
    pricing: { price: 1999, unit: "month", trialDays: 7 },
    deployment: { templateId: "source-health", autoDeploy: true },
    features: ["信源可信度评估", "虚假内容识别", "健康度报告生成", "趋势分析"],
  },
  {
    id: "trend-monitor-pro",
    name: "AI引擎曝光优化师 专业版",
    description: "AI搜索/推荐引擎中的内容曝光优化战队",
    type: "digital-team",
    category: "geo-trend-optimization",
    icon: "📈",
    pricing: { price: 3999, unit: "month", trialDays: 7 },
    deployment: { templateId: "trend-monitor", autoDeploy: true },
    features: [
      "关键词排名监控",
      "竞品动态追踪",
      "曝光优化建议",
      "效果分析报告",
    ],
  },
];

// ===== 认证接口 =====

// 注册
router.post("/auth/register", (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: "邮箱必填" });

  const userId = "user_" + Date.now();
  const user = {
    id: userId,
    email,
    name: name || email.split("@")[0],
    createdAt: new Date().toISOString(),
  };
  users.set(userId, user);

  res.json({ success: true, user, token: "mock_token_" + userId });
});

// 登录
router.post("/auth/login", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "邮箱必填" });

  let user = Array.from(users.values()).find((u) => u.email === email);
  if (!user) {
    user = {
      id: "user_" + Date.now(),
      email,
      name: email.split("@")[0],
      createdAt: new Date().toISOString(),
    };
    users.set(user.id, user);
  }

  res.json({ success: true, user, token: "mock_token_" + user.id });
});

// 用户画像
router.get("/user/profile", (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId;
  if (!userId) return res.status(401).json({ error: "未登录" });

  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: "用户不存在" });

  const userOrders = Array.from(orders.values()).filter(
    (o) => o.userId === userId,
  );
  const userDeployments = Array.from(deployments.values()).filter(
    (d) => d.userId === userId,
  );

  res.json({
    user,
    stats: {
      totalOrders: userOrders.length,
      activeDeployments: userDeployments.filter((d) => d.status === "running")
        .length,
    },
  });
});

// ===== 商品接口 =====

// 商品列表
router.get("/products", (req, res) => {
  const { category } = req.query;
  let result = products;
  if (category) result = products.filter((p) => p.category === category);
  res.json({ products: result });
});

// 商品详情
router.get("/products/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "商品不存在" });
  res.json({ product });
});

// ===== 订单接口 =====

// 创建订单
router.post("/orders", (req, res) => {
  const userId = req.headers["x-user-id"] || req.body.userId;
  const { productId } = req.body;

  if (!userId) return res.status(401).json({ error: "未登录" });
  if (!productId) return res.status(400).json({ error: "商品ID必填" });

  const product = products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: "商品不存在" });

  const order = {
    id: "order_" + Date.now(),
    userId,
    productId,
    productName: product.name,
    status: "pending_payment",
    amount: product.pricing.price,
    createdAt: new Date().toISOString(),
  };
  orders.set(order.id, order);

  res.json({ success: true, order });
});

// 订单列表
router.get("/orders", (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId;
  if (!userId) return res.status(401).json({ error: "未登录" });

  const userOrders = Array.from(orders.values())
    .filter((o) => o.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ orders: userOrders });
});

// 订单详情
router.get("/orders/:id", (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId;
  const order = orders.get(req.params.id);

  if (!order) return res.status(404).json({ error: "订单不存在" });
  if (order.userId !== userId)
    return res.status(403).json({ error: "无权访问" });

  res.json({ order });
});

// 支付确认
router.post("/orders/:id/pay", (req, res) => {
  const userId = req.headers["x-user-id"] || req.body.userId;
  const order = orders.get(req.params.id);

  if (!order) return res.status(404).json({ error: "订单不存在" });
  if (order.userId !== userId)
    return res.status(403).json({ error: "无权访问" });

  // 模拟支付成功
  order.status = "paid";
  order.paidAt = new Date().toISOString();
  orders.set(order.id, order);

  // 自动触发部署
  const deployment = {
    id: "dep_" + Date.now(),
    userId: order.userId,
    orderId: order.id,
    productId: order.productId,
    name: order.productName,
    status: "creating",
    templateId: products.find((p) => p.id === order.productId)?.deployment
      .templateId,
    createdAt: new Date().toISOString(),
  };
  deployments.set(deployment.id, deployment);

  // 模拟部署完成
  setTimeout(() => {
    deployment.status = "running";
    deployment.startedAt = new Date().toISOString();
    deployments.set(deployment.id, deployment);
  }, 2000);

  res.json({ success: true, order, deployment });
});

// ===== 部署接口 =====

// 部署列表
router.get("/deployments", (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId;
  if (!userId) return res.status(401).json({ error: "未登录" });

  const userDeployments = Array.from(deployments.values())
    .filter((d) => d.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ deployments: userDeployments });
});

// 部署详情
router.get("/deployments/:id", (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId;
  const deployment = deployments.get(req.params.id);

  if (!deployment) return res.status(404).json({ error: "部署不存在" });
  if (deployment.userId !== userId)
    return res.status(403).json({ error: "无权访问" });

  res.json({ deployment });
});

// 启动部署
router.post("/deployments/:id/run", (req, res) => {
  const userId = req.headers["x-user-id"] || req.body.userId;
  const deployment = deployments.get(req.params.id);

  if (!deployment) return res.status(404).json({ error: "部署不存在" });
  if (deployment.userId !== userId)
    return res.status(403).json({ error: "无权访问" });

  deployment.status = "running";
  deployment.startedAt = new Date().toISOString();
  deployments.set(deployment.id, deployment);

  res.json({ success: true, deployment });
});

// 停止部署
router.post("/deployments/:id/stop", (req, res) => {
  const userId = req.headers["x-user-id"] || req.body.userId;
  const deployment = deployments.get(req.params.id);

  if (!deployment) return res.status(404).json({ error: "部署不存在" });
  if (deployment.userId !== userId)
    return res.status(403).json({ error: "无权访问" });

  deployment.status = "stopped";
  deployment.stoppedAt = new Date().toISOString();
  deployments.set(deployment.id, deployment);

  res.json({ success: true, deployment });
});

// 部署效果数据
router.get("/deployments/:id/metrics", (req, res) => {
  const deployment = deployments.get(req.params.id);
  if (!deployment) return res.status(404).json({ error: "部署不存在" });

  // 模拟指标数据
  res.json({
    deploymentId: deployment.id,
    metrics: {
      uptime: "99.9%",
      tasksRun: Math.floor(Math.random() * 100),
      alertsGenerated: Math.floor(Math.random() * 20),
      lastActive: new Date().toISOString(),
    },
    generatedAt: new Date().toISOString(),
  });
});

// ===== 工作台接口 =====

// 工作台数据
router.get("/dashboard", (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId;
  if (!userId) return res.status(401).json({ error: "未登录" });

  const user = users.get(userId);
  const userOrders = Array.from(orders.values()).filter(
    (o) => o.userId === userId,
  );
  const userDeployments = Array.from(deployments.values()).filter(
    (d) => d.userId === userId,
  );

  res.json({
    user,
    stats: {
      totalOrders: userOrders.length,
      activeOrders: userOrders.filter((o) => o.status === "paid").length,
      totalDeployments: userDeployments.length,
      runningDeployments: userDeployments.filter((d) => d.status === "running")
        .length,
    },
    recentOrders: userOrders.slice(0, 5),
    recentDeployments: userDeployments.slice(0, 3),
    products,
  });
});

// ===== 热点趋势接口 =====

router.get("/news/trends", (req, res) => {
  res.json({
    trends: [
      { keyword: "AI监管", 热度: 85, 趋势: "up", 来源: ["微博", "知乎"] },
      {
        keyword: "大模型幻觉",
        热度: 72,
        趋势: "up",
        来源: ["Twitter", "新闻"],
      },
      { keyword: "AI内容检测", 热度: 68, 趋势: "stable", 来源: ["行业报告"] },
    ],
    updatedAt: new Date().toISOString(),
  });
});

module.exports = router;
