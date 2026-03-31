/**
 * SkillManager - 技能管理器
 * 支持技能的安装、卸载、启用、禁用、更新等操作
 * 兼容 OpenClaw 技能格式
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class SkillManager {
    constructor(config = {}) {
        this.skillsPath = config.skillsPath || path.join(__dirname, '../skills');
        this.registryPath = config.registryPath || path.join(this.skillsPath, 'skills.json');
        this.tempPath = config.tempPath || path.join(__dirname, '../temp/skills');
        this.registry = null;
        this.initialized = false;
    }

    /**
     * 初始化技能管理器
     */
    async initialize() {
        try {
            // 确保目录存在
            await fs.mkdir(this.skillsPath, { recursive: true });
            await fs.mkdir(this.tempPath, { recursive: true });

            // 加载注册表
            await this.loadRegistry();

            this.initialized = true;
            console.log('[SkillManager] 初始化完成');
            return true;
        } catch (error) {
            console.error('[SkillManager] 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 加载技能注册表
     */
    async loadRegistry() {
        try {
            const data = await fs.readFile(this.registryPath, 'utf-8');
            this.registry = JSON.parse(data);
        } catch (error) {
            // 如果文件不存在，创建默认注册表
            this.registry = {
                version: '2.0.0',
                skills: {},
                installed: [],
                marketUrl: 'https://api.github.com/repos/anbeime/openclaw-skill-market/contents/skills'
            };
            await this.saveRegistry();
        }
        return this.registry;
    }

    /**
     * 保存技能注册表
     */
    async saveRegistry() {
        await fs.writeFile(
            this.registryPath,
            JSON.stringify(this.registry, null, 2),
            'utf-8'
        );
    }

    /**
     * 安装技能
     * @param {string} source - 技能来源（URL、本地路径、npm包名）
     * @param {Object} options - 安装选项
     */
    async installSkill(source, options = {}) {
        if (!this.initialized) await this.initialize();

        console.log(`[SkillManager] 安装技能: ${source}`);

        let skillPath;
        let skillId = options.id || path.basename(source, '.git');

        try {
            // 判断来源类型
            if (source.startsWith('http://') || source.startsWith('https://')) {
                // Git 仓库或下载链接
                if (source.includes('github.com') || source.endsWith('.git')) {
                    skillPath = await this.installFromGit(source, skillId);
                } else {
                    skillPath = await this.installFromUrl(source, skillId);
                }
            } else if (source.startsWith('npm://')) {
                // npm 包
                skillPath = await this.installFromNpm(source.replace('npm://', ''), skillId);
            } else if (await this.isLocalPath(source)) {
                // 本地路径
                skillPath = await this.installFromLocal(source, skillId);
            } else {
                throw new Error(`不支持的技能来源: ${source}`);
            }

            // 验证技能
            const skillInfo = await this.validateSkill(skillPath);

            // 注册技能
            skillId = skillInfo.id || skillId;
            this.registry.skills[skillId] = {
                ...skillInfo,
                installed: true,
                enabled: options.autoEnable !== false,
                installedAt: new Date().toISOString(),
                source: source,
                path: skillPath
            };

            if (!this.registry.installed.includes(skillId)) {
                this.registry.installed.push(skillId);
            }

            await this.saveRegistry();

            console.log(`[SkillManager] 技能安装成功: ${skillId}`);
            return { success: true, skillId, info: skillInfo };

        } catch (error) {
            console.error(`[SkillManager] 安装失败:`, error);
            throw error;
        }
    }

    /**
     * 从 Git 仓库安装
     */
    async installFromGit(gitUrl, skillId) {
        const targetPath = path.join(this.skillsPath, skillId);

        // 如果目录已存在，先删除
        try {
            await fs.access(targetPath);
            await fs.rm(targetPath, { recursive: true });
        } catch (e) {
            // 目录不存在，继续
        }

        // 克隆仓库
        try {
            console.log(`[SkillManager] 克隆 Git 仓库: ${gitUrl}`);
            execSync(`git clone --depth 1 "${gitUrl}" "${targetPath}"`, {
                stdio: 'pipe',
                windowsHide: true
            });

            // 删除 .git 目录
            const gitDir = path.join(targetPath, '.git');
            try {
                await fs.rm(gitDir, { recursive: true });
            } catch (e) {}

            return targetPath;
        } catch (error) {
            throw new Error(`Git 克隆失败: ${error.message}`);
        }
    }

    /**
     * 从 URL 下载安装
     */
    async installFromUrl(url, skillId) {
        const targetPath = path.join(this.skillsPath, skillId);
        const tempFile = path.join(this.tempPath, `${skillId}.zip`);

        try {
            // 下载文件
            console.log(`[SkillManager] 下载技能: ${url}`);
            await this.downloadFile(url, tempFile);

            // 解压
            const AdmZip = require('adm-zip');
            const zip = new AdmZip(tempFile);
            await fs.mkdir(targetPath, { recursive: true });
            zip.extractAllTo(targetPath, true);

            // 清理临时文件
            await fs.unlink(tempFile);

            return targetPath;
        } catch (error) {
            throw new Error(`下载安装失败: ${error.message}`);
        }
    }

    /**
     * 从 npm 安装
     */
    async installFromNpm(packageName, skillId) {
        const targetPath = path.join(this.skillsPath, skillId);

        try {
            console.log(`[SkillManager] 从 npm 安装: ${packageName}`);

            // 在临时目录安装
            const tempDir = path.join(this.tempPath, `npm-${skillId}`);
            await fs.mkdir(tempDir, { recursive: true });

            execSync(`npm install "${packageName}" --prefix "${tempDir}"`, {
                stdio: 'pipe',
                windowsHide: true
            });

            // 移动到技能目录
            const installedPath = path.join(tempDir, 'node_modules', packageName);
            await fs.rename(installedPath, targetPath);

            // 清理临时目录
            await fs.rm(tempDir, { recursive: true });

            return targetPath;
        } catch (error) {
            throw new Error(`npm 安装失败: ${error.message}`);
        }
    }

    /**
     * 从本地路径安装
     */
    async installFromLocal(localPath, skillId) {
        const targetPath = path.join(this.skillsPath, skillId);

        try {
            // 复制目录
            await this.copyDirectory(localPath, targetPath);
            return targetPath;
        } catch (error) {
            throw new Error(`本地安装失败: ${error.message}`);
        }
    }

    /**
     * 验证技能
     */
    async validateSkill(skillPath) {
        const skillFile = path.join(skillPath, 'SKILL.md');

        try {
            await fs.access(skillFile);
        } catch (e) {
            throw new Error('技能目录中未找到 SKILL.md 文件');
        }

        // 读取并解析 SKILL.md
        const content = await fs.readFile(skillFile, 'utf-8');
        const frontmatter = this.parseFrontmatter(content);

        return {
            id: frontmatter.name || path.basename(skillPath),
            name: frontmatter.title || frontmatter.name || path.basename(skillPath),
            description: frontmatter.description || '',
            version: frontmatter.version || '1.0.0',
            author: frontmatter.author || 'unknown',
            agents: frontmatter.agents || [],
            allowedTools: frontmatter['allowed-tools'] || [],
            tags: frontmatter.tags || []
        };
    }

    /**
     * 解析 Frontmatter
     */
    parseFrontmatter(content) {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return {};

        const frontmatter = {};
        const lines = match[1].split('\n');

        for (const line of lines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();

                // 处理数组
                if (value.startsWith('[') && value.endsWith(']')) {
                    value = value.slice(1, -1).split(',').map(s => s.trim());
                }

                frontmatter[key] = value;
            }
        }

        return frontmatter;
    }

    /**
     * 卸载技能
     */
    async uninstallSkill(skillId) {
        if (!this.initialized) await this.initialize();

        console.log(`[SkillManager] 卸载技能: ${skillId}`);

        if (!this.registry.skills[skillId]) {
            throw new Error(`技能不存在: ${skillId}`);
        }

        const skillPath = this.registry.skills[skillId].path || 
                          path.join(this.skillsPath, skillId);

        try {
            // 删除技能目录
            await fs.rm(skillPath, { recursive: true });

            // 从注册表移除
            delete this.registry.skills[skillId];
            this.registry.installed = this.registry.installed.filter(id => id !== skillId);

            await this.saveRegistry();

            console.log(`[SkillManager] 技能已卸载: ${skillId}`);
            return { success: true, skillId };

        } catch (error) {
            throw new Error(`卸载失败: ${error.message}`);
        }
    }

    /**
     * 启用技能
     */
    async enableSkill(skillId) {
        if (!this.initialized) await this.initialize();

        if (!this.registry.skills[skillId]) {
            throw new Error(`技能不存在: ${skillId}`);
        }

        this.registry.skills[skillId].enabled = true;
        await this.saveRegistry();

        console.log(`[SkillManager] 技能已启用: ${skillId}`);
        return { success: true, skillId };
    }

    /**
     * 禁用技能
     */
    async disableSkill(skillId) {
        if (!this.initialized) await this.initialize();

        if (!this.registry.skills[skillId]) {
            throw new Error(`技能不存在: ${skillId}`);
        }

        this.registry.skills[skillId].enabled = false;
        await this.saveRegistry();

        console.log(`[SkillManager] 技能已禁用: ${skillId}`);
        return { success: true, skillId };
    }

    /**
     * 获取已安装的技能列表
     */
    async listInstalledSkills() {
        if (!this.initialized) await this.initialize();

        const skills = [];
        for (const skillId of this.registry.installed) {
            const skill = this.registry.skills[skillId];
            if (skill) {
                skills.push({
                    id: skillId,
                    ...skill
                });
            }
        }
        return skills;
    }

    /**
     * 获取技能详情
     */
    async getSkillDetail(skillId) {
        if (!this.initialized) await this.initialize();

        const skill = this.registry.skills[skillId];
        if (!skill) {
            throw new Error(`技能不存在: ${skillId}`);
        }

        // 读取 SKILL.md 内容
        const skillPath = skill.path || path.join(this.skillsPath, skillId);
        const skillFile = path.join(skillPath, 'SKILL.md');

        try {
            const content = await fs.readFile(skillFile, 'utf-8');
            return {
                id: skillId,
                ...skill,
                content
            };
        } catch (error) {
            return { id: skillId, ...skill };
        }
    }

    /**
     * 执行技能
     */
    async executeSkill(skillId, input, context = {}) {
        if (!this.initialized) await this.initialize();

        const skill = this.registry.skills[skillId];
        if (!skill) {
            throw new Error(`技能不存在: ${skillId}`);
        }

        if (!skill.enabled) {
            throw new Error(`技能未启用: ${skillId}`);
        }

        // 读取技能定义
        const skillPath = skill.path || path.join(this.skillsPath, skillId);
        const skillFile = path.join(skillPath, 'SKILL.md');
        const content = await fs.readFile(skillFile, 'utf-8');

        return {
            skill: skillId,
            definition: content,
            input,
            context,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 工具方法：下载文件
     */
    downloadFile(url, targetPath) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;
            const file = require('fs').createWriteStream(targetPath);

            protocol.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // 处理重定向
                    this.downloadFile(response.headers.location, targetPath)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(targetPath);
                reject(err);
            });
        });
    }

    /**
     * 工具方法：复制目录
     */
    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }

    /**
     * 工具方法：检查是否为本地路径
     */
    async isLocalPath(source) {
        try {
            await fs.access(source);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = SkillManager;
