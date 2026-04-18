/**
 * GEO智链核心网关 - 精简版（核心功能）
 */
const fs = require('fs').promises;
const path = require('path');

class GeoChainGatewayCore {
    constructor(config = {}) {
        this.config = {
            dataDir: path.join(__dirname, '../data/geochain'),
            templatesDir: path.join(__dirname, '../templates/team-templates'),
            ...config
        };
        this.users = new Map();
        this.products = new Map();
        this.orders = new Map();
        this.deployments = new Map();
    }

    async initialize() {
        await fs.mkdir(this.config.dataDir, { recursive: true });
        await this.loadProducts();
        await this.loadData();
        console.log('[GeoChain] 核心网关已初始化');
        return { success: true };
    }

    // 加载预置商品
    async loadProducts() {
        const geoProducts = [
            {
                id: 'geo-guardian-pro',
                name: 'GEO风控卫兵 专业版',
                type: 'digital-team',
                category: 'geo-risk-control',
                pricing: { price: 2999, unit: 'month', trialDays: 7 },
                deployment: { templateId: 'geo-guardian', autoDeploy: true }
            },
            {
                id: 'source-health-pro', 
                name: '信源健康度诊断师 专业版',
                type: 'digital-team',
                category: 'geo-source-health',
                pricing: { price: 1999, unit: 'month', trialDays: 7 },
                deployment: { templateId: 'source-health', autoDeploy: true }
            },
            {
                id: 'trend-monitor-pro',
                name: 'AI引擎曝光优化师 专业版',
                type: 'digital-team', 
                category: 'geo-trend-optimization',
                pricing: { price: 3999, unit: 'month', trialDays: 7 },
                deployment: { templateId: 'trend-monitor', autoDeploy: true }
            }
        ];
        geoProducts.forEach(p => this.products.set(p.id, p));
    }

    // 数据持久化
    async loadData() {
        try {
            const dataPath = path.join(this.config.dataDir, 'data.json');
            const data = JSON.parse(await fs.readFile(dataPath, 'utf-8'));
            this.users = new Map(data.users || []);
            this.orders = new Map(data.orders || []);
            this.deployments = new Map(data.deployments || []);
        } catch {}
    }

    async saveData() {
        const dataPath = path.join(this.config.dataDir, 'data.json');
        await fs.writeFile(dataPath, JSON.stringify({
            users: Array.from(this.users.entries()),
            orders: Array.from(this.orders.entries()),
            deployments: Array.from(this.deployments.entries())
        }, null, 2), 'utf-8');
    }

    // 商品获取
    getProducts() { return Array.from(this.products.values()); }
    getProduct(id) { return this.products.get(id); }

    // 用户注册/登录
    registerUser(email, name) {
        const user = {
            id: 'user_' + Date.now(),
            email, name,
            createdAt: new Date().toISOString(),
            deployments: []
        };
        this.users.set(email, user);
        this.saveData();
        return { success: true, user };
    }

    // 创建订单
    createOrder(userId, productId) {
        const product = this.products.get(productId);
        if (!product) return { success: false, error: '商品不存在' };
        
        const order = {
            id: 'order_' + Date.now(),
            userId, productId,
            productName: product.name,
            status: 'pending_payment',
            amount: product.pricing.price,
            createdAt: new Date().toISOString()
        };
        this.orders.set(order.id, order);
        this.saveData();
        return { success: true, order };
    }

    // 支付确认
    confirmPayment(orderId) {
        const order = this.orders.get(orderId);
        if (!order) return { success: false, error: '订单不存在' };
        
        order.status = 'paid';
        order.paidAt = new Date().toISOString();
        this.orders.set(orderId, order);
        
        // 自动触发部署
        this.triggerDeployment(order.userId, order.productId, order.id);
        
        this.saveData();
        return { success: true, order };
    }

    // 触发部署
    async triggerDeployment(userId, productId, orderId) {
        const product = this.products.get(productId);
        if (!product) return;
        
        const deployment = {
            id: 'dep_' + Date.now(),
            userId, productId, orderId,
            name: product.name,
            status: 'creating',
            templateId: product.deployment.templateId,
            createdAt: new Date().toISOString()
        };
        
        this.deployments.set(deployment.id, deployment);
        
        // 获取用户
        const user = Array.from(this.users.values()).find(u => u.id === userId);
        if (user) {
            user.deployments.push(deployment.id);
        }
        
        this.saveData();
        return { success: true, deployment };
    }

    // 获取用户信息
    getUserById(userId) {
        return Array.from(this.users.values()).find(u => u.id === userId);
    }

    // 获取用户订单
    getUserOrders(userId) {
        return Array.from(this.orders.values())
            .filter(o => o.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // 获取用户部署
    getUserDeployments(userId) {
        return Array.from(this.deployments.values())
            .filter(d => d.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // 工作台数据
    getDashboard(userId) {
        const orders = this.getUserOrders(userId);
        const deployments = this.getUserDeployments(userId);
        
        return {
            user: this.getUserById(userId),
            stats: {
                totalOrders: orders.length,
                activeOrders: orders.filter(o => o.status === 'paid' || o.status === 'deploying').length,
                totalDeployments: deployments.length,
                runningDeployments: deployments.filter(d => d.status === 'running').length
            },
            recentOrders: orders.slice(0, 5),
            recentDeployments: deployments.slice(0, 3),
            products: this.getProducts()
        };
    }
}

module.exports = GeoChainGatewayCore;