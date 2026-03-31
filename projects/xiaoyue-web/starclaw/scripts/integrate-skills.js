/**
 * 技能系统集成补丁
 * 将技能管理系统集成到主服务器
 */

const express = require('express');
const path = require('path');

// 在 server-with-openclaw.js 中添加以下代码

/**
 * ==================== 技能系统 ====================
 */
function integrateSkillSystem(app) {
    // 技能管理路由
    try {
        const skillRoutes = require('./starclaw/routes/skillRoutes');
        app.use('/api/skills', skillRoutes);
        console.log('[SkillSystem] 技能管理 API 已启用');
    } catch (e) {
        console.error('[SkillSystem] 技能管理 API 加载失败:', e.message);
    }

    // 技能管理界面
    app.get('/skill-manager.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'skill-manager.html'));
    });

    // 技能市场数据接口
    app.get('/api/skill-market', async (req, res) => {
        try {
            const SkillMarket = require('./starclaw/services/SkillMarket');
            const market = new SkillMarket();
            const skills = await market.getMarketSkills();
            res.json({ success: true, skills });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    console.log('[SkillSystem] 技能系统集成完成');
    console.log('[SkillSystem] 管理界面: http://localhost:3000/skill-manager.html');
    console.log('[SkillSystem] API 文档: http://localhost:3000/api/skills');
}

/**
 * ==================== 使用示例 ====================
 * 
 * 在 server-with-openclaw.js 中添加：
 * 
 * const { integrateSkillSystem } = require('./starclaw/scripts/integrate-skills');
 * 
 * // 在创建 app 后调用
 * integrateSkillSystem(app);
 */

/**
 * ==================== 快速启动脚本 ====================
 */

// 如果直接运行此文件，创建测试服务器
if (require.main === module) {
    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(cors());
    app.use(express.json());

    // 静态文件
    app.use(express.static(path.join(__dirname, 'public')));

    // 集成技能系统
    integrateSkillSystem(app);

    // 健康检查
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // 启动服务器
    app.listen(PORT, () => {
        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║          StarClaw 技能管理系统                           ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log(`\n服务器运行在: http://localhost:${PORT}`);
        console.log(`技能管理界面: http://localhost:${PORT}/skill-manager.html`);
        console.log(`API 文档: http://localhost:${PORT}/api/skills\n`);
    });
}

module.exports = { integrateSkillSystem };
