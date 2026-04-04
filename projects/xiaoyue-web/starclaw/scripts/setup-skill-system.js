/**
 * StarClaw 技能系统完整设置脚本
 * 一键配置和启动技能管理系统
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class SkillSystemSetup {
    constructor() {
        this.baseDir = path.join(__dirname, '..');
        this.projectRoot = path.join(this.baseDir, '../../..');
        this.config = {
            localSkillPath: 'C:\\D\\工作流n8n-coze-dify\\skill',
            port: 3000
        };
    }

    async run() {
        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║       StarClaw 技能系统设置向导 v2.0                     ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

        try {
            // 1. 检查环境
            await this.checkEnvironment();

            // 2. 创建必要目录
            await this.createDirectories();

            // 3. 安装依赖
            await this.installDependencies();

            // 4. 配置技能市场
            await this.configureSkillMarket();

            // 5. 批量导入本地技能
            await this.importLocalSkills();

            // 6. 生成启动脚本
            await this.generateStartScript();

            // 7. 显示完成信息
            this.showCompletionMessage();

        } catch (error) {
            console.error('\n❌ 设置失败:', error.message);
            console.error('\n请检查错误信息并重新运行。\n');
            process.exit(1);
        }
    }

    async checkEnvironment() {
        console.log('🔍 检查环境...\n');

        // 检查 Node.js
        try {
            const nodeVersion = process.version;
            console.log(`  ✓ Node.js: ${nodeVersion}`);
            
            const major = parseInt(nodeVersion.slice(1).split('.')[0]);
            if (major < 16) {
                throw new Error('需要 Node.js 16.0.0 或更高版本');
            }
        } catch (error) {
            throw new Error('未检测到 Node.js,请先安装 Node.js');
        }

        // 检查 npm
        try {
            const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
            console.log(`  ✓ npm: ${npmVersion}`);
        } catch (error) {
            throw new Error('未检测到 npm');
        }

        // 检查本地技能库
        try {
            await fs.access(this.config.localSkillPath);
            console.log(`  ✓ 本地技能库: ${this.config.localSkillPath}`);
        } catch {
            console.log(`  ⚠ 本地技能库不存在: ${this.config.localSkillPath}`);
            console.log('    将跳过本地技能导入');
        }

        console.log('\n');
    }

    async createDirectories() {
        console.log('📁 创建必要目录...\n');

        const dirs = [
            path.join(this.baseDir, 'skills'),
            path.join(this.baseDir, 'temp'),
            path.join(this.baseDir, 'temp/skills'),
            path.join(this.projectRoot, 'public')
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`  ✓ ${path.relative(this.projectRoot, dir)}`);
            } catch (error) {
                console.log(`  ⚠ 无法创建: ${dir}`);
            }
        }

        console.log('\n');
    }

    async installDependencies() {
        console.log('📦 检查依赖...\n');

        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        
        try {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
            
            // 确保必要依赖存在
            const requiredDeps = ['express', 'adm-zip'];
            const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies?.[dep]);

            if (missingDeps.length > 0) {
                console.log(`  安装缺失依赖: ${missingDeps.join(', ')}`);
                execSync(`npm install ${missingDeps.join(' ')}`, {
                    cwd: this.projectRoot,
                    stdio: 'inherit'
                });
            }

            console.log('  ✓ 所有依赖已就绪\n');
        } catch (error) {
            console.log('  ⚠ 无法检查依赖,请手动安装\n');
        }
    }

    async configureSkillMarket() {
        console.log('⚙️  配置技能市场...\n');

        // 创建技能注册表
        const registry = {
            version: '2.0.0',
            skills: {},
            installed: [],
            marketUrl: 'https://api.github.com/repos/anbeime/openclaw-skill-market/contents/skills',
            localSkillPath: this.config.localSkillPath
        };

        const registryPath = path.join(this.baseDir, 'skills/skills.json');
        await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
        console.log('  ✓ 技能注册表已创建\n');
    }

    async importLocalSkills() {
        console.log('📥 导入本地技能...\n');

        try {
            const SkillBatchImporter = require('./batch-import-skills');
            const importer = new SkillBatchImporter({
                localSkillPath: this.config.localSkillPath,
                targetSkillPath: path.join(this.baseDir, 'skills')
            });

            await importer.import();
        } catch (error) {
            console.log('  ⚠ 导入失败:', error.message);
            console.log('  您可以稍后手动运行: node batch-import-skills.js\n');
        }
    }

    async generateStartScript() {
        console.log('📝 生成启动脚本...\n');

        const startScript = `@echo off
echo 启动 StarClaw 技能系统...
cd "${this.projectRoot}"
node server-with-openclaw.js
pause
`;

        const startScriptPath = path.join(this.projectRoot, 'start-skill-system.bat');
        await fs.writeFile(startScriptPath, startScript, 'utf-8');
        console.log('  ✓ 启动脚本已生成\n');
    }

    showCompletionMessage() {
        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║                   设置完成!                              ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

        console.log('📌 下一步操作:\n');
        console.log('  1. 启动服务器:');
        console.log('     cd ' + this.projectRoot);
        console.log('     node server-with-openclaw.js\n');
        console.log('  或双击运行: start-skill-system.bat\n');

        console.log('  2. 访问技能管理界面:');
        console.log('     http://localhost:' + this.config.port + '/skill-store.html\n');

        console.log('  3. API 端点:');
        console.log('     GET  /api/skills              - 获取已安装技能');
        console.log('     GET  /api/skills/market       - 获取技能市场');
        console.log('     POST /api/skills/install      - 安装技能');
        console.log('     POST /api/skills/:id/uninstall - 卸载技能\n');

        console.log('  4. 命令行工具:');
        console.log('     node starclaw/scripts/install-skill.js --list');
        console.log('     node starclaw/scripts/install-skill.js --market');
        console.log('     node starclaw/scripts/batch-import-skills.js\n');

        console.log('📚 文档:');
        console.log('   - 技能系统指南: starclaw/knowledge/SKILL_SYSTEM_GUIDE.md');
        console.log('   - 技能开发文档: starclaw/knowledge/DEVELOPER_GUIDE.md\n');
    }
}

// 运行设置
if (require.main === module) {
    const setup = new SkillSystemSetup();
    setup.run().catch(console.error);
}

module.exports = SkillSystemSetup;
