#!/usr/bin/env node
/**
 * 技能安装脚本
 * 用法: node install-skill.js <source> [options]
 * 
 * 示例:
 *   node install-skill.js https://github.com/user/skill-name.git
 *   node install-skill.js ./local-skill
 *   node install-skill.js npm://skill-package-name
 *   node install-skill.js --list
 *   node install-skill.js --search keyword
 */

const SkillManager = require('../services/SkillManager');
const SkillMarket = require('../services/SkillMarket');
const path = require('path');

// 解析命令行参数
const args = process.argv.slice(2);
const command = args[0];

async function main() {
    const manager = new SkillManager({
        skillsPath: path.join(__dirname, '../skills'),
        registryPath: path.join(__dirname, '../skills/skills.json')
    });

    await manager.initialize();

    try {
        if (!command || command === '--help' || command === '-h') {
            showHelp();
        } else if (command === '--list' || command === '-l') {
            await listSkills(manager);
        } else if (command === '--market' || command === '-m') {
            await showMarket();
        } else if (command === '--search' || command === '-s') {
            const query = args[1];
            if (!query) {
                console.error('请提供搜索关键词');
                process.exit(1);
            }
            await searchSkills(query);
        } else if (command === '--uninstall' || command === '-u') {
            const skillId = args[1];
            if (!skillId) {
                console.error('请提供技能 ID');
                process.exit(1);
            }
            await uninstallSkill(manager, skillId);
        } else if (command === '--enable' || command === '-e') {
            const skillId = args[1];
            if (!skillId) {
                console.error('请提供技能 ID');
                process.exit(1);
            }
            await enableSkill(manager, skillId);
        } else if (command === '--disable' || command === '-d') {
            const skillId = args[1];
            if (!skillId) {
                console.error('请提供技能 ID');
                process.exit(1);
            }
            await disableSkill(manager, skillId);
        } else if (command === '--info' || command === '-i') {
            const skillId = args[1];
            if (!skillId) {
                console.error('请提供技能 ID');
                process.exit(1);
            }
            await showSkillInfo(manager, skillId);
        } else {
            // 安装技能
            await installSkill(manager, command, args);
        }
    } catch (error) {
        console.error('\n操作失败:', error.message);
        process.exit(1);
    }
}

/**
 * 显示帮助信息
 */
