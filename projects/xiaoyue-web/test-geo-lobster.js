/**
 * GEO龙虾团队创建测试 - 直接调用 TeamBuilderService
 * 不依赖HTTP服务器，直接调用服务层
 */

// 加载环境变量
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const TeamBuilderService = require('./starclaw/services/TeamBuilderService');
const path = require('path');

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           🦞 GEO龙虾 团队创建测试                          ║');
    console.log('║     AI时代的企业数字身份构建师 & 首席AI流量官              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    // 初始化 TeamBuilderService
    const teamBuilder = new TeamBuilderService({
        agentsPath: path.join(__dirname, 'starclaw/agents'),
        skillsPath: path.join(__dirname, 'starclaw/skills'),
        llmApiKey: process.env.ZHIPU_API_KEY
    });

    // GEO龙虾完整需求定义
    const geoLobsterRequirement = `
## GEO龙虾 —— AI时代的企业数字身份构建师

### 市场背景
2026年生成式AI搜索全面普及，63%用户通过对话获取信息。GEO优化市场规模突破120亿元，年增速超45%。

### 核心痛点
1. 一模一策执行难：百度文心、字节豆包、DeepSeek等模型算法偏好迥异，企业缺乏系统化差异化的内容适配能力
2. 合规红线如履薄冰：AI平台对内容真实性、版权、隐私要求极严，违规可能导致品牌被永久降权
3. 效果黑洞ROI难算：传统GEO仅看关键词排名，但AI时代核心指标缺乏统一监测标准，75%企业无法精准追踪
4. 工程化流程缺失：GEO优化应是"审计-重构-对齐-迭代"的工程化闭环，但多数企业缺乏系统性

### 核心功能模块
1. AI认知全景审计：一键扫描品牌在百度文心、豆包、DeepSeek等平台的认知体检报告，竞品对标分析
2. 智能内容重构引擎：一模一策内容工厂，自动生成适配不同模型偏好的内容版本，EEAT结构化语义块封装
3. 全自动信源部署与对齐：权威信源自动发布到官网CMS、行业垂直媒体、百科平台，合规性实时巡检
4. 动态效果监测与迭代：多维度效果仪表盘监测AI可见度排名、引用频次、引用位置，智能调优建议

### 目标用户
年营销预算50万+的企业，特别是上市公司、跨境品牌、强监管行业（医疗/法律/金融）、高新技术企业

### 需要的角色
1. GEO策略架构师 - 整体策略规划和多模型规则内化
2. 内容重构工程师 - 一模一策内容适配和EEAT结构化
3. 信源部署专员 - 官网CMS、媒体后台自动操作（基于ISSUT/RPA）
4. 效果监测分析师 - 多平台数据监测和ROI分析
5. 合规风控官 - 内容合规审查和风险预警
`;

    console.log('📋 发送需求到 TeamBuilderService...');
    console.log(`   需求长度: ${geoLobsterRequirement.length} 字符`);
    console.log('');

    try {
        // 调用 buildTeam
        const result = await teamBuilder.buildTeam(geoLobsterRequirement);

        if (result.success) {
            console.log('╔══════════════════════════════════════════════════════════════╗');
            console.log('║  ✅ GEO龙虾团队创建成功！                                    ║');
            console.log('╚══════════════════════════════════════════════════════════════╝');
            console.log('');

            // 团队信息
            console.log('📊 团队概览:');
            console.log(`   ├─ 名称: ${result.team.name}`);
            console.log(`   ├─ ID: ${result.team.teamId}`);
            console.log(`   └─ 描述: ${result.team.description}`);
            console.log('');

            // 智能体列表
            console.log(`🤖 智能体 (${result.team.agents.length}个):`);
            result.team.agents.forEach((agent, i) => {
                console.log(`   ${i < result.team.agents.length - 1 ? '├─' : '└─'} 🦞 ${agent}`);
            });
            console.log('');

            // 技能列表
            console.log(`🔧 技能 (${result.team.skills.length}个):`);
            result.team.skills.forEach((skill, i) => {
                console.log(`   ${i < result.team.skills.length - 1 ? '├─' : '└─'} ⚡ ${skill}`);
            });
            console.log('');

            // 创建的文件
            console.log('📁 创建的文件:');
            console.log('   智能体 SOUL.md:');
            result.createdFiles.agents.forEach(f => {
                const relativePath = f.path.replace(__dirname + path.sep, '');
                console.log(`      ✅ ${relativePath}`);
            });
            console.log('   技能 SKILL.md:');
            result.createdFiles.skills.forEach(f => {
                const relativePath = f.path.replace(__dirname + path.sep, '');
                console.log(`      ✅ ${relativePath}`);
            });
            console.log('');

            // 验证结果
            console.log('🔍 验证结果:');
            const v = result.validation;
            console.log(`   ├─ 智能体文件: ${v.agentsCreated ? '✅ 已创建' : '❌ 缺失'}`);
            console.log(`   ├─ 技能文件:   ${v.skillsCreated ? '✅ 已创建' : '❌ 缺失'}`);
            console.log(`   ├─ 注册状态:   ${(v.agentsRegistered && v.skillsRegistered) ? '✅ 已注册' : '❌ 未注册'}`);
            console.log(`   └─ 总体验证:   ${v.success ? '✅ 通过' : '❌ 有问题'}`);

            if (v.errors && v.errors.length > 0) {
                console.log('');
                console.log('   ⚠️ 错误详情:');
                v.errors.forEach(err => console.log(`      - ${err}`));
            }

            console.log('');
            console.log(`⏰ 创建时间: ${result.timestamp}`);
            console.log('');

            // 显示 SOUL.md 内容预览
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📄 生成的智能体文件预览:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            for (const agentFile of result.createdFiles.agents) {
                try {
                    const fs = require('fs').promises;
                    const content = await fs.readFile(agentFile.path, 'utf-8');
                    const lines = content.split('\n');
                    const fileName = path.basename(path.dirname(agentFile.path));
                    console.log(`\n--- [${fileName}/SOUL.md] ---`);
                    // 显示前20行预览
                    lines.slice(0, 25).forEach(line => console.log(line));
                    if (lines.length > 25) console.log(`... (共${lines.length}行)`);
                } catch (e) {
                    console.log(`   无法读取: ${agentFile.path}`);
                }
            }

            // 显示 SKILL.md 内容预览
            for (const skillFile of result.createdFiles.skills) {
                try {
                    const fs = require('fs').promises;
                    const content = await fs.readFile(skillFile.path, 'utf-8');
                    const lines = content.split('\n');
                    const fileName = path.basename(path.dirname(skillFile.path));
                    console.log(`\n--- [${fileName}/SKILL.md] ---`);
                    lines.slice(0, 20).forEach(line => console.log(line));
                    if (lines.length > 20) console.log(`... (共${lines.length}行)`);
                } catch (e) {
                    console.log(`   无法读取: ${skillFile.path}`);
                }
            }

        } else {
            console.log('❌ GEO龙虾团队创建失败！');
            console.log(`   错误: ${result.error}`);
        }

    } catch (error) {
        console.error('💥 执行异常:', error.message);
        console.error(error.stack);
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// 运行
main().catch(console.error);
