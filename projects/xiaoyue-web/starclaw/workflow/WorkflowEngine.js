/**
 * WorkflowEngine - StarClaw 工作流引擎
 * 
 * 功能：
 * 1. 多步骤任务编排
 * 2. Agent 协作调度
 * 3. Skill 调用
 * 4. OpenClaw 任务执行集成
 * 5. 工作流状态管理
 * 
 * 架构：
 * ┌─────────────────────────────────────────────────────┐
 * │                 WorkflowEngine                      │
 * ├─────────────────────────────────────────────────────┤
 * │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
 * │ │ Parser  │ │Scheduler│ │Executor │ │ Monitor │   │
 * │ │ 解析器   │ │调度器   │ │执行器   │ │监控器   │   │
 * │ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
 * ├─────────────────────────────────────────────────────┤
 * │              Step Types (步骤类型)                   │
 * │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
 * │ │  Agent  │ │  Skill  │ │ OpenClaw│ │ Parallel│   │
 * │ │智能体调用│ │技能调用  │ │任务执行 │ │并行执行 │   │
 * │ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
 * └─────────────────────────────────────────────────────┘
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ==================== 配置 ====================

const DEFAULT_CONFIG = {
    // API 配置
    zhipuApiKey: process.env.ZHIPU_API_KEY,
    zhipuApiBase: 'https://open.bigmodel.cn/api/paas/v4',
    
    // OpenClaw 配置
    openclawEnabled: process.env.OPENCLAW_ENABLED === 'true',
    openclawApi: process.env.OPENCLAW_API || 'http://127.0.0.1:18789',
    openclawToken: process.env.OPENCLAW_TOKEN,
    
    // 工作流配置
    maxConcurrentSteps: 3,
    stepTimeout: 60000,      // 单步超时 60 秒
    workflowTimeout: 300000, // 整体超时 5 分钟
    retryCount: 2,
    
    // 路径配置
    skillsPath: './skills',
    agentsPath: './agents'
};

// ==================== 步骤类型定义 ====================

const STEP_TYPES = {
    // Agent 调用
    AGENT: 'agent',
    // Skill 调用
    SKILL: 'skill',
    // OpenClaw 任务
    OPENCLAW: 'openclaw',
    // 并行执行
    PARALLEL: 'parallel',
    // 条件判断
    CONDITION: 'condition',
    // 循环
    LOOP: 'loop',
    // 延迟
    DELAY: 'delay',
    // HTTP 请求
    HTTP: 'http',
    // 数据转换
    TRANSFORM: 'transform'
};

// ==================== 工作流状态 ====================

const WORKFLOW_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

const STEP_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped'
};

// ==================== 工作流模板 ====================

const WORKFLOW_TEMPLATES = {
    // 内容创作工作流
    content_creation: {
        name: '内容创作',
        description: '多Agent协作创作内容',
        steps: [
            { type: STEP_TYPES.AGENT, agent: 'creative_comedy', action: '创意构思', outputKey: 'idea' },
            { type: STEP_TYPES.AGENT, agent: 'creative_drama', action: '内容深化', inputKey: 'idea', outputKey: 'content' },
            { type: STEP_TYPES.AGENT, agent: 'production_quality', action: '品质审核', inputKey: 'content', outputKey: 'finalContent' }
        ]
    },
    
    // 营销策划工作流
    marketing_campaign: {
        name: '营销策划',
        description: '从市场分析到执行方案的完整流程',
        steps: [
            { type: STEP_TYPES.AGENT, agent: 'cmo_product', action: '市场分析', outputKey: 'analysis' },
            { type: STEP_TYPES.PARALLEL, steps: [
                { type: STEP_TYPES.AGENT, agent: 'market_youth', action: '年轻用户策略', inputKey: 'analysis', outputKey: 'youthStrategy' },
                { type: STEP_TYPES.AGENT, agent: 'brand_premium', action: '品牌策略', inputKey: 'analysis', outputKey: 'brandStrategy' }
            ]},
            { type: STEP_TYPES.AGENT, agent: 'coo_domestic', action: '执行方案', outputKey: 'plan' }
        ]
    },
    
    // 代码开发工作流
    code_development: {
        name: '代码开发',
        description: '从需求到代码实现的开发流程',
        steps: [
            { type: STEP_TYPES.AGENT, agent: 'cto', action: '需求分析', outputKey: 'requirements' },
            { type: STEP_TYPES.SKILL, skill: 'code_development', inputKey: 'requirements', outputKey: 'code' },
            { type: STEP_TYPES.OPENCLAW, task: '测试运行代码', inputKey: 'code', outputKey: 'testResult' }
        ]
    },
    
    // 战略决策工作流
    strategic_decision: {
        name: '战略决策',
        description: '多角度分析后形成决策',
        steps: [
            { type: STEP_TYPES.AGENT, agent: 'ceo', action: '问题定义', outputKey: 'problem' },
            { type: STEP_TYPES.PARALLEL, steps: [
                { type: STEP_TYPES.AGENT, agent: 'cfo', action: '财务分析', inputKey: 'problem', outputKey: 'financialAnalysis' },
                { type: STEP_TYPES.AGENT, agent: 'cro', action: '风险评估', inputKey: 'problem', outputKey: 'riskAnalysis' },
                { type: STEP_TYPES.AGENT, agent: 'cso', action: '战略分析', inputKey: 'problem', outputKey: 'strategyAnalysis' }
            ]},
            { type: STEP_TYPES.AGENT, agent: 'ceo', action: '综合决策', outputKey: 'decision' }
        ]
    }
};

// ==================== 步骤执行器 ====================

class StepExecutor {
    constructor(config, contextEngine) {
        this.config = config;
        this.contextEngine = contextEngine;
    }
    
    /**
     * 执行 Agent 调用
     */
    async executeAgent(step, context) {
        const { agent, action, inputKey, outputKey } = step;
        const input = inputKey ? context.data[inputKey] : context.originalInput;
        
        console.log(`[Workflow] 调用 Agent: ${agent} - ${action}`);
        
        // 构建 Agent 系统提示
        const agentSoul = this.loadAgentSoul(agent);
        if (!agentSoul) {
            throw new Error(`未找到 Agent: ${agent}`);
        }
        
        // 调用智谱 AI
        const response = await axios.post(
            `${this.config.zhipuApiBase}/chat/completions`,
            {
                model: 'glm-4-flash',
                messages: [
                    { role: 'system', content: agentSoul },
                    { role: 'user', content: `${action}\n\n输入: ${JSON.stringify(input || context.originalInput)}` }
                ],
                temperature: 0.85,
                max_tokens: 2000
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.config.zhipuApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.config.stepTimeout
            }
        );
        
        const result = response.data.choices[0].message.content;
        
        return {
            success: true,
            output: result,
            outputKey
        };
    }
    
    /**
     * 加载 Agent SOUL
     */
    loadAgentSoul(agentId) {
        const soulPath = path.join(this.config.agentsPath, agentId, 'SOUL.md');
        if (fs.existsSync(soulPath)) {
            return fs.readFileSync(soulPath, 'utf-8');
        }
        return null;
    }
    
    /**
     * 执行 Skill 调用
     */
    async executeSkill(step, context) {
        const { skill, inputKey, outputKey } = step;
        const input = inputKey ? context.data[inputKey] : context.originalInput;
        
        console.log(`[Workflow] 调用 Skill: ${skill}`);
        
        // 加载 Skill 定义
        const skillPath = path.join(this.config.skillsPath, skill, 'SKILL.md');
        if (!fs.existsSync(skillPath)) {
            throw new Error(`未找到 Skill: ${skill}`);
        }
        
        const skillContent = fs.readFileSync(skillPath, 'utf-8');
        
        // 执行 Skill（通过 LLM）
        const response = await axios.post(
            `${this.config.zhipuApiBase}/chat/completions`,
            {
                model: 'glm-4-flash',
                messages: [
                    { role: 'system', content: `你是一个 Skill 执行器。请根据以下 Skill 定义执行任务：\n\n${skillContent}` },
                    { role: 'user', content: `执行任务，输入：${JSON.stringify(input || context.originalInput)}` }
                ],
                temperature: 0.7,
                max_tokens: 2000
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.config.zhipuApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.config.stepTimeout
            }
        );
        
        const result = response.data.choices[0].message.content;
        
        return {
            success: true,
            output: result,
            outputKey
        };
    }
    
    /**
     * 执行 OpenClaw 任务
     */
    async executeOpenClaw(step, context) {
        const { task, inputKey, outputKey } = step;
        const input = inputKey ? context.data[inputKey] : null;
        
        console.log(`[Workflow] 执行 OpenClaw: ${task}`);
        
        if (!this.config.openclawEnabled || !this.config.openclawToken) {
            console.log('[Workflow] OpenClaw 未启用，跳过');
            return {
                success: false,
                error: 'OpenClaw 未启用',
                outputKey
            };
        }
        
        // 构建完整任务
        const fullTask = input ? `${task}\n输入数据: ${JSON.stringify(input)}` : task;
        
        try {
            // 检查 OpenClaw 是否运行
            const healthCheck = await axios.get(`${this.config.openclawApi}/health`, { timeout: 3000 });
            if (healthCheck.status !== 200) {
                throw new Error('OpenClaw 未运行');
            }
            
            // 通过 WebSocket 执行任务
            const WebSocket = require('ws');
            return new Promise((resolve, reject) => {
                const ws = new WebSocket(`ws://127.0.0.1:18789`, {
                    headers: { 'Authorization': `Bearer ${this.config.openclawToken}` }
                });
                
                const timeout = setTimeout(() => {
                    ws.close();
                    resolve({ success: false, error: 'OpenClaw 执行超时', outputKey });
                }, this.config.stepTimeout);
                
                ws.on('open', () => {
                    ws.send(JSON.stringify({
                        type: 'task',
                        task: fullTask,
                        sessionId: context.workflowId
                    }));
                });
                
                ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'result' || message.type === 'complete') {
                            clearTimeout(timeout);
                            ws.close();
                            resolve({
                                success: true,
                                output: message.result || message.content || '任务完成',
                                outputKey
                            });
                        } else if (message.type === 'error') {
                            clearTimeout(timeout);
                            ws.close();
                            resolve({ success: false, error: message.error, outputKey });
                        }
                    } catch (e) {
                        console.error('[Workflow] 解析 OpenClaw 消息失败:', e.message);
                    }
                });
                
                ws.on('error', (error) => {
                    clearTimeout(timeout);
                    resolve({ success: false, error: error.message, outputKey });
                });
            });
        } catch (e) {
            return { success: false, error: e.message, outputKey };
        }
    }
    
    /**
     * 执行并行步骤
     */
    async executeParallel(step, context) {
        const { steps } = step;
        
        console.log(`[Workflow] 并行执行 ${steps.length} 个步骤`);
        
        const promises = steps.map((subStep, index) => 
            this.executeStep(subStep, context).then(result => ({
                index,
                step: subStep,
                result
            }))
        );
        
        const results = await Promise.all(promises);
        
        // 合并结果
        const output = {};
        results.forEach(({ result }) => {
            if (result.success && result.outputKey) {
                output[result.outputKey] = result.output;
            }
        });
        
        return {
            success: results.every(r => r.result.success),
            output,
            details: results
        };
    }
    
    /**
     * 执行条件步骤
     */
    async executeCondition(step, context) {
        const { condition, trueSteps, falseSteps } = step;
        
        // 简单条件评估
        const evalResult = this.evaluateCondition(condition, context);
        
        console.log(`[Workflow] 条件评估: ${condition} = ${evalResult}`);
        
        const stepsToExecute = evalResult ? trueSteps : falseSteps;
        if (!stepsToExecute || stepsToExecute.length === 0) {
            return { success: true, output: null };
        }
        
        const results = [];
        for (const subStep of stepsToExecute) {
            const result = await this.executeStep(subStep, context);
            results.push(result);
            if (!result.success) break;
        }
        
        return {
            success: results.every(r => r.success),
            output: results,
            conditionResult: evalResult
        };
    }
    
    /**
     * 评估条件
     */
    evaluateCondition(condition, context) {
        // 简单的条件评估（支持变量引用和比较）
        try {
            // 替换变量引用
            let evalCondition = condition;
            const varPattern = /\$\{([^}]+)\}/g;
            evalCondition = evalCondition.replace(varPattern, (match, key) => {
                const value = context.data[key];
                return JSON.stringify(value);
            });
            
            // 安全评估（仅支持简单比较）
            if (evalCondition.includes('===')) {
                const [left, right] = evalCondition.split('===').map(s => s.trim());
                return left === right;
            }
            if (evalCondition.includes('!==')) {
                const [left, right] = evalCondition.split('!==').map(s => s.trim());
                return left !== right;
            }
            if (evalCondition.includes('includes')) {
                const match = evalCondition.match(/(.+)\.includes\((.+)\)/);
                if (match) {
                    const str = match[1].trim();
                    const substr = match[2].trim();
                    return str.includes(substr.replace(/['"]/g, ''));
                }
            }
            
            // 默认返回 true
            return true;
        } catch (e) {
            console.error('[Workflow] 条件评估失败:', e.message);
            return false;
        }
    }
    
    /**
     * 执行 HTTP 请求
     */
    async executeHttp(step, context) {
        const { url, method = 'GET', headers = {}, body, inputKey, outputKey } = step;
        const inputData = inputKey ? context.data[inputKey] : null;
        
        console.log(`[Workflow] HTTP ${method} ${url}`);
        
        const response = await axios({
            method,
            url,
            headers: { 'Content-Type': 'application/json', ...headers },
            data: body || inputData,
            timeout: this.config.stepTimeout
        });
        
        return {
            success: response.status >= 200 && response.status < 300,
            output: response.data,
            outputKey
        };
    }
    
    /**
     * 执行数据转换
     */
    async executeTransform(step, context) {
        const { transform, inputKey, outputKey } = step;
        const input = inputKey ? context.data[inputKey] : context.originalInput;
        
        console.log(`[Workflow] 数据转换: ${transform}`);
        
        // 支持简单的转换操作
        let output = input;
        
        if (transform === 'json') {
            output = typeof input === 'string' ? JSON.parse(input) : input;
        } else if (transform === 'string') {
            output = typeof input === 'object' ? JSON.stringify(input) : String(input);
        } else if (transform === 'extract') {
            // 提取特定字段
            const field = step.field;
            output = input[field];
        } else if (transform === 'merge') {
            // 合并多个输入
            output = {};
            step.inputKeys?.forEach(key => {
                Object.assign(output, context.data[key] || {});
            });
        }
        
        return {
            success: true,
            output,
            outputKey
        };
    }
    
    /**
     * 执行延迟
     */
    async executeDelay(step, context) {
        const { duration = 1000 } = step;
        
        console.log(`[Workflow] 延迟 ${duration}ms`);
        
        await new Promise(resolve => setTimeout(resolve, duration));
        
        return {
            success: true,
            output: null
        };
    }
    
    /**
     * 统一步骤执行入口
     */
    async executeStep(step, context) {
        const startTime = Date.now();
        
        try {
            let result;
            
            switch (step.type) {
                case STEP_TYPES.AGENT:
                    result = await this.executeAgent(step, context);
                    break;
                case STEP_TYPES.SKILL:
                    result = await this.executeSkill(step, context);
                    break;
                case STEP_TYPES.OPENCLAW:
                    result = await this.executeOpenClaw(step, context);
                    break;
                case STEP_TYPES.PARALLEL:
                    result = await this.executeParallel(step, context);
                    break;
                case STEP_TYPES.CONDITION:
                    result = await this.executeCondition(step, context);
                    break;
                case STEP_TYPES.HTTP:
                    result = await this.executeHttp(step, context);
                    break;
                case STEP_TYPES.TRANSFORM:
                    result = await this.executeTransform(step, context);
                    break;
                case STEP_TYPES.DELAY:
                    result = await this.executeDelay(step, context);
                    break;
                default:
                    throw new Error(`未知步骤类型: ${step.type}`);
            }
            
            // 将结果存入上下文
            if (result.outputKey && result.output !== undefined) {
                context.data[result.outputKey] = result.output;
            }
            
            return {
                ...result,
                duration: Date.now() - startTime,
                stepType: step.type
            };
            
        } catch (error) {
            console.error(`[Workflow] 步骤执行失败:`, error.message);
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime,
                stepType: step.type
            };
        }
    }
}

