/**
 * 批量导入技能工具
 * 扫描本地技能库并批量导入到 StarClaw 系统
 */

const fs = require('fs').promises;
const path = require('path');
const EnhancedSkillMarket = require('../services/EnhancedSkillMarket');
const SkillManager = require('../services/SkillManager');

class SkillBatchImporter {
    constructor(config = {}) {
        this.localSkillPath = config.localSkillPath || 'C:\\D\\工作流n8n-coze-dify\\skill';
        this.targetSkillPath = config.targetSkillPath || path.join(__dirname, '../skills');
        this.skillMarket = new EnhancedSkillMarket({ localSkillPath: this.localSkillPath });
        this.skillManager = new SkillManager({ skillsPath: this.targetSkillPath });
        this.stats = {
            total: 0,
            imported: 0,
            skipped: 0,
            failed: 0,
            errors: []
        };
    }

    /**
     * 执行批量导入
     */
    async import() {
        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║       StarClaw 技能批量导入工具 v2.0                     ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

        try {
            // 初始化
            await this.skillManager.initialize();

            // 扫描本地技能
            console.log('📂 正在扫描本地技能库...');
            console.log(`   路径: ${this.localSkillPath}\n`);
            
            const skills = await this.skillMarket.scanLocalSkills();
            this.stats.total = skills.length;

            console.log(`✓ 发现 ${skills.length} 个技能\n`);
            console.log('─'.repeat(60));

            // 分类统计
            const categories = {};
            skills.forEach(skill => {
                const cat = skill.category || 'other';
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(skill);
            });

            console.log('\n分类统计:');
            Object.entries(categories).forEach(([cat, items]) => {
                console.log(`  ${cat}: ${items.length} 个`);
            });
            console.log('\n');

            // 批量导入
            console.log('开始导入...\n');
            
            for (const skill of skills) {
                await this.importSkill(skill);
            }

            // 显示结果
            this.showSummary();

            // 导出技能列表
            const outputPath = path.join(this.targetSkillPath, 'imported-skills.json');
            await this.skillMarket.exportSkillList(outputPath);
            console.log(`\n📄 技能列表已导出到: ${outputPath}`);

        } catch (error) {
            console.error('\n❌ 导入失败:', error);
            throw error;
        }
    }

    /**
     * 导入单个技能
     */
    async importSkill(skill) {
        console.log(`📦 ${skill.name} (${skill.id})`);
        console.log(`   分类: ${skill.category || 'other'}`);
        console.log(`   来源: ${skill.source}`);

        try {
            // 检查是否已安装
            const existingSkills = await this.skillManager.listInstalledSkills();
            if (existingSkills.find(s => s.id === skill.id)) {
                console.log('   状态: ⏭️  已存在,跳过\n');
                this.stats.skipped++;
                return;
            }

            // 复制技能到目标目录
            const targetPath = path.join(this.targetSkillPath, skill.id);
            await this.copySkillDirectory(skill.localPath, targetPath);

            // 注册到技能管理器
            await this.skillManager.installSkill(skill.localPath, {
                id: skill.id,
                autoEnable: true
            });

            console.log('   状态: ✅ 导入成功\n');
            this.stats.imported++;

        } catch (error) {
            console.log(`   状态: ❌ 导入失败: ${error.message}\n`);
            this.stats.failed++;
            this.stats.errors.push({
                skill: skill.id,
                error: error.message
            });
        }
    }

    /**
     * 复制技能目录
     */
    async copySkillDirectory(src, dest) {
        try {
            await fs.mkdir(dest, { recursive: true });
            const entries = await fs.readdir(src, { withFileTypes: true });

            for (const entry of entries) {
                const srcPath = path.join(src, entry.name);
                const destPath = path.join(dest, entry.name);

                if (entry.isDirectory()) {
                    await this.copySkillDirectory(srcPath, destPath);
                } else {
                    await fs.copyFile(srcPath, destPath);
                }
            }
        } catch (error) {
            // 如果复制失败,尝试直接使用原路径
            console.log(`   注意: 使用原始路径 ${src}`);
        }
    }

    /**
     * 显示导入摘要
     */
    showSummary() {
        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║                    导入完成                              ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

        console.log('统计信息:');
        console.log('─'.repeat(40));
        console.log(`总计扫描: ${this.stats.total} 个技能`);
        console.log(`成功导入: ${this.stats.imported} 个`);
        console.log(`已存在跳过: ${this.stats.skipped} 个`);
        console.log(`导入失败: ${this.stats.failed} 个`);

        if (this.stats.errors.length > 0) {
            console.log('\n失败详情:');
            this.stats.errors.forEach(({ skill, error }) => {
                console.log(`  - ${skill}: ${error}`);
            });
        }

        console.log('\n');
    }
}

// 命令行接口
async function main() {
    const args = process.argv.slice(2);
    const config = {};

    // 解析参数
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--source' && args[i + 1]) {
            config.localSkillPath = args[i + 1];
            i++;
        } else if (args[i] === '--target' && args[i + 1]) {
            config.targetSkillPath = args[i + 1];
            i++;
        } else if (args[i] === '--help' || args[i] === '-h') {
            showHelp();
            return;
        }
    }

    const importer = new SkillBatchImporter(config);
    await importer.import();
}

function showHelp() {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║       StarClaw 技能批量导入工具 v2.0                     ║
╚══════════════════════════════════════════════════════════╝

用法:
  node batch-import-skills.js [选项]

选项:
  --source <path>    本地技能库路径 (默认: C:\\D\\工作流n8n-coze-dify\\skill)
  --target <path>    目标技能目录 (默认: ../skills)
  --help, -h         显示帮助信息

示例:
  # 使用默认配置
  node batch-import-skills.js

  # 指定源路径
  node batch-import-skills.js --source D:\\my-skills

  # 指定源和目标路径
  node batch-import-skills.js --source D:\\my-skills --target E:\\starclaw\\skills
`);
}

// 运行
if (require.main === module) {
    main().catch(console.error);
}

module.exports = SkillBatchImporter;
