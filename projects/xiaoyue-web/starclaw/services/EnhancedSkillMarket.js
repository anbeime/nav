/**
 * EnhancedSkillMarket - 增强版技能市场服务
 * 集成本地技能库和在线技能市场
 * 参考WorkBuddy的技能管理模式
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

class EnhancedSkillMarket {
    constructor(config = {}) {
        this.marketUrl = config.marketUrl || 'https://api.github.com/repos/anbeime/openclaw-skill-market/contents/skills';
        this.localSkillPath = config.localSkillPath || 'C:\\D\\工作流n8n-coze-dify\\skill';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
        this.categories = this.initCategories();
    }

    /**
     * 初始化技能分类系统
     */
    initCategories() {
        return {
            // 内容创作类
            'content_creation': {
                name: '内容创作',
                icon: '✍️',
                description: '文案、视频、音频、图片创作',
                skills: []
            },
            // 开发工具类
            'development': {
                name: '开发工具',
                icon: '💻',
                description: '代码开发、调试、测试',
                skills: []
            },
            // 数据分析类
            'data_analysis': {
                name: '数据分析',
                icon: '📊',
                description: '数据处理、可视化、分析报告',
                skills: []
            },
            // 办公效率类
            'productivity': {
                name: '办公效率',
                icon: '📁',
                description: '文档、表格、PPT、PDF处理',
                skills: []
            },
            // 营销推广类
            'marketing': {
                name: '营销推广',
                icon: '📢',
                description: '营销策划、推广文案、社媒运营',
                skills: []
            },
            // 视觉设计类
            'design': {
                name: '视觉设计',
                icon: '🎨',
                description: '图片设计、视频制作、UI设计',
                skills: []
            },
            // 商务办公类
            'business': {
                name: '商务办公',
                icon: '💼',
                description: '简历、求职、商业计划',
                skills: []
            },
            // 生活助手类
            'lifestyle': {
                name: '生活助手',
                icon: '🏠',
                description: '日程管理、天气查询、生活服务',
                skills: []
            },
            // 教育学习类
            'education': {
                name: '教育学习',
                icon: '📚',
                description: '学习辅导、知识问答、翻译',
                skills: []
            },
            // 技术研究类
            'research': {
                name: '技术研究',
                icon: '🔬',
                description: '论文分析、技术研究、调研报告',
                skills: []
            },
            // 电商运营类
            'ecommerce': {
                name: '电商运营',
                icon: '🛒',
                description: '商品文案、营销视频、运营分析',
                skills: []
            },
            // 其他
            'other': {
                name: '其他',
                icon: '🔧',
                description: '其他类型技能',
                skills: []
            }
        };
    }

    /**
     * 扫描本地技能库
     */
    async scanLocalSkills() {
        const skills = [];
        try {
            const entries = await fs.readdir(this.localSkillPath, { withFileTypes: true });
            
            for (const entry of entries) {
                if (!entry.isDirectory() && !entry.name.endsWith('.skill') && !entry.name.includes('.')) {
                    continue;
                }

                const skillPath = path.join(this.localSkillPath, entry.name);
                const skillInfo = await this.parseLocalSkill(skillPath, entry.name);
                
                if (skillInfo) {
                    skills.push(skillInfo);
                }
            }
        } catch (error) {
            console.error('[EnhancedSkillMarket] 扫描本地技能失败:', error);
        }
        
        return skills;
    }

    /**
     * 解析本地技能
     */
    async parseLocalSkill(skillPath, skillName) {
        try {
            // 检查是否为技能目录或技能包
            const stat = await fs.stat(skillPath);
            
            // .skill 文件或目录
            let skillDir = skillPath;
            if (skillName.endsWith('.skill')) {
                // 解压或读取技能包
                skillDir = skillPath;
            }

            // 尝试读取 SKILL.md
            const skillFile = path.join(skillDir, 'SKILL.md');
            try {
                const content = await fs.readFile(skillFile, 'utf-8');
                const metadata = this.parseSkillMetadata(content, skillName);
                
                return {
                    ...metadata,
                    id: metadata.id || this.skillNameToId(skillName),
                    source: 'local',
                    localPath: skillPath,
                    installed: true,
                    installUrl: skillPath
                };
            } catch (e) {
                // 没有 SKILL.md,根据文件名推断
                return this.inferSkillInfo(skillName, skillPath);
            }
        } catch (error) {
            return null;
        }
    }

    /**
     * 解析技能元数据
     */
    parseSkillMetadata(content, skillName) {
        const metadata = {
            id: this.skillNameToId(skillName),
            name: skillName,
            description: '',
            version: '1.0.0',
            author: 'unknown',
            tags: [],
            category: 'other'
        };

        // 解析 frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            const lines = frontmatter.split('\n');
            
            for (const line of lines) {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim();
                    let value = line.substring(colonIndex + 1).trim();
                    
                    // 处理数组
                    if (value.startsWith('[') && value.endsWith(']')) {
                        value = value.slice(1, -1).split(',').map(s => s.trim());
                    }
                    
                    // 映射字段
                    if (key === 'name') metadata.name = value;
                    else if (key === 'title') metadata.name = value;
                    else if (key === 'description') metadata.description = value;
                    else if (key === 'version') metadata.version = value;
                    else if (key === 'author') metadata.author = value;
                    else if (key === 'tags') metadata.tags = Array.isArray(value) ? value : [value];
                    else if (key === 'category') metadata.category = value;
                }
            }
        }

        // 从内容中提取描述
        if (!metadata.description) {
            const descMatch = content.match(/##\s*功能描述\s*\n+([^\n#]+)/);
            if (descMatch) {
                metadata.description = descMatch[1].trim();
            }
        }

        return metadata;
    }

    /**
     * 根据文件名推断技能信息
     */
    inferSkillInfo(skillName, skillPath) {
        const id = this.skillNameToId(skillName);
        
        // 技能名称映射
        const nameMap = {
            'video-creation': '视频创作',
            'content-creation': '内容创作',
            'product-video': '产品视频制作',
            'ecommerce': '电商运营',
            'xiaohongshu': '小红书运营',
            'wechat': '微信生态',
            'ppt': 'PPT制作',
            'pdf': 'PDF处理',
            'docx': 'Word文档',
            'xlsx': 'Excel表格',
            'legal': '法律助手',
            'stock': '股票分析',
            'resume': '简历生成',
            'paper': '论文分析',
            'finance': '财务建模',
            'design': '设计工具',
            'tts': '语音合成',
            'video': '视频处理',
            'music': '音乐创作',
            'agent': '智能体',
            'automation': '自动化工具',
            'chrome': 'Chrome自动化',
            'obsidian': 'Obsidian笔记',
            'infinitetalk': 'AI配音'
        };

        // 分类推断
        const categoryMap = {
            'video': 'content_creation',
            'content': 'content_creation',
            'ppt': 'productivity',
            'pdf': 'productivity',
            'docx': 'productivity',
            'xlsx': 'productivity',
            'code': 'development',
            'dev': 'development',
            'data': 'data_analysis',
            'analysis': 'data_analysis',
            'market': 'marketing',
            'ecommerce': 'ecommerce',
            'xiaohongshu': 'marketing',
            'wechat': 'marketing',
            'design': 'design',
            'visual': 'design',
            'stock': 'business',
            'resume': 'business',
            'legal': 'business',
            'paper': 'research',
            'tts': 'content_creation',
            'music': 'content_creation',
            'agent': 'development',
            'automation': 'productivity'
        };

        // 根据名称推断分类
        let category = 'other';
        for (const [key, cat] of Object.entries(categoryMap)) {
            if (id.includes(key)) {
                category = cat;
                break;
            }
        }

        // 生成友好的名称
        let friendlyName = skillName;
        for (const [key, name] of Object.entries(nameMap)) {
            if (id.includes(key)) {
                friendlyName = name;
                break;
            }
        }

        return {
            id,
            name: friendlyName,
            description: `${friendlyName}技能`,
            version: '1.0.0',
            author: 'Community',
            category,
            tags: this.inferTags(id),
            source: 'local',
            localPath: skillPath,
            installed: true,
            installUrl: skillPath
        };
    }

    /**
     * 推断标签
     */
    inferTags(skillId) {
        const tags = [];
        const tagMap = {
            'video': ['视频', '创作'],
            'content': ['内容', '创作'],
            'ppt': ['PPT', '演示'],
            'pdf': ['PDF', '文档'],
            'docx': ['Word', '文档'],
            'xlsx': ['Excel', '表格'],
            'code': ['代码', '开发'],
            'data': ['数据', '分析'],
            'market': ['营销', '推广'],
            'design': ['设计', '视觉'],
            'tts': ['语音', '合成'],
            'music': ['音乐', '创作'],
            'agent': ['智能体', 'AI']
        };

        for (const [key, tagList] of Object.entries(tagMap)) {
            if (skillId.includes(key)) {
                tags.push(...tagList);
            }
        }

        return [...new Set(tags)];
    }

    /**
     * 技能名称转ID
     */
    skillNameToId(skillName) {
        return skillName
            .replace(/\.skill$/i, '')
            .replace(/\.zip$/i, '')
            .replace(/\.tar$/i, '')
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .toLowerCase();
    }

    /**
     * 获取所有技能(本地+在线)
     */
    async getAllSkills() {
        const cacheKey = 'all-skills';
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            // 并行获取本地和在线技能
            const [localSkills, onlineSkills] = await Promise.all([
                this.scanLocalSkills(),
                this.getOnlineSkills()
            ]);

            // 合并去重
            const skillMap = new Map();
            
            // 先添加在线技能
            onlineSkills.forEach(skill => {
                skillMap.set(skill.id, { ...skill, source: 'online' });
            });

            // 再添加本地技能(覆盖在线)
            localSkills.forEach(skill => {
                if (skillMap.has(skill.id)) {
                    skillMap.set(skill.id, { ...skillMap.get(skill.id), ...skill, installed: true });
                } else {
                    skillMap.set(skill.id, skill);
                }
            });

            const allSkills = Array.from(skillMap.values());
            
            // 更新分类
            this.categorizeSkills(allSkills);

            // 缓存
            this.cache.set(cacheKey, {
                data: allSkills,
                timestamp: Date.now()
            });

            return allSkills;
        } catch (error) {
            console.error('[EnhancedSkillMarket] 获取技能列表失败:', error);
            return this.getDefaultSkills();
        }
    }

    /**
     * 获取在线技能
     */
    async getOnlineSkills() {
        try {
            const skills = await this.fetchFromMarket();
            return skills;
        } catch (error) {
            console.error('[EnhancedSkillMarket] 获取在线技能失败:', error);
            return [];
        }
    }

    /**
     * 从远程市场获取
     */
    fetchFromMarket() {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': 'StarClaw-SkillManager/2.0',
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
                                    source: 'online',
                                    installUrl: item.html_url
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
     * 技能分类
     */
    categorizeSkills(skills) {
        // 重置分类
        for (const cat of Object.keys(this.categories)) {
            this.categories[cat].skills = [];
        }

        // 分类技能
        for (const skill of skills) {
            const category = skill.category || 'other';
            if (this.categories[category]) {
                this.categories[category].skills.push(skill);
            } else {
                this.categories['other'].skills.push(skill);
            }
        }
    }

    /**
     * 按分类获取技能
     */
    async getSkillsByCategory() {
        await this.getAllSkills();
        return this.categories;
    }

    /**
     * 搜索技能
     */
    async searchSkills(query) {
        const skills = await this.getAllSkills();
        const lowerQuery = query.toLowerCase();

        return skills.filter(skill => {
            return (
                skill.name.toLowerCase().includes(lowerQuery) ||
                skill.description.toLowerCase().includes(lowerQuery) ||
                (skill.tags && skill.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) ||
                skill.id.toLowerCase().includes(lowerQuery)
            );
        });
    }

    /**
     * 获取技能详情
     */
    async getSkillDetail(skillId) {
        const skills = await this.getAllSkills();
        const skill = skills.find(s => s.id === skillId);

        if (!skill) {
            throw new Error(`技能不存在: ${skillId}`);
        }

        // 如果是本地技能,读取完整内容
        if (skill.localPath) {
            try {
                const skillFile = path.join(skill.localPath, 'SKILL.md');
                const content = await fs.readFile(skillFile, 'utf-8');
                return { ...skill, content };
            } catch (e) {
                // 忽略错误
            }
        }

        return skill;
    }

    /**
     * 获取推荐技能
     */
    async getRecommendedSkills(limit = 10) {
        const skills = await this.getAllSkills();
        
        // 优先推荐已安装但未启用的技能,然后是热门技能
        return skills
            .sort((a, b) => {
                if (a.installed && !b.installed) return -1;
                if (!a.installed && b.installed) return 1;
                return 0;
            })
            .slice(0, limit);
    }

    /**
     * 获取默认技能
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
                installed: true,
                source: 'builtin'
            },
            {
                id: 'content_creation',
                name: '内容创作',
                description: '剧本、文案、故事创作',
                category: 'content_creation',
                tags: ['内容', '创作', '文案'],
                author: 'StarClaw Team',
                version: '1.0.0',
                installed: true,
                source: 'builtin'
            },
            {
                id: 'marketing_plan',
                name: '营销策划',
                description: '产品营销与用户增长方案',
                category: 'marketing',
                tags: ['营销', '策划', '增长'],
                author: 'StarClaw Team',
                version: '1.0.0',
                installed: true,
                source: 'builtin'
            }
        ];
    }

    /**
     * 刷新缓存
     */
    refreshCache() {
        this.cache.clear();
        console.log('[EnhancedSkillMarket] 缓存已清除');
    }

    /**
     * 导出技能列表为JSON
     */
    async exportSkillList(outputPath) {
        const skills = await this.getAllSkills();
        const data = {
            version: '2.0.0',
            exportedAt: new Date().toISOString(),
            totalCount: skills.length,
            categories: this.categories,
            skills
        };

        await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`[EnhancedSkillMarket] 技能列表已导出到: ${outputPath}`);
        
        return data;
    }
}

module.exports = EnhancedSkillMarket;