// ==================== 工作流引擎 ====================

class WorkflowEngine {
    /**
     * StarClaw 工作流引擎
     */
    constructor(config = {}, contextEngine = null) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.contextEngine = contextEngine;
        this.executor = new StepExecutor(this.config, contextEngine);
        
        // 运行中的工作流
        this.runningWorkflows = new Map();
        // 工作流历史
        this.workflowHistory = [];
    }
    
    /**
     * 创建工作流
     */
    createWorkflow(definition) {
        const workflowId = `wf_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        
        // 如果是模板名称，加载模板
        let steps = definition.steps;
        if (typeof definition === 'string') {
            const template = WORKFLOW_TEMPLATES[definition];
            if (!template) {
                throw new Error(`未找到工作流模板: ${definition}`);
            }
            steps = template.steps;
            definition = template;
        }
        
        const workflow = {
            id: workflowId,
            name: definition.name || '未命名工作流',
            description: definition.description || '',
            steps: steps,
            status: WORKFLOW_STATUS.PENDING,
            currentStep: 0,
            data: {},
            startTime: null,
            endTime: null,
            error: null,
            stepResults: []
        };
        
        return workflow;
    }
    
    /**
     * 执行工作流
     */
    async runWorkflow(definition, input = {}) {
        const workflow = this.createWorkflow(definition);
        workflow.status = WORKFLOW_STATUS.RUNNING;
        workflow.startTime = Date.now();
        workflow.originalInput = input;
        
        this.runningWorkflows.set(workflow.id, workflow);
        
        console.log(`[Workflow] 开始执行工作流: ${workflow.name} (${workflow.id})`);
        
        try {
            // 按顺序执行步骤
            for (let i = 0; i < workflow.steps.length; i++) {
                const step = workflow.steps[i];
                workflow.currentStep = i;
                
                console.log(`[Workflow] 执行步骤 ${i + 1}/${workflow.steps.length}: ${step.type}`);
                
                // 重试机制
                let lastResult = null;
                for (let retry = 0; retry <= this.config.retryCount; retry++) {
                    const result = await this.executor.executeStep(step, {
                        workflowId: workflow.id,
                        data: workflow.data,
                        originalInput: workflow.originalInput
                    });
                    
                    lastResult = result;
                    workflow.stepResults.push(result);
                    
                    if (result.success) break;
                    
                    if (retry < this.config.retryCount) {
                        console.log(`[Workflow] 步骤失败，重试 ${retry + 1}/${this.config.retryCount}`);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
                
                // 如果步骤失败且没有重试成功，终止工作流
                if (!lastResult.success) {
                    workflow.status = WORKFLOW_STATUS.FAILED;
                    workflow.error = lastResult.error;
                    workflow.endTime = Date.now();
                    this.workflowHistory.push(workflow);
                    this.runningWorkflows.delete(workflow.id);
                    
                    return {
                        success: false,
                        workflowId: workflow.id,
                        error: lastResult.error,
                        stepResults: workflow.stepResults
                    };
                }
            }
            
            // 工作流完成
            workflow.status = WORKFLOW_STATUS.COMPLETED;
            workflow.endTime = Date.now();
            this.workflowHistory.push(workflow);
            this.runningWorkflows.delete(workflow.id);
            
            console.log(`[Workflow] 工作流完成: ${workflow.id}, 耗时 ${workflow.endTime - workflow.startTime}ms`);
            
            // 记录到记忆系统
            if (this.contextEngine) {
                await this.contextEngine.remember(
                    `工作流执行: ${workflow.name}\n输入: ${JSON.stringify(input)}\n输出: ${JSON.stringify(workflow.data)}`,
                    { type: 'workflow', workflowId: workflow.id }
                );
            }
            
            return {
                success: true,
                workflowId: workflow.id,
                data: workflow.data,
                stepResults: workflow.stepResults,
                duration: workflow.endTime - workflow.startTime
            };
            
        } catch (error) {
            workflow.status = WORKFLOW_STATUS.FAILED;
            workflow.error = error.message;
            workflow.endTime = Date.now();
            this.runningWorkflows.delete(workflow.id);
            
            console.error(`[Workflow] 工作流异常:`, error.message);
            
            return {
                success: false,
                workflowId: workflow.id,
                error: error.message,
                stepResults: workflow.stepResults
            };
        }
    }
    
    /**
     * 取消工作流
     */
    cancelWorkflow(workflowId) {
        const workflow = this.runningWorkflows.get(workflowId);
        if (workflow) {
            workflow.status = WORKFLOW_STATUS.CANCELLED;
            workflow.endTime = Date.now();
            this.runningWorkflows.delete(workflowId);
            return { success: true, message: '工作流已取消' };
        }
        return { success: false, error: '未找到运行中的工作流' };
    }
    
    /**
     * 获取工作流状态
     */
    getWorkflowStatus(workflowId) {
        // 先查运行中的
        const running = this.runningWorkflows.get(workflowId);
        if (running) {
            return {
                ...running,
                isRunning: true
            };
        }
        
        // 查历史
        const history = this.workflowHistory.find(w => w.id === workflowId);
        if (history) {
            return {
                ...history,
                isRunning: false
            };
        }
        
        return null;
    }
    
    /**
     * 获取所有工作流模板
     */
    getTemplates() {
        return Object.entries(WORKFLOW_TEMPLATES).map(([id, template]) => ({
            id,
            name: template.name,
            description: template.description,
            stepCount: template.steps.length
        }));
    }
    
    /**
     * 获取运行中的工作流
     */
    getRunningWorkflows() {
        return Array.from(this.runningWorkflows.values());
    }
    
    /**
     * 获取工作流历史
     */
    getHistory(limit = 20) {
        return this.workflowHistory.slice(-limit);
    }
    
    /**
     * 从自然语言解析工作流
     */
    async parseNaturalLanguageWorkflow(description, input) {
        console.log(`[Workflow] 解析自然语言工作流: ${description}`);
        
        const response = await axios.post(
            `${this.config.zhipuApiBase}/chat/completions`,
            {
                model: 'glm-4-flash',
                messages: [
                    {
                        role: 'system',
                        content: `你是一个工作流解析器。请将用户的描述转换为工作流步骤。

步骤类型：
- agent: 调用 Agent（需指定 agent 和 action）
- skill: 调用 Skill（需指定 skill）
- openclaw: 执行 OpenClaw 任务（需指定 task）
- parallel: 并行执行多个步骤
- condition: 条件判断
- http: HTTP 请求
- transform: 数据转换

可用 Agent：
- ceo: CEO 马斯克（战略决策）
- cfo: CFO 巴菲特（财务分析）
- cro: CRO 索罗斯（风险评估）
- cso: CSO 特朗普（商业策略）
- cmo_product: CMO 雷军（爆品营销）
- market_youth: 市场总监 侯明昊（Z世代）
- brand_premium: 品牌总监 黎明（高端品牌）
- creative_comedy: 创意总监 周星驰（喜剧创意）
- creative_drama: 创意总监 胡歌（深度内容）
- production_quality: 品质总监 古天乐（审核）
- cto: CTO（技术架构）

请返回 JSON 格式的工作流定义，包含 name 和 steps 数组。`
                    },
                    { role: 'user', content: `请解析以下工作流需求：\n${description}` }
                ],
                temperature: 0.7,
                max_tokens: 1000
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.config.zhipuApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        const content = response.data.choices[0].message.content;
        
        // 提取 JSON
        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const definition = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                return this.runWorkflow(definition, input);
            } catch (e) {
                console.error('[Workflow] JSON 解析失败:', e.message);
            }
        }
        
        return { success: false, error: '无法解析工作流定义' };
    }
}

// ==================== 导出 ====================

module.exports = {
    WorkflowEngine,
    StepExecutor,
    STEP_TYPES,
    WORKFLOW_STATUS,
    WORKFLOW_TEMPLATES
};
