/**
 * TeamBuilderService - 团队构建服务
 * 
 * StarClaw 的元能力核心：自我创建、自我扩展
 * 
 * 功能：
 * 1. 分析需求 → 设计团队结构
 * 2. 创建 SOUL.md / SKILL.md 文件
 * 3. 注册到 registry.json / skills.json
 * 4. 验证新创建的智能体
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class TeamBuilderService {
    constructor(config = {}) {
        this.agentsPath = config.agentsPath || path.join(__dirname, '../agents');
        this.skillsPath = config.skillsPath || path.join(__dirname, '../skills');
        this.registryPath = config.registryPath || path.join(this.agentsPath, 'registry.json');
        this.skillsJsonPath = config.skillsJsonPath || path.join(this.skillsPath, 'skills.json');
        
        // LLM 配置
        this.llmApiBase = config.llmApiBase || process.env.ZHIPU_API_BASE || 'https://open.bigmodel.cn/api/paas/v4';
        this.llmApiKey = config.llmApiKey || process.env.ZHIPU_API_KEY;
    }

    /**
     * 核心方法：根据需求构建团队
     */
    async buildTeam(requirement) {
        console.log('[TeamBuilder] 开始分析需求:', requirement.substring(0, 100) + '...');

        try {
            // 步骤 1: 需求分析
            const analysis = await this.analyzeRequirement(requirement);
            console.log('[TeamBuilder] 需求分析完成:', analysis.summary);

            // 步骤 2: 设计团队结构
            const teamDesign = await this.designTeam(analysis);
            console.log('[TeamBuilder] 团队设计完成:', teamDesign.teamName);

            // 步骤 3: 创建智能体文件
            const createdAgents = [];
            for (const agent of teamDesign.agents) {
                const filePath = await this.createAgentSoul(agent);
                createdAgents.push({ id: agent.id, path: filePath });
                console.log('[TeamBuilder] 创建智能体:', agent.id);
            }

            // 步骤 4: 创建技能文件
            const createdSkills = [];
            for (const skill of teamDesign.skills) {
                const filePath = await this.createSkillDefinition(skill);
                createdSkills.push({ id: skill.id, path: filePath });
                console.log('[TeamBuilder] 创建技能:', skill.id);
            }

            // 步骤 5: 注册到系统
            await this.registerAgents(teamDesign.agents);
            await this.registerSkills(teamDesign.skills);

            // 步骤 6: 验证
            const validation = await this.validateTeam(teamDesign);

            return {
                success: true,
                team: {
                    teamId: teamDesign.teamId,
                    name: teamDesign.teamName,
                    description: teamDesign.description,
                    agents: teamDesign.agents.map(a => a.id),
                    skills: teamDesign.skills.map(s => s.id)
                },
                createdFiles: {
                    agents: createdAgents,
                    skills: createdSkills
                },
                validation,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('[TeamBuilder] 构建失败:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 分析需求
     */
    async analyzeRequirement(requirement) {
        const prompt = `你是一个需求分析专家。请分析以下需求，并输出 JSON 格式的分析结果。

需求：
${requirement}

请分析并返回以下 JSON 结构：
{
  "summary": "需求摘要",
  "domain": "领域（如：电商、金融、内容创作等）",
  "complexity": "low|medium|high",
  "capabilities": ["需要的能力1", "需要的能力2"],
  "roles": ["建议的角色1", "建议的角色2"],
  "skills": ["需要的技能1", "需要的技能2"],
  "workflows": ["工作流步骤1", "工作流步骤2"]
}

只返回 JSON，不要其他内容。`;

        const response = await this.callLLM(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('无法解析需求分析结果');
    }

    /**
     * 设计团队结构
     */
    async designTeam(analysis) {
        const teamId = `team_${Date.now()}`;
        const teamName = `${analysis.domain}团队`;

        // 为每个角色创建智能体定义
        const agents = analysis.roles.map((role, index) => ({
            id: `${teamId}_agent_${index + 1}`,
            name: this.generateAgentName(role),
            role: role,
            team: teamId,
            personality: this.generatePersonality(role),
            skills: analysis.skills.slice(0, 2), // 每个智能体关联部分技能
            voice: index % 2 === 0 ? '云希' : '晓伊'
        }));

        // 创建技能定义
        const skills = analysis.skills.map((skill, index) => ({
            id: `${teamId}_skill_${index + 1}`,
            name: skill,
            agents: agents.slice(0, 2).map(a => a.id),
            description: `${skill}相关能力`,
            steps: analysis.workflows.slice(0, 3)
        }));

        return {
            teamId,
            teamName,
            description: analysis.summary,
            domain: analysis.domain,
            agents,
            skills
        };
    }

    /**
     * 创建智能体 SOUL.md
     */
    async createAgentSoul(agent) {
        const agentDir = path.join(this.agentsPath, agent.id);
        await fs.mkdir(agentDir, { recursive: true });

        const content = `# ${agent.name} - StarClaw ${agent.role}

## 身份
- **名字**：${agent.name}
- **职位**：${agent.role}
- **团队**：${agent.team}
- **召唤**：\`[召唤:${agent.name}]\`

## 人设核心
${agent.personality}

## 性格特质
- 专业严谨，追求卓越
- 善于协作，团队精神强
- 持续学习，不断进步

## 工作方式
1. 理解任务目标
2. 分析可行方案
3. 执行并验证
4. 输出优质结果

## 与团队协作
- 与团队其他成员紧密配合
- 共同完成团队目标
- 分享经验和最佳实践

---
_此智能体由 StarClaw 团队构建器自动创建_
`;

        const filePath = path.join(agentDir, 'SOUL.md');
        await fs.writeFile(filePath, content, 'utf-8');
        return filePath;
    }

    /**
     * 创建技能 SKILL.md
     */
    async createSkillDefinition(skill) {
        const skillDir = path.join(this.skillsPath, skill.id);
        await fs.mkdir(skillDir, { recursive: true });

        const content = `---
name: ${skill.id}
title: ${skill.name}
version: 1.0.0
description: ${skill.description}
agents:
${skill.agents.map(a => `  - ${a}`).join('\n')}
allowed-tools:
  - Bash
  - Read
  - Write
tags:
  - 自动生成
  - 动态创建
category: dynamic
---

# ${skill.name}

## 功能描述
${skill.description}

## 执行步骤
${skill.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## 输入格式
\`\`\`json
{
  "task": "任务描述",
  "params": {}
}
\`\`\`

## 输出格式
根据具体任务返回相应结果

---
_此技能由 StarClaw 团队构建器自动创建_
`;

        const filePath = path.join(skillDir, 'SKILL.md');
        await fs.writeFile(filePath, content, 'utf-8');
        return filePath;
    }

    /**
     * 注册智能体到 registry.json
     */
    async registerAgents(agents) {
        let registry = { version: '2.0.0', agents: {}, teams: {} };
        
        try {
            const data = await fs.readFile(this.registryPath, 'utf-8');
            registry = JSON.parse(data);
        } catch (e) {
            // 文件不存在，使用默认结构
        }

        // 添加新智能体
        for (const agent of agents) {
            registry.agents[agent.id] = {
                name: agent.name,
                role: agent.role,
                team: agent.team,
                gender: 'male',
                personality: agent.personality,
                keywords: agent.skills,
                canCommand: [],
                skills: agent.skills,
                voice: agent.voice,
                signature: `我是${agent.name}`,
                summon: `[召唤:${agent.name}]`
            };
        }

        // 确保团队存在
        if (!registry.teams[agents[0]?.team]) {
            registry.teams[agents[0]?.team] = {
                name: agents[0]?.team,
                description: '动态创建的团队',
                members: agents.map(a => a.id)
            };
        }

        await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2), 'utf-8');
    }

    /**
     * 注册技能到 skills.json
     */
    async registerSkills(skills) {
        let skillsJson = { version: '1.0.0', skills: {} };
        
        try {
            const data = await fs.readFile(this.skillsJsonPath, 'utf-8');
            skillsJson = JSON.parse(data);
        } catch (e) {
            // 文件不存在，使用默认结构
        }

        // 添加新技能
        for (const skill of skills) {
            skillsJson.skills[skill.id] = {
                name: skill.name,
                agents: skill.agents,
                description: skill.description
            };
        }

        await fs.writeFile(this.skillsJsonPath, JSON.stringify(skillsJson, null, 2), 'utf-8');
    }

    /**
     * 验证团队创建结果
     */
    async validateTeam(teamDesign) {
        const results = {
            agentsCreated: true,
            skillsCreated: true,
            agentsRegistered: true,
            skillsRegistered: true,
            errors: []
        };

        // 检查智能体文件
        for (const agent of teamDesign.agents) {
            const soulPath = path.join(this.agentsPath, agent.id, 'SOUL.md');
            try {
                await fs.access(soulPath);
            } catch (e) {
                results.agentsCreated = false;
                results.errors.push(`智能体文件缺失: ${agent.id}`);
            }
        }

        // 检查技能文件
        for (const skill of teamDesign.skills) {
            const skillPath = path.join(this.skillsPath, skill.id, 'SKILL.md');
            try {
                await fs.access(skillPath);
            } catch (e) {
                results.skillsCreated = false;
                results.errors.push(`技能文件缺失: ${skill.id}`);
            }
        }

        results.success = results.agentsCreated && results.skillsCreated;
        return results;
    }

    /**
     * 工具方法：调用 LLM
     */
    async callLLM(prompt) {
        const response = await axios.post(
            `${this.llmApiBase}/chat/completions`,
            {
                model: 'glm-4-flash',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 2000
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.llmApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return response.data.choices[0].message.content;
    }

    /**
     * 工具方法：生成智能体名称
     */
    generateAgentName(role) {
        const surnames = ['星', '月', '云', '风', '雷', '光', '影', '梦'];
        const names = ['辉', '华', '杰', '伟', '明', '智', '博', '达'];
        const surname = surnames[Math.floor(Math.random() * surnames.length)];
        const name1 = names[Math.floor(Math.random() * names.length)];
        const name2 = names[Math.floor(Math.random() * names.length)];
        return surname + name1 + name2;
    }

    /**
     * 工具方法：生成个性描述
     */
    generatePersonality(role) {
        const personalities = {
            '分析师': '数据驱动，逻辑严密，善于发现规律',
            '设计师': '创意无限，审美出众，追求完美',
            '开发者': '技术扎实，追求高效，代码洁癖',
            '运营': '用户思维，增长黑客，数据敏感',
            '管理': '统筹全局，沟通协调，结果导向'
        };
        return personalities[role] || '专业敬业，持续学习，追求卓越';
    }
}

module.exports = TeamBuilderService;
