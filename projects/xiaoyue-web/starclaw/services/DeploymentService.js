/**
 * 自动部署服务 - 购买→部署的关键桥梁
 * 连接Skill商店订单与STARCLAW战队构建
 */
const fs = require("fs").promises;
const path = require("path");

class DeploymentService {
  constructor(config = {}) {
    this.config = {
      templatesDir: path.join(__dirname, "../templates/team-templates"),
      workspaceDir: path.join(__dirname, "../workspace"),
      ...config,
    };
    this.deployments = new Map();
    this.runningJobs = new Map();
  }

  async initialize() {
    await fs.mkdir(this.config.templatesDir, { recursive: true });
    await fs.mkdir(this.config.workspaceDir, { recursive: true });
    await this.loadTemplates();
    console.log("[DeploymentService] 自动部署服务已就绪");
    return { success: true };
  }

  // 加载战队模板
  async loadTemplates() {
    try {
      const files = await fs.readdir(this.config.templatesDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = await fs.readFile(
            path.join(this.config.templatesDir, file),
            "utf-8",
          );
          const template = JSON.parse(content);
          this.templates.set(template.id, template);
        }
      }
      console.log(
        `[DeploymentService] 已加载 ${this.templates.size} 个战队模板`,
      );
    } catch (e) {
      this.templates = new Map();
    }
  }

  // 从订单触发部署
  async deployFromOrder(order, userId) {
    const product = order.product || {};
    const templateId = product.deployment?.templateId;

    if (!templateId) {
      return { success: false, error: "商品未配置部署模板" };
    }

    return this.createDeployment(userId, templateId, {
      orderId: order.id,
      productId: order.productId,
      productName: order.productName,
    });
  }

  // 创建部署实例
  async createDeployment(userId, templateId, metadata = {}) {
    const template = this.templates.get(templateId);
    if (!template) {
      return { success: false, error: "战队模板不存在" };
    }

    const deploymentId = "dep_" + Date.now();
    const deployment = {
      id: deploymentId,
      userId,
      templateId,
      templateName: template.name,
      name: `${template.name}-${deploymentId.slice(-6)}`,
      status: "creating",
      metadata,
      config: template.config || {},
      agents: template.agents.map((a) => ({
        ...a,
        instanceId: `${a.id}_${deploymentId.slice(-6)}`,
        status: "pending",
      })),
      metrics: {
        tasksRun: 0,
        alertsGenerated: 0,
        uptime: "0%",
      },
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };

    this.deployments.set(deploymentId, deployment);

    // 异步创建实际战队实例
    this._createTeamInstance(deployment);

    return { success: true, deployment };
  }

  // 创建实际战队实例
  async _createTeamInstance(deployment) {
    try {
      // 模拟调用TeamBuilderService创建战队
      // 实际实现中会调用: await TeamBuilderService.createFromTemplate(...)
      console.log(`[DeploymentService] 正在创建战队实例: ${deployment.name}`);

      // 模拟创建延迟
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 更新部署状态
      deployment.status = "running";
      deployment.startedAt = new Date().toISOString();

      // 更新智能体状态
      deployment.agents.forEach((agent) => {
        agent.status = "ready";
      });

      this.deployments.set(deployment.id, deployment);
      console.log(`[DeploymentService] 战队实例创建完成: ${deployment.name}`);

      return { success: true };
    } catch (error) {
      deployment.status = "failed";
      deployment.error = error.message;
      this.deployments.set(deployment.id, deployment);
      return { success: false, error: error.message };
    }
  }

  // 获取用户部署列表
  getUserDeployments(userId) {
    return Array.from(this.deployments.values())
      .filter((d) => d.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // 获取部署详情
  getDeployment(deploymentId) {
    return this.deployments.get(deploymentId);
  }

  // 启动部署
  async startDeployment(deploymentId) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      return { success: false, error: "部署不存在" };
    }

    if (deployment.status === "running") {
      return { success: false, error: "部署已在运行中" };
    }

    deployment.status = "running";
    deployment.startedAt = new Date().toISOString();
    this.deployments.set(deploymentId, deployment);

    // 触发工作流
    this._runWorkflow(deployment);

    return { success: true, deployment };
  }

  // 停止部署
  async stopDeployment(deploymentId) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      return { success: false, error: "部署不存在" };
    }

    deployment.status = "stopped";
    deployment.completedAt = new Date().toISOString();
    this.deployments.set(deploymentId, deployment);

    // 取消运行中的任务
    const job = this.runningJobs.get(deploymentId);
    if (job) {
      clearInterval(job);
      this.runningJobs.delete(deploymentId);
    }

    return { success: true, deployment };
  }

  // 删除部署
  async deleteDeployment(deploymentId) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      return { success: false, error: "部署不存在" };
    }

    // 先停止
    await this.stopDeployment(deploymentId);

    // 删除
    this.deployments.delete(deploymentId);

    return { success: true };
  }

  // 获取部署指标
  getDeploymentMetrics(deploymentId) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return null;

    const uptime = deployment.startedAt
      ? this.calculateUptime(deployment.startedAt)
      : "0%";

    return {
      deploymentId,
      name: deployment.name,
      status: deployment.status,
      template: deployment.templateName,
      uptime,
      metrics: deployment.metrics,
      agents: deployment.agents.map((a) => ({
        id: a.instanceId,
        name: a.name,
        role: a.role,
        status: a.status,
      })),
      timeline: {
        created: deployment.createdAt,
        started: deployment.startedAt,
        stopped: deployment.completedAt,
      },
    };
  }

  // 计算运行时间
  calculateUptime(startedAt) {
    const start = new Date(startedAt);
    const now = new Date();
    const diff = now - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    return "< 1h";
  }

  // 运行工作流
  _runWorkflow(deployment) {
    const template = this.templates.get(deployment.templateId);
    if (!template?.workflow) return;

    // 模拟定时任务
    const job = setInterval(
      () => {
        if (deployment.status !== "running") {
          clearInterval(job);
          return;
        }

        // 更新指标
        deployment.metrics.tasksRun += 1;
        deployment.metrics.alertsGenerated += Math.floor(Math.random() * 3);
        this.deployments.set(deployment.id, deployment);
      },
      template.workflow.schedule === "0 */2 * * *" ? 2000 : 5000,
    );

    this.runningJobs.set(deployment.id, job);
  }

  // 获取所有可用模板
  getTemplates() {
    return Array.from(this.templates.values()).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      icon: t.icon,
      tier: t.tier,
      price: t.price,
    }));
  }

  // 从模板创建部署
  async deployFromTemplate(userId, templateId, name) {
    const template = this.templates.get(templateId);
    if (!template) {
      return { success: false, error: "模板不存在" };
    }

    return this.createDeployment(userId, templateId, {
      customName: name,
      source: "template",
    });
  }
}

module.exports = DeploymentService;
