/**
 * ExternalResourceIntegration - 外部资源整合服务
 * 
 * 整合用户的现有资源：
 * - COZE 智能体（几百个）
 * - N8N 工作流（几千条）
 * - 提示词模板库
 * - 技能商店
 * 
 * 架构：
 * 决策层（18明星）→ 编排层（N8N）→ 执行层（COZE）→ 资源层
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ExternalResourceIntegration {
    constructor(config = {}) {
        // COZE 配置
        this.cozeApiBase = config.cozeApiBase || 'https://api.coze.cn';
        this.cozeApiKey = config.cozeApiKey || process.env.COZE_API_KEY;
        
        // N8N 配置
        this.n8nApiBase = config.n8nApiBase || process.env.N8N_API_BASE || 'http://localhost:5678';
        this.n8nApiKey = config.n8nApiKey || process.env.N8N_API_KEY;
        
        // 本地资源路径
        this.promptLibraryPath = config.promptLibraryPath || './resources/prompts';
        this.skillStorePath = config.skillStorePath || './resources/skills';
        this.cozeAgentsCache = null;
        this.n8nWorkflowsCache = null;
        
        // StarClaw 引用
        this.starclawRegistry = null;
        this.teamBuilderService = null;
    }

    /**
     * 初始化整合服务
     */
    async initialize() {
        console.log('[ExternalIntegration] 初始化外部资源整合...');
        
        // 加载 COZE 智能体列表
        await this.loadCozeAgents();
        
        // 加载 N8N 工作流列表
        await this.loadN8NWorkflows();
        
        // 加载提示词模板库
        await this.loadPromptLibrary();
        
        console.log('[ExternalIntegration] 初始化完成');
        console.log(`  - COZE 智能体: ${this.cozeAgentsCache?.length || 0} 个`);
        console.log(`  - N8N 工作流: ${this.n8nWorkflowsCache?.length || 0} 条`);
    }

    // ==================== COZE 智能体集成 ====================

    /**
     * 加载 COZE 智能体列表
     */
    async loadCozeAgents() {
        try {
            if (this.cozeApiKey) {
                // 从 API 加载
                const response = await axios.get(`${this.cozeApiBase}/v1/bots`, {
                    headers: {
                        'Authorization': `Bearer ${this.cozeApiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                this.cozeAgentsCache = response.data.data || [];
            } else {
                // 从本地缓存加载
                const cachePath = path.join(__dirname, '../data/coze_agents.json');
                try {
                    const data = await fs.readFile(cachePath, 'utf-8');
                    this.cozeAgentsCache = JSON.parse(data);
                } catch (e) {
                    this.cozeAgentsCache = [];
                }
            }
        } catch (error) {
            console.error('[ExternalIntegration] 加载 COZE 智能体失败:', error.message);
            this.cozeAgentsCache = [];
        }
        return this.cozeAgentsCache;
    }

    /**
     * 调用 COZE 智能体
     */
    async callCozeAgent(botId, message, context = {}) {
        console.log(`[ExternalIntegration] 调用 COZE 智能体: ${botId}`);
        
        try {
            const response = await axios.post(
                `${this.cozeApiBase}/v1/chat`,
                {
                    bot_id: botId,
                    user_id: context.userId || 'starclaw',
                    additional_messages: [
                        {
                            role: 'user',
                            content: message,
                            content_type: 'text'
                        }
                    ]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.cozeApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            return {
                success: true,
                output: response.data.data?.messages?.[0]?.content || response.data.data?.content,
                botId
            };
        } catch (error) {
            console.error(`[ExternalIntegration] COZE 调用失败:`, error.message);
            return {
                success: false,
                error: error.message,
                botId
            };
        }
    }

    /**
     * 搜索可用的 COZE 智能体
     */
    searchCozeAgents(keyword) {
        if (!this.cozeAgentsCache) return [];
        
        const lowerKeyword = keyword.toLowerCase();
        return this.cozeAgentsCache.filter(agent => 
            agent.name?.toLowerCase().includes(lowerKeyword) ||
            agent.description?.toLowerCase().includes(lowerKeyword)
        );
    }

    /**
     * 将 COZE 智能体映射为 StarClaw 执行资源
     */
    mapCozeToStarClawResource(cozeAgent) {
        return {
            id: `coze_${cozeAgent.bot_id}`,
            type: 'coze',
            name: cozeAgent.name,
            description: cozeAgent.description,
            capabilities: this.inferCapabilities(cozeAgent),
            execute: async (input, context) => {
                return this.callCozeAgent(cozeAgent.bot_id, input, context);
            }
        };
    }

    /**
     * 推断智能体能力
     */
    inferCapabilities(agent) {
        const keywords = [];
        const text = `${agent.name} ${agent.description}`.toLowerCase();
        
        const capabilityKeywords = {
            '代码': ['代码', '编程', '开发', 'code', 'programming'],
            '游戏': ['游戏', 'game', '玩法', '关卡'],
            '写作': ['写作', '文案', '创作', 'writing', 'content'],
            '分析': ['分析', '数据', '统计', 'analysis', 'data'],
            '设计': ['设计', 'ui', 'ux', 'visual', 'design'],
            '提示词': ['提示词', 'prompt', '打分', '优化'],
            '创建智能体': ['创建', '生成', 'agent', 'bot', 'create']
        };
        
        for (const [capability, patterns] of Object.entries(capabilityKeywords)) {
            if (patterns.some(p => text.includes(p))) {
                keywords.push(capability);
            }
        }
        
        return keywords;
    }

    // ==================== N8N 工作流集成 ====================

    /**
     * 加载 N8N 工作流列表
     */
    async loadN8NWorkflows() {
        try {
            if (this.n8nApiKey) {
                // 从 API 加载
                const response = await axios.get(`${this.n8nApiBase}/api/v1/workflows`, {
                    headers: {
                        'X-N8N-API-KEY': this.n8nApiKey
                    }
                });
                this.n8nWorkflowsCache = response.data.data || [];
            } else {
                // 从本地缓存加载
                const cachePath = path.join(__dirname, '../data/n8n_workflows.json');
                try {
                    const data = await fs.readFile(cachePath, 'utf-8');
                    this.n8nWorkflowsCache = JSON.parse(data);
                } catch (e) {
                    this.n8nWorkflowsCache = [];
                }
            }
        } catch (error) {
            console.error('[ExternalIntegration] 加载 N8N 工作流失败:', error.message);
            this.n8nWorkflowsCache = [];
        }
        return this.n8nWorkflowsCache;
    }

    /**
     * 执行 N8N 工作流
     */
    async executeN8NWorkflow(workflowId, inputData = {}) {
        console.log(`[ExternalIntegration] 执行 N8N 工作流: ${workflowId}`);
        
        try {
            // 触发 webhook 或直接执行
            const response = await axios.post(
                `${this.n8nApiBase}/api/v1/workflows/${workflowId}/execute`,
                inputData,
                {
                    headers: {
                        'X-N8N-API-KEY': this.n8nApiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            return {
                success: true,
                output: response.data,
                workflowId
            };
        } catch (error) {
            console.error(`[ExternalIntegration] N8N 执行失败:`, error.message);
            return {
                success: false,
                error: error.message,
                workflowId
            };
        }
    }

    /**
     * 搜索匹配的 N8N 工作流
     */
    searchN8NWorkflows(keyword) {
        if (!this.n8nWorkflowsCache) return [];
        
        const lowerKeyword = keyword.toLowerCase();
        return this.n8nWorkflowsCache.filter(wf => 
            wf.name?.toLowerCase().includes(lowerKeyword) ||
            wf.tags?.some(tag => tag.name?.toLowerCase().includes(lowerKeyword))
        );
    }

    /**
     * 将 N8N 工作流映射为 StarClaw 技能
     */
    mapN8NToStarClawSkill(workflow) {
        return {
            id: `n8n_${workflow.id}`,
            type: 'n8n',
            name: workflow.name,
            description: `N8N 工作流: ${workflow.name}`,
            agents: [], // 可被任何智能体调用
            execute: async (input, context) => {
                return this.executeN8NWorkflow(workflow.id, input);
            }
        };
    }

    // ==================== 提示词模板库 ====================

    /**
     * 加载提示词模板库
     */
    async loadPromptLibrary() {
        try {
            const files = await fs.readdir(this.promptLibraryPath);
            const templates = [];
            
            for (const file of files) {
                if (file.endsWith('.md') || file.endsWith('.txt')) {
                    const content = await fs.readFile(
                        path.join(this.promptLibraryPath, file), 
                        'utf-8'
                    );
                    templates.push({
                        id: file.replace(/\.(md|txt)$/, ''),
                        name: file,
                        content
                    });
                }
            }
            
            this.promptTemplates = templates;
            return templates;
        } catch (error) {
            console.error('[ExternalIntegration] 加载提示词模板失败:', error.message);
            this.promptTemplates = [];
            return [];
        }
    }

    /**
     * 获取提示词模板
     */
    getPromptTemplate(templateId) {
        return this.promptTemplates?.find(t => t.id === templateId);
    }

    /**
     * 应用提示词模板
     */
    applyPromptTemplate(templateId, variables = {}) {
        const template = this.getPromptTemplate(templateId);
        if (!template) return null;
        
        let content = template.content;
        for (const [key, value] of Object.entries(variables)) {
            content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
        return content;
    }

    // ==================== 智能资源调度 ====================

    /**
     * 核心方法：智能调度资源完成任务
     * 
     * 策略：
     * 1. 决策层（18明星）分析需求
     * 2. 优先从现有资源（COZE/N8N）中匹配
     * 3. 找到匹配则直接调度执行
     * 4. 找不到则触发团队构建
     */
    async smartDispatch(requirement, context = {}) {
        console.log('[ExternalIntegration] 智能调度:', requirement.substring(0, 50) + '...');
        
        const result = {
            requirement,
            decision: null,
            matchedResources: [],
            executionPlan: null,
            executed: false
        };
        
        // 步骤 1: 分析需求类型
        const analysis = this.analyzeRequirement(requirement);
        result.decision = analysis;
        
        // 步骤 2: 搜索匹配的 COZE 智能体
        const matchedCozeAgents = this.searchCozeAgents(analysis.domain);
        result.matchedResources.push(...matchedCozeAgents.map(a => ({
            type: 'coze',
            id: a.bot_id,
            name: a.name
        })));
        
        // 步骤 3: 搜索匹配的 N8N 工作流
        const matchedN8NWorkflows = this.searchN8NWorkflows(analysis.domain);
        result.matchedResources.push(...matchedN8NWorkflows.map(w => ({
            type: 'n8n',
            id: w.id,
            name: w.name
        })));
        
        // 步骤 4: 制定执行计划
        if (result.matchedResources.length > 0) {
            result.executionPlan = this.createExecutionPlan(result.matchedResources, analysis);
            
            // 如果是自动执行模式
            if (context.autoExecute) {
                result.executionResult = await this.executePlan(result.executionPlan, context);
                result.executed = true;
            }
        } else {
            // 步骤 5: 没有匹配资源，触发团队构建
            result.needNewTeam = true;
            result.suggestion = '建议由架构师智能体创建新团队来处理此需求';
        }
        
        return result;
    }

    /**
     * 分析需求
     */
    analyzeRequirement(requirement) {
        const domains = {
            '代码开发': ['代码', '编程', '开发', '写代码', 'bug', '功能'],
            '游戏开发': ['游戏', '玩法', '关卡', '角色', '场景'],
            '内容创作': ['写作', '文案', '文章', '内容', '创意'],
            '数据分析': ['数据', '分析', '统计', '报表', '可视化'],
            'UI设计': ['设计', '界面', 'UI', 'UX', '样式'],
            '提示词优化': ['提示词', 'prompt', '优化', '打分'],
            '智能体创建': ['创建智能体', '新建agent', '生成bot']
        };
        
        for (const [domain, keywords] of Object.entries(domains)) {
            if (keywords.some(k => requirement.includes(k))) {
                return {
                    domain,
                    confidence: 0.8,
                    suggestedStarClawAgents: this.suggestAgentsForDomain(domain)
                };
            }
        }
        
        return {
            domain: '通用',
            confidence: 0.5,
            suggestedStarClawAgents: ['cto', 'ceo']
        };
    }

    /**
     * 为领域建议 StarClaw 智能体
     */
    suggestAgentsForDomain(domain) {
        const mapping = {
            '代码开发': ['cto', 'production_management'],
            '游戏开发': ['creative_comedy', 'creative_drama', 'cto'],
            '内容创作': ['creative_comedy', 'creative_drama', 'creative_idol'],
            '数据分析': ['cfo', 'cto'],
            'UI设计': ['production_visual', 'brand_premium'],
            '提示词优化': ['cto', 'meta_architect'],
            '智能体创建': ['meta_architect', 'cto']
        };
        return mapping[domain] || ['cto'];
    }

    /**
     * 创建执行计划
     */
    createExecutionPlan(resources, analysis) {
        const plan = {
            steps: [],
            estimatedTime: 0,
            cost: 'low'
        };
        
        // 简单的执行计划：按资源顺序执行
        for (const resource of resources.slice(0, 3)) {
            plan.steps.push({
                type: resource.type,
                resourceId: resource.id,
                resourceName: resource.name,
                action: 'execute'
            });
            plan.estimatedTime += 30; // 预估30秒每步
        }
        
        return plan;
    }

    /**
     * 执行计划
     */
    async executePlan(plan, context) {
        const results = [];
        
        for (const step of plan.steps) {
            let result;
            
            if (step.type === 'coze') {
                result = await this.callCozeAgent(
                    step.resourceId, 
                    context.input || context.requirement,
                    context
                );
            } else if (step.type === 'n8n') {
                result = await this.executeN8NWorkflow(
                    step.resourceId,
                    context.input || {}
                );
            }
            
            results.push({
                step,
                result,
                timestamp: new Date().toISOString()
            });
        }
        
        return results;
    }

    // ==================== 统计与状态 ====================

    /**
     * 获取整合状态
     */
    getStatus() {
        return {
            coze: {
                connected: !!this.cozeApiKey,
                agentsCount: this.cozeAgentsCache?.length || 0
            },
            n8n: {
                connected: !!this.n8nApiKey,
                workflowsCount: this.n8nWorkflowsCache?.length || 0
            },
            prompts: {
                templatesCount: this.promptTemplates?.length || 0
            }
        };
    }
}

module.exports = ExternalResourceIntegration;
