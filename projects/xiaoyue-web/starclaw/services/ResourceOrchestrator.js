/**
 * ResourceOrchestrator - 资源编排中心
 * 
 * 统一调度所有资源：
 * - StarClaw 18 明星（决策层）
 * - COZE 智能体（执行层）
 * - N8N 工作流（编排层）
 * - 提示词模板库
 * - 技能商店
 * 
 * 调度逻辑：
 * 1. 决策层分析需求 → 确定需要什么能力
 * 2. 优先从现有资源匹配 → 找到就执行
 * 3. 找不到 → 触发架构师创建新团队
 */

const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

// 引入各模块
const WorkflowEngine = require('../workflow/WorkflowEngine');
const TeamBuilderService = require('./TeamBuilderService');
const ExternalResourceIntegration = require('./ExternalResourceIntegration');

class ResourceOrchestrator {
    constructor(config = {}) {
        this.config = config;

        // 各子系统
        this.workflowEngine = null;
        this.teamBuilder = null;
        this.externalIntegration = null;

        // StarClaw 智能体注册表
        this.starClawAgents = {};
        this.starClawTeams = {};

        // 资源索引
        this.resourceIndex = {
            starclaw: [],     // StarClaw 智能体
            coze: [],         // COZE 智能体
            n8n: [],          // N8N 工作流
            skills: []        // 技能
        };

        // LLM 配置
        this.llmApiBase = config.llmApiBase || process.env.ZHIPU_API_BASE || 'https://open.bigmodel.cn/api/paas/v4';
        this.llmApiKey = config.llmApiKey || process.env.ZHIPU_API_KEY;
    }

    /**
     * 初始化编排中心
     */
    async initialize() {
        console.log('[Orchestrator] 初始化资源编排中心...');

        // 初始化工作流引擎
        this.workflowEngine = new WorkflowEngine(this.config);

        // 初始化团队构建服务
        this.teamBuilder = new TeamBuilderService({
            agentsPath: path.join(__dirname, '../agents'),
            skillsPath: path.join(__dirname, '../skills'),
            llmApiKey: process.env.ZHIPU_API_KEY
        });

        // 初始化外部资源整合
        this.externalIntegration = new ExternalResourceIntegration({
            cozeApiKey: process.env.COZE_API_KEY,
            n8nApiBase: process.env.N8N_API_BASE,
            n8nApiKey: process.env.N8N_API_KEY
        });
        await this.externalIntegration.initialize();

        // 加载 StarClaw 智能体
        await this.loadStarClawAgents();

        // 构建资源索引
        await this.buildResourceIndex();

        console.log('[Orchestrator] 初始化完成');
        this.printStatus();
    }

    /**
     * 加载 StarClaw 智能体注册表
     */
    async loadStarClawAgents() {
        try {
            const registryPath = path.join(__dirname, '../agents/registry.json');
            const data = await fs.readFile(registryPath, 'utf-8');
            const registry = JSON.parse(data);

            this.starClawAgents = registry.agents || {};
            this.starClawTeams = registry.teams || {};

            console.log(`[Orchestrator] 加载 ${Object.keys(this.starClawAgents).length} 个 StarClaw 智能体`);
        } catch (error) {
            console.error('[Orchestrator] 加载注册表失败:', error.message);
        }
    }

