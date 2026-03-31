/**
 * SkillMarket - 技能市场服务
 * 支持从远程仓库获取技能列表、搜索技能、查看技能详情
 */

const https = require('https');
const http = require('http');

class SkillMarket {
    constructor(config = {}) {
        this.marketUrl = config.marketUrl || 'https://api.github.com/repos/anbeime/openclaw-skill-market/contents/skills';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
    }

    /**
     * 获取技能市场列表
     */
    async getMarketSkills() {
        // 检查缓存
        const cacheKey = 'market-skills';
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const skills = await this.fetchFromMarket();
            this.cache.set(cacheKey, {
                data: skills,
                timestamp: Date.now()
            });
            return skills;
        } catch (error) {
            console.error('[SkillMarket] 获取技能列表失败:', error);
            // 返回默认技能列表
            return this.getDefaultSkills();
        }
    }

    /**
     * 从远程市场获取技能列表
     */
    fetchFromMarket() {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': 'StarClaw-SkillManager/1.0',
                    'Accept': 'application/vnd.github.v3+json'
                }
            };

            https.get(this.marketUrl, options, (res) => {
                let data = '';

                res.on('data', chunk => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        if (res.statusCode === 200) {
                            const items = JSON.parse(data);
                            const skills = items
                                .filter(item => item.type === 'dir')
                                .map(item => ({
                                    id: item.name,
                                    name: item.name,
                                    description: '从 OpenClaw 技能市场获取',
                                    source: item.html_url,
                                    installUrl: `https://github.com/anbeime/openclaw-skill-market.git`,
                                    path: `skills/${item.name}`
                                }));
                            resolve(skills);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', reject);
        });
    }

    /**
     * 获取默认技能列表（内置）
     */
    getDefaultSkills() {
        return [
            {
                id: 'code_development',
                name: '代码开发',
                description: '直接编写可运行的代码，解决具体的技术问题',
                category: 'development',
                tags: ['代码', '开发', '编程'],
                author: 'StarClaw Team',
                version: '1.0.0',
                installed: true
            },
            {
                id: 'content_creation',
                name: '内容创作',
                description: '剧本、文案、故事创作',
                category: 'creative',
                tags: ['内容', '创作', '文案'],
                author: 'StarClaw Team',
                version: '1.0.0',
                installed: true
            },
            {
                id: 'marketing_plan',
                name: '营销策划',
                description: '产品营销与用户增长方案',
                category: 'marketing',
                tags: ['营销', '策划', '增长'],
                author: 'StarClaw Team',
                version: '1.0.0',
                installed: true
            },
            {
                id: 'music_creation',
                name: '音乐创作',
                description: '配乐与音效方案',
                category: 'creative',
                tags: ['音乐', '配乐', '音效'],
                author: 'StarClaw Team',
                version: '1.0.0',
                installed: true
            },
            {
                id: 'strategic_decision',
                name: '战略决策',
                description: '用第一性原理进行商业决策',
                category: 'strategy',
                tags: ['战略', '决策', '商业'],
                author: 'StarClaw Team',
                version: '1.0.0',
                installed: true
            },
            {
                id: 'visual_design',
                name: '视觉设计',
                description: '视觉创意与设计指导',
                category: 'design',
                tags: ['视觉', '设计', '创意'],
                author: 'StarClaw Team',
                version: '1.0.0',
                installed: true
            },
            // OpenClaw 社区技能
            {
                id: 'xiaoyue-companion',
                name: '小跃虚拟伴侣',
                description: '为 AI 助手添加温暖的对话陪伴和场景图片分享能力',
                category: 'companion',
                tags: ['伴侣', '陪伴', '对话'],
                author: 'Community',
                version: '1.0.0',
                installed: false,
                source: 'https://github.com/anbeime/xiaoyue-companion-skill.git'
            },
            {
                id: 'web-scraper',
                name: '网页爬虫',
                description: '提取网页内容、解析数据、生成结构化输出',
                category: 'tool',
                tags: ['爬虫', '网页', '数据'],
                author: 'OpenClaw Community',
                version: '1.0.0',
                installed: false,
                source: 'https://github.com/anbeime/openclaw-skill-webscraper.git'
            },
            {
                id: 'document-writer',
                name: '文档编写',
                description: '智能编写各类文档、报告、邮件',
                category: 'productivity',
                tags: ['文档', '写作', '报告'],
                author: 'OpenClaw Community',
                version: '1.0.0',
                installed: false,
                source: 'https://github.com/anbeime/openclaw-skill-document.git'
            },
            {
                id: 'data-analyzer',
                name: '数据分析',
                description: '数据清洗、统计分析、可视化图表',
                category: 'analysis',
                tags: ['数据', '分析', '统计'],
                author: 'OpenClaw Community',
                version: '1.0.0',
                installed: false,
                source: 'https://github.com/anbeime/openclaw-skill-data.git'
            }
        ];
    }

    /**
     * 搜索技能
     */
    async searchSkills(query) {
        const skills = await this.getMarketSkills();
        const lowerQuery = query.toLowerCase();

        return skills.filter(skill => {
            return (
                skill.name.toLowerCase().includes(lowerQuery) ||
                skill.description.toLowerCase().includes(lowerQuery) ||
                (skill.tags && skill.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
            );
        });
    }

    /**
     * 按分类获取技能
     */
    async getSkillsByCategory() {
        const skills = await this.getMarketSkills();
        const categories = {};

        for (const skill of skills) {
            const category = skill.category || 'other';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(skill);
        }

        return categories;
    }

    /**
     * 获取技能详情
     */
    async getSkillDetail(skillId) {
        const skills = await this.getMarketSkills();
        const skill = skills.find(s => s.id === skillId);

        if (!skill) {
            throw new Error(`技能不存在: ${skillId}`);
        }

        return skill;
    }

    /**
     * 刷新缓存
     */
    refreshCache() {
        this.cache.clear();
        console.log('[SkillMarket] 缓存已清除');
    }

    /**
     * 添加自定义技能源
     */
    addCustomSource(sourceUrl) {
        // 可以扩展支持多个技能市场源
        console.log(`[SkillMarket] 添加自定义源: ${sourceUrl}`);
        // TODO: 实现多源支持
    }
}

module.exports = SkillMarket;
