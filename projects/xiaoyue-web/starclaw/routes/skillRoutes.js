/**
 * 技能管理 API 路由
 * 提供技能的安装、卸载、启用、禁用、搜索等接口
 */

const express = require('express');
const router = express.Router();
const SkillManager = require('../services/SkillManager');
const SkillMarket = require('../services/SkillMarket');
const EnhancedSkillMarket = require('../services/EnhancedSkillMarket');
const path = require('path');

// 初始化服务
const skillManager = new SkillManager({
    skillsPath: path.join(__dirname, '../skills'),
    registryPath: path.join(__dirname, '../skills/skills.json')
});

const skillMarket = new SkillMarket();
const enhancedMarket = new EnhancedSkillMarket({
    localSkillPath: 'C:\\D\\工作流n8n-coze-dify\\skill'
});

// 中间件：确保初始化
router.use(async (req, res, next) => {
    try {
        if (!skillManager.initialized) {
            await skillManager.initialize();
        }
        next();
    } catch (error) {
        res.status(500).json({ error: '技能管理器初始化失败', message: error.message });
    }
});

/**
 * GET /api/skills
 * 获取已安装的技能列表
 */
router.get('/', async (req, res) => {
    try {
        const skills = await skillManager.listInstalledSkills();
        res.json({
            success: true,
            count: skills.length,
            skills
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/skills/market
 * 获取技能市场列表(包含本地技能)
 */
router.get('/market', async (req, res) => {
    try {
        // 使用增强版市场,包含本地技能
        const skills = await enhancedMarket.getAllSkills();
        res.json({
            success: true,
            count: skills.length,
            skills
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/skills/categories
 * 按分类获取技能
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = await enhancedMarket.getSkillsByCategory();
        res.json({
            success: true,
            categories
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/skills/search
 * 搜索技能
 */
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: '请提供搜索关键词' });
        }

        const skills = await enhancedMarket.searchSkills(q);
        res.json({
            success: true,
            query: q,
            count: skills.length,
            skills
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/skills/:skillId
 * 获取技能详情
 */
router.get('/:skillId', async (req, res) => {
    try {
        const { skillId } = req.params;
        const skill = await skillManager.getSkillDetail(skillId);
        res.json({
            success: true,
            skill
        });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

/**
 * POST /api/skills/install
 * 安装技能
 */
router.post('/install', async (req, res) => {
    try {
        const { source, id, autoEnable } = req.body;

        if (!source) {
            return res.status(400).json({ error: '请提供技能来源' });
        }

        const result = await skillManager.installSkill(source, {
            id,
            autoEnable: autoEnable !== false
        });

        res.json({
            success: true,
            message: '技能安装成功',
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/skills/:skillId/uninstall
 * 卸载技能
 */
router.post('/:skillId/uninstall', async (req, res) => {
    try {
        const { skillId } = req.params;
        const result = await skillManager.uninstallSkill(skillId);
        res.json({
            success: true,
            message: '技能卸载成功',
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/skills/:skillId/enable
 * 启用技能
 */
router.post('/:skillId/enable', async (req, res) => {
    try {
        const { skillId } = req.params;
        const result = await skillManager.enableSkill(skillId);
        res.json({
            success: true,
            message: '技能已启用',
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/skills/:skillId/disable
 * 禁用技能
 */
router.post('/:skillId/disable', async (req, res) => {
    try {
        const { skillId } = req.params;
        const result = await skillManager.disableSkill(skillId);
        res.json({
            success: true,
            message: '技能已禁用',
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/skills/:skillId/execute
 * 执行技能
 */
router.post('/:skillId/execute', async (req, res) => {
    try {
        const { skillId } = req.params;
        const { input, context } = req.body;

        const result = await skillManager.executeSkill(skillId, input, context);
        
        // 这里可以集成 WorkflowEngine 来实际执行技能
        // const workflowEngine = new WorkflowEngine(config);
        // const execution = await workflowEngine.executeSkill({ skill: skillId, input }, context);

        res.json({
            success: true,
            message: '技能执行请求已接收',
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/skills/refresh-cache
 * 刷新技能市场缓存
 */
router.post('/refresh-cache', async (req, res) => {
    try {
        enhancedMarket.refreshCache();
        skillMarket.refreshCache();
        res.json({
            success: true,
            message: '缓存已刷新'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/skills/stats
 * 获取技能统计信息
 */
router.get('/stats', async (req, res) => {
    try {
        const skills = await skillManager.listInstalledSkills();
        const enabled = skills.filter(s => s.enabled).length;
        const disabled = skills.filter(s => !s.enabled).length;

        res.json({
            success: true,
            stats: {
                total: skills.length,
                enabled,
                disabled,
                categories: {}
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