    /**
     * 构建统一资源索引
     */
    async buildResourceIndex() {
        // StarClaw 智能体
        this.resourceIndex.starclaw = Object.entries(this.starClawAgents).map(([id, agent]) => ({
            id,
            type: 'starclaw',
            name: agent.name,
            role: agent.role,
            team: agent.team,
            keywords: agent.keywords || [],
            skills: agent.skills || []
        }));

        // COZE 智能体
        this.resourceIndex.coze = (this.externalIntegration.cozeAgentsCache || []).map(agent => ({
            id: agent.bot_id,
            type: 'coze',
            name: agent.name,
            capabilities: this.externalIntegration.inferCapabilities(agent)
        }));

        // N8N 工作流
        this.resourceIndex.n8n = (this.externalIntegration.n8nWorkflowsCache || []).map(wf => ({
            id: wf.id,
            type: 'n8n',
            name: wf.name,
            tags: (wf.tags || []).map(t => t.name)
        }));

        console.log(`[Orchestrator] 资源索引构建完成:`);
        console.log(`  - StarClaw: ${this.resourceIndex.starclaw.length}`);
        console.log(`  - COZE: ${this.resourceIndex.coze.length}`);
        console.log(`  - N8N: ${this.resourceIndex.n8n.length}`);
    }

    // ==================== 核心方法：任务处理 ====================

    /**
     * 处理任务 - 核心入口
     *
     * 流程：
     * 1. 决策层分析（18明星）
     * 2. 资源匹配
     * 3. 执行或创建
     */
    async processTask(task, context = {}) {
        console.log('\n[Orchestrator] ========== 任务处理开始 ==========');
        console.log(`[Orchestrator] 任务: ${task.substring(0, 100)}...`);

        const result = {
            taskId: `task_${Date.now()}`,
            task,
            timestamp: new Date().toISOString(),

            phases: {
                analysis: null,      // 需求分析
                matching: null,      // 资源匹配
                planning: null,      // 执行计划
                execution: null,     // 执行结果
                creation: null       // 新团队创建（如需要）
            },

            output: null,
            success: false
        };

        try {
            // ========== 阶段 1: 需求分析（决策层）==========
            console.log('\n[Orchestrator] 阶段 1: 需求分析（决策层）');
            result.phases.analysis = await this.analyzeByDecisionLayer(task, context);

            // ========== 阶段 2: 资源匹配 ==========
            console.log('\n[Orchestrator] 阶段 2: 资源匹配');
            result.phases.matching = this.matchResources(result.phases.analysis);

            // ========== 阶段 3: 制定执行计划 ==========
            console.log('\n[Orchestrator] 阶段 3: 制定执行计划');
            result.phases.planning = this.planExecution(
                result.phases.analysis,
                result.phases.matching
            );

            // ========== 阶段 4: 执行或创建 ==========
            if (result.phases.planning.hasMatchedResources) {
                // 有匹配资源 -> 执行
                console.log('\n[Orchestrator] 阶段 4: 执行现有资源');
                result.phases.execution = await this.executePlan(result.phases.planning, context);
                result.output = result.phases.execution.output;
                result.success = result.phases.execution.success;
            } else {
                // 无匹配资源 -> 创建新团队
                console.log('\n[Orchestrator] 阶段 4: 创建新团队');
                result.phases.creation = await this.createNewTeam(task, result.phases.analysis, context);
                result.output = result.phases.creation.message;
                result.success = result.phases.creation.success;
            }

        } catch (error) {
            console.error('[Orchestrator] 任务处理失败:', error.message);
            result.error = error.message;
            result.success = false;
        }

        console.log('\n[Orchestrator] ========== 任务处理结束 ==========\n');
        return result;
    }