function showHelp() {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║          StarClaw 技能管理器 v2.0                        ║
╚══════════════════════════════════════════════════════════╝

用法:
  node install-skill.js <source>        安装技能
  node install-skill.js --list          列出已安装技能
  node install-skill.js --market        查看技能市场
  node install-skill.js --search <关键词>  搜索技能
  node install-skill.js --info <技能ID>   查看技能详情
  node install-skill.js --uninstall <技能ID>  卸载技能
  node install-skill.js --enable <技能ID>    启用技能
  node install-skill.js --disable <技能ID>   禁用技能

安装来源:
  Git 仓库:  https://github.com/user/skill.git
  本地路径:  ./path/to/skill
  npm 包:    npm://package-name

选项:
  --id <id>      指定技能 ID
  --no-enable    安装后不自动启用

示例:
  # 从 Git 安装
  node install-skill.js https://github.com/anbeime/xiaoyue-companion-skill.git

  # 从本地目录安装
  node install-skill.js ./my-skill

  # 从 npm 安装
  node install-skill.js npm://openclaw-skill-example

  # 列出已安装技能
  node install-skill.js --list

  # 搜索技能
  node install-skill.js --search 代码

  # 查看技能详情
  node install-skill.js --info code_development
`);
}

/**
 * 列出已安装的技能
 */
async function listSkills(manager) {
    const skills = await manager.listInstalledSkills();

    if (skills.length === 0) {
        console.log('\n暂无已安装的技能\n');
        return;
    }

    console.log('\n已安装的技能:');
    console.log('─'.repeat(60));

    for (const skill of skills) {
        const status = skill.enabled ? '✅ 已启用' : '⏸️ 已禁用';
        console.log(`\n📦 ${skill.name} (${skill.id})`);
        console.log(`   状态: ${status}`);
        console.log(`   描述: ${skill.description || '无描述'}`);
        console.log(`   版本: ${skill.version || '1.0.0'}`);
        console.log(`   作者: ${skill.author || 'unknown'}`);
    }

    console.log('\n' + '─'.repeat(60));
    console.log(`共 ${skills.length} 个技能\n`);
}

/**
 * 显示技能市场
 */
async function showMarket() {
    const market = new SkillMarket();
    const skills = await market.getMarketSkills();

    console.log('\n技能市场:');
    console.log('─'.repeat(60));

    for (const skill of skills) {
        const installed = skill.installed ? '✅ 已安装' : '⬜ 未安装';
        console.log(`\n📦 ${skill.name} (${skill.id})`);
        console.log(`   状态: ${installed}`);
        console.log(`   描述: ${skill.description || '无描述'}`);
        console.log(`   分类: ${skill.category || '其他'}`);
        console.log(`   标签: ${(skill.tags || []).join(', ')}`);
    }

    console.log('\n' + '─'.repeat(60));
    console.log(`共 ${skills.length} 个技能\n`);
    console.log('使用以下命令安装:');
    console.log('  node install-skill.js <技能ID或来源>\n');
}

/**
 * 搜索技能
 */
async function searchSkills(query) {
    const market = new SkillMarket();
    const skills = await market.searchSkills(query);

    if (skills.length === 0) {
        console.log(`\n未找到匹配 "${query}" 的技能\n`);
        return;
    }

    console.log(`\n搜索结果 (${query}):`);
    console.log('─'.repeat(60));

    for (const skill of skills) {
        const installed = skill.installed ? '✅' : '⬜';
        console.log(`${installed} ${skill.name} (${skill.id}) - ${skill.description}`);
    }

    console.log('\n');
}

/**
 * 安装技能
 */
async function installSkill(manager, source, args) {
    console.log('\n正在安装技能...\n');

    // 解析选项
    const options = {};
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--id' && args[i + 1]) {
            options.id = args[i + 1];
            i++;
        } else if (args[i] === '--no-enable') {
            options.autoEnable = false;
        }
    }

    const result = await manager.installSkill(source, options);

    console.log('\n✅ 安装成功!');
    console.log(`   技能ID: ${result.skillId}`);
    console.log(`   名称: ${result.info.name}`);
    console.log(`   描述: ${result.info.description}`);
    console.log('\n');
}

/**
 * 卸载技能
 */
async function uninstallSkill(manager, skillId) {
    console.log(`\n正在卸载技能: ${skillId}...\n`);
    await manager.uninstallSkill(skillId);
    console.log('✅ 卸载成功!\n');
}

/**
 * 启用技能
 */
async function enableSkill(manager, skillId) {
    await manager.enableSkill(skillId);
    console.log(`\n✅ 技能已启用: ${skillId}\n`);
}

/**
 * 禁用技能
 */
async function disableSkill(manager, skillId) {
    await manager.disableSkill(skillId);
    console.log(`\n✅ 技能已禁用: ${skillId}\n`);
}

/**
 * 显示技能详情
 */
async function showSkillInfo(manager, skillId) {
    const skill = await manager.getSkillDetail(skillId);

    console.log('\n技能详情:');
    console.log('─'.repeat(60));
    console.log(`ID:     ${skill.id}`);
    console.log(`名称:   ${skill.name}`);
    console.log(`版本:   ${skill.version || '1.0.0'}`);
    console.log(`作者:   ${skill.author || 'unknown'}`);
    console.log(`状态:   ${skill.enabled ? '已启用' : '已禁用'}`);
    console.log(`描述:   ${skill.description || '无描述'}`);

    if (skill.agents && skill.agents.length > 0) {
        console.log(`关联智能体: ${skill.agents.join(', ')}`);
    }

    if (skill.tags && skill.tags.length > 0) {
        console.log(`标签: ${skill.tags.join(', ')}`);
    }

    if (skill.content) {
        console.log('\n定义文件 (SKILL.md):');
        console.log('─'.repeat(60));
        console.log(skill.content.substring(0, 500));
        if (skill.content.length > 500) {
            console.log('... (内容已截断)');
        }
    }

    console.log('\n');
}

// 运行
main().catch(console.error);