    /**
     * 阶段 1: 决策层分析
     */
    async analyzeByDecisionLayer(task, context) {
        const decisionAgent = this.selectDecisionAgent(task);

        const prompt = `你是 StarClaw 的 ${decisionAgent.role}。请分析以下任务需求，输出 JSON 格式结果。

任务：${task}

请输出以下 JSON（只输出JSON，不要其他内容）：
{
  "domain": "任务领域",
  "complexity": "low|medium|high",
  "requiredCapabilities": ["能力1", "能力2"],
  "suggestedAgents": ["建议的智能体ID1", "智能体ID2"],
  "needNewTeam": true/false,
  "estimatedSteps": ["步骤1", "步骤2"]
}`;

        try {
            const response = await axios.post(
                `${this.llmApiBase}/chat/completions`,
                {
                    model: 'glm-4-flash',
                    messages: [
                        { role: 'system', content: `你是${decisionAgent.name}，负责需求分析和决策。` },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 1500
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.llmApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const content = response.data.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    ...parsed,
                    decisionAgent: decisionAgent.id,
                    decisionAgentName: decisionAgent.name
                };
            }
        } catch (e) {
            console.error('[Orchestrator] LLM 分析失败，使用规则引擎');
        }

        // 规则引擎兜底
        return this.ruleBasedAnalysis(task);
    }

    /**
     * 规则引擎分析（兜底方案）
     */
    ruleBasedAnalysis(task) {
        const lowerTask = task.toLowerCase();

        const domainRules = [
            { keywords: ['代码', '编程', '开发', 'bug', '功能'], domain: '代码开发', agents: ['cto'] },
            { keywords: ['游戏', '玩法', '关卡', '角色'], domain: '游戏开发', agents: ['creative_comedy', 'creative_drama'] },
            { keywords: ['写作', '文案', '文章', '创意'], domain: '内容创作', agents: ['creative_comedy', 'creative_drama'] },
            { keywords: ['数据', '分析', '统计', '报表'], domain: '数据分析', agents: ['cfo'] },
            { keywords: ['设计', '界面', 'ui', 'ux'], domain: 'UI设计', agents: ['production_visual'] },
            { keywords: ['提示词', 'prompt', '优化', '打分'], domain: '提示词优化', agents: ['meta_architect', 'cto'] },
            { keywords: ['创建', '新建', '团队', '智能体'], domain: '团队构建', agents: ['meta_architect'] },
            { keywords: ['战略', '决策', '规划'], domain: '战略决策', agents: ['ceo', 'cfo', 'cro'] },
            { keywords: ['营销', '推广', '运营', '流量'], domain: '营销策划', agents: ['cmo_product', 'coo_domestic'] },
            { keywords: ['音乐', '配音', '音效'], domain: '音乐创作', agents: ['music_director'] }
        ];

        for (const rule of domainRules) {
            if (rule.keywords.some(k => lowerTask.includes(k))) {
                return {
                    domain: rule.domain,
                    complexity: task.length > 50 ? 'high' : 'medium',
                    requiredCapabilities: [rule.domain],
                    suggestedAgents: rule.agents,
                    needNewTeam: false,
                    estimatedSteps: [`分析${rule.domain}需求`, `制定方案`, `执行并输出`]
                };
            }
        }

        return {
            domain: '通用',
            complexity: 'medium',
            requiredCapabilities: ['通用'],
            suggestedAgents: ['ceo'],
            needNewTeam: false,
            estimatedSteps: ['分析需求', '分配任务', '输出结果']
        };
    }

    /**
     * 选择决策智能体
     */
    selectDecisionAgent(task) {
        const lowerTask = task.toLowerCase();

        if (lowerTask.includes('创建') || lowerTask.includes('团队') || lowerTask.includes('新')) {
            return { id: 'meta_architect', name: '架构师', role: '系统架构师' };
        }
        if (lowerTask.includes('战略') || lowerTask.includes('决策')) {
            return { id: 'ceo', name: '马斯伦', role: '首席执行官' };
        }
        if (lowerTask.includes('财务') || lowerTask.includes('预算')) {
            return { id: 'cfo', name: '伦巴', role: '首席财务官' };
        }
        if (lowerTask.includes('风险') || lowerTask.includes('危机')) {
            return { id: 'cro', name: '索斯乔', role: '首席风险官' };
        }
        if (lowerTask.includes('营销') || lowerTask.includes('推广')) {
            return { id: 'cmo_product', name: '雷君君', role: '联席CMO' };
        }
        if (lowerTask.includes('技术') || lowerTask.includes('代码') || lowerTask.includes('开发')) {
            return { id: 'cto', name: 'OpenClaw', role: '首席技术官' };
        }

        return { id: 'ceo', name: '马斯伦', role: '首席执行官' };
    }

    /**
     * 阶段 2: 资源匹配
     */
    matchResources(analysis) {
        const matched = {
            starclaw: [],
            coze: [],
            n8n: [],
            hasMatchedResources: false
        };

        const domain = analysis.domain || '';
        const capabilities = analysis.requiredCapabilities || [];

        // 匹配 StarClaw 智能体
        for (const capability of capabilities) {
            matched.starclaw.push(
                ...this.resourceIndex.starclaw.filter(agent =>
                    agent.keywords?.some(k => capability.includes(k)) ||
                    agent.role?.includes(capability)
                )
            );
        }

        // 匹配 COZE 智能体
        matched.coze = this.externalIntegration.searchCozeAgents(domain).slice(0, 5);

        // 匹配 N8N 工作流
        matched.n8n = this.externalIntegration.searchN8NWorkflows(domain).slice(0, 5);

        // 去重
        matched.starclaw = this.uniqueByKey(matched.starclaw, 'id');
        matched.coze = this.uniqueByKey(matched.coze, 'id');
        matched.n8n = this.uniqueByKey(matched.n8n, 'id');

        matched.hasMatchedResources =
            matched.starclaw.length > 0 ||
            matched.coze.length > 0 ||
            matched.n8n.length > 0;

        return matched;
    }

    /**
     * 数组去重
     */
    uniqueByKey(arr, key) {
        const seen = new Set();
        return arr.filter(item => {
            if (seen.has(item[key])) return false;
            seen.add(item[key]);
            return true;
        });
    }

    /**
     * 阶段 3: 制定执行计划
     */
    planExecution(analysis, matching) {
        const plan = {
            steps: [],
            hasMatchedResources: matching.hasMatchedResources,
            totalEstimatedTime: 0
        };

        if (!matching.hasMatchedResources) {
            return plan;
        }

        // 优先使用 StarClaw 智能体
        for (const agent of matching.starclaw.slice(0, 3)) {
            plan.steps.push({
                type: 'starclaw',
                resourceId: agent.id,
                resourceName: agent.name,
                action: 'execute'
            });
            plan.totalEstimatedTime += 30;
        }

        // 其次使用 COZE 智能体
        for (const agent of matching.coze.slice(0, 2)) {
            plan.steps.push({
                type: 'coze',
                resourceId: agent.id,
                resourceName: agent.name,
                action: 'call'
            });
            plan.totalEstimatedTime += 20;
        }

        // 最后使用 N8N 工作流
        for (const workflow of matching.n8n.slice(0, 2)) {
            plan.steps.push({
                type: 'n8n',
                resourceId: workflow.id,
                resourceName: workflow.name,
                action: 'run'
            });
            plan.totalEstimatedTime += 15;
        }

        return plan;
    }

    /**
     * 阶段 4a: 执行计划
     */
    async executePlan(plan, context) {
        const results = [];
        let finalOutput = '';

        for (const step of plan.steps) {
            let result;

            switch (step.type) {
                case 'starclaw':
                    result = await this.executeStarClawAgent(step.resourceId, context.input || context.task || '');
                    break;
                case 'coze':
                    result = await this.externalIntegration.callCozeAgent(
                        step.resourceId,
                        context.input || context.task || '',
                        context
                    );
                    break;
                case 'n8n':
                    result = await this.externalIntegration.executeN8NWorkflow(
                        step.resourceId,
                        context.input || {}
                    );
                    break;
                default:
                    result = { success: false, error: `未知类型: ${step.type}` };
            }

            results.push({ step, result });
            if (result.success && result.output) {
                finalOutput += `[${step.resourceName}]:\n${result.output}\n\n`;
            }
        }

        return {
            success: results.some(r => r.result.success),
            output: finalOutput || '所有步骤执行完成但无有效输出',
            details: results
        };
    }

    /**
     * 执行 StarClaw 智能体
     */
    async executeStarClawAgent(agentId, input) {
        const agent = this.starClawAgents[agentId];
        if (!agent) {
            return { success: false, error: `未找到智能体: ${agentId}` };
        }

        try {
            // 加载 SOUL.md
            const soulPath = path.join(__dirname, '../agents', agentId, 'SOUL.md');
            let soulContent = '';
            try {
                soulContent = await fs.readFile(soulPath, 'utf-8');
            } catch (e) {
                soulContent = `你是${agent.name}，${agent.personality}`;
            }

            const response = await axios.post(
                `${this.llmApiBase}/chat/completions`,
                {
                    model: 'glm-4-flash',
                    messages: [
                        { role: 'system', content: soulContent },
                        { role: 'user', content: input || '请根据你的专业能力完成任务' }
                    ],
                    temperature: 0.85,
                    max_tokens: 2000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.llmApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                }
            );

            return {
                success: true,
                output: response.data.choices[0].message.content,
                agentId,
                agentName: agent.name
            };

        } catch (error) {
            return { success: false, error: error.message, agentId };
        }
    }

    /**
     * 阶段 4b: 创建新团队
     */
    async createNewTeam(task, analysis, context) {
        console.log('[Orchestrator] 触发架构师创建新团队...');
        
        try {
            const buildResult = await this.teamBuilder.buildTeam(task);
            
            if (buildResult.success) {
                // 重新加载注册表和索引
                await this.loadStarClawAgents();
                await this.buildResourceIndex();
                
                return {
                    success: true,
                    message: `新团队已创建成功！\n\n团队名称: ${buildResult.team.name}\n智能体数量: ${buildResult.team.agents.length}\n技能数量: ${buildResult.team.skills.length}\n\n创建的文件:\n${buildResult.createdFiles.agents.map(f => `- ${f.path}`).join('\n')}\n${buildResult.createdFiles.skills.map(f => `- ${f.path}`).join('\n')}`,
                    team: buildResult.team,
                    validation: buildResult.validation
                };
            } else {
                return {
                    success: false,
                    message: `团队创建失败: ${buildResult.error}`
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `团队创建异常: ${error.message}`
            };
        }
    }

    // ==================== API 接口方法 ====================

    /**
     * 获取所有可用资源
     */
    getAllResources() {
        return {
            starclaw: this.resourceIndex.starclaw.map(a => ({ id: a.id, name: a.name, role: a.role })),
            coze: this.resourceIndex.coze.map(a => ({ id: a.id, name: a.name })),
            n8n: this.resourceIndex.n8n.map(w => ({ id: w.id, name: w.name }))
        };
    }

    /**
     * 搜索资源
     */
    searchResources(keyword) {
        const lowerKeyword = keyword.toLowerCase();
        return {
            starclaw: this.resourceIndex.starclaw.filter(a =>
                a.name?.includes(keyword) || a.role?.includes(keyword) ||
                a.keywords?.some(k => k.includes(lowerKeyword))
            ),
            coze: this.externalIntegration.searchCozeAgents(keyword),
            n8n: this.externalIntegration.searchN8NWorkflows(keyword)
        };
    }

    /**
     * 打印状态
     */
    printStatus() {
        const status = this.externalIntegration.getStatus();
        console.log('\n[Orchestrator] 系统状态:');
        console.log(`  StarClaw 智能体: ${Object.keys(this.starClawAgents).length}`);
        console.log(`  StarClaw 团队:   ${Object.keys(this.starClawTeams).length}`);
        console.log(`  COZE 连接:       ${status.coze.connected ? '已连接' : '未连接'} (${status.coze.agentsCount}个)`);
        console.log(`  N8N 连接:        ${status.n8n.connected ? '已连接' : '未连接'} (${status.n8n.workflowsCount}条)`);
        console.log('');
    }
}

module.exports = ResourceOrchestrator;
