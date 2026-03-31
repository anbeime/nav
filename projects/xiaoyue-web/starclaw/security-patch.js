/**
 * StarClaw 安全补丁 v1.0
 * 
 * 修复问题：
 * 1. 命令执行白名单
 * 2. 文件操作沙箱
 * 3. 输入验证增强
 * 
 * 使用方法：
 * const { SecurityManager } = require('./security-patch');
 * const security = new SecurityManager();
 * 
 * // 验证命令
 * if (security.validateCommand('git status')) {
 *     // 执行命令
 * }
 * 
 * // 验证路径
 * if (security.validatePath('/path/to/file')) {
 *     // 执行文件操作
 * }
 */

const path = require('path');
const fs = require('fs');

class SecurityManager {
    constructor(config = {}) {
        // 沙箱目录配置
        this.sandboxDirs = config.sandboxDirs || [
            path.join(__dirname, 'workspace'),
            path.join(__dirname, 'output'),
            path.join(__dirname, 'temp'),
            path.join(__dirname, 'data'),
            path.join(__dirname, 'sessions')
        ];

        // 允许的命令白名单
        this.allowedCommands = {
            // Git 命令
            'git': {
                allowed: ['status', 'log', 'diff', 'branch', 'remote', 'fetch', 'pull', 'push', 'commit', 'add', 'checkout'],
                requiresAuth: {
                    'push': true,
                    'commit': true
                }
            },
            
            // Node.js 命令
            'node': {
                allowed: ['--version', '-v'],
                requiresAuth: {}
            },
            
            'npm': {
                allowed: ['run', 'test', 'lint', 'install', 'update', 'list', 'outdated'],
                requiresAuth: {
                    'install': true,
                    'update': true
                }
            },
            
            'npx': {
                allowed: [], // 需要显式授权
                requiresAuth: {}
            },
            
            // Python 命令
            'python': {
                allowed: ['--version', '-V'],
                requiresAuth: {}
            },
            
            'pip': {
                allowed: ['list', 'show', 'freeze'],
                requiresAuth: {
                    'install': true,
                    'uninstall': true
                }
            },
            
            // 系统查询命令
            'dir': { allowed: [], requiresAuth: {} },
            'ls': { allowed: [], requiresAuth: {} },
            'type': { allowed: [], requiresAuth: {} },
            'cat': { allowed: [], requiresAuth: {} },
            'echo': { allowed: [], requiresAuth: {} },
            'where': { allowed: [], requiresAuth: {} },
            'which': { allowed: [], requiresAuth: {} },
            
            // 编码转换
            'chcp': { allowed: [], requiresAuth: {} }
        };

        // 危险字符黑名单
        this.dangerousPatterns = [
            /[;&|`$]/,                    // 命令连接符
            /\$\([^)]*\)/,                // 命令替换 $()
            /`[^`]*`/,                    // 反引号命令替换
            /\|\s*(bash|sh|cmd|powershell)/i,  // 管道到shell
            />\s*\//,                     // 重定向到根目录
            /rm\s+-rf\s+\//,              // 删除根目录
            /del\s+\/[sS]/,               // Windows 删除
            /format\s+[a-zA-Z]:/i,        // 格式化磁盘
            /shutdown/,                   // 关机
            /reboot/,                     // 重启
            /init\s+\d/,                  // 切换运行级别
            /mkfs/,                       // 格式化文件系统
            /dd\s+if=/,                   // dd 命令
            /:()\s*{\s*:\|:&\s*}/,        // Fork 炸弹
        ];

        // 敏感文件黑名单
        this.protectedFiles = [
            /\/etc\/passwd/i,
            /\/etc\/shadow/i,
            /\/etc\/sudoers/i,
            /\/\.ssh\//i,
            /\/\.gnupg\//i,
            /\/\.env$/i,
            /\/config\.json$/i,
            /\/credentials/i,
            /\/secrets/i,
            /\.pem$/i,
            /\.key$/i,
            /\.p12$/i,
            /\.pfx$/i,
            /id_rsa/i,
            /id_ed25519/i,
            /authorized_keys/i,
            /known_hosts/i,
            /ntdll\.dll/i,
            /kernel32\.dll/i,
            /system32/i,
            /syswow64/i
        ];
    }

    /**
     * 验证命令是否安全
     * @param {string} command - 要执行的命令
     * @returns {{ valid: boolean, error?: string, requiresAuth?: boolean }}
     */
    validateCommand(command) {
        if (!command || typeof command !== 'string') {
            return { valid: false, error: '命令不能为空' };
        }

        // 去除前后空格
        command = command.trim();

        // 检查危险模式
        for (const pattern of this.dangerousPatterns) {
            if (pattern.test(command)) {
                return { valid: false, error: `命令包含危险字符或模式: ${pattern.source}` };
            }
        }

        // 解析命令
        const parts = command.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        // 检查命令是否在白名单中
        if (!this.allowedCommands[cmd]) {
            return { valid: false, error: `命令不在白名单中: ${cmd}` };
        }

        const cmdConfig = this.allowedCommands[cmd];
        
        // 检查参数是否允许
        if (cmdConfig.allowed.length > 0 && args.length > 0) {
            const firstArg = args[0].toLowerCase();
            if (!cmdConfig.allowed.includes(firstArg)) {
                return { valid: false, error: `命令参数不被允许: ${cmd} ${firstArg}` };
            }
        }

        // 检查是否需要授权
        const requiresAuth = cmdConfig.requiresAuth[args[0]?.toLowerCase()] || false;

        return { valid: true, requiresAuth };
    }

    /**
     * 验证路径是否在沙箱内
     * @param {string} filePath - 文件路径
     * @param {string} operation - 操作类型 (read/write/delete)
     * @returns {{ valid: boolean, error?: string }}
     */
    validatePath(filePath, operation = 'read') {
        if (!filePath || typeof filePath !== 'string') {
            return { valid: false, error: '路径不能为空' };
        }

        // 解析为绝对路径
        let resolvedPath;
        try {
            resolvedPath = path.resolve(filePath);
        } catch (err) {
            return { valid: false, error: `无效的路径格式: ${filePath}` };
        }

        // 规范化路径（处理 .. 和 .）
        resolvedPath = path.normalize(resolvedPath);

        // 检查是否在保护文件列表中
        for (const pattern of this.protectedFiles) {
            if (pattern.test(resolvedPath)) {
                return { valid: false, error: `路径指向受保护的系统文件` };
            }
        }

        // 检查是否在沙箱目录内
        const isInSandbox = this.sandboxDirs.some(dir => {
            const normalizedDir = path.normalize(dir);
            return resolvedPath.startsWith(normalizedDir);
        });

        if (!isInSandbox) {
            return { 
                valid: false, 
                error: `路径不在允许的操作范围内: ${resolvedPath}` 
            };
        }

        // 对于写入和删除操作，额外检查
        if (operation === 'write' || operation === 'delete') {
            // 检查文件扩展名
            const ext = path.extname(resolvedPath).toLowerCase();
            const dangerousExts = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js'];
            if (dangerousExts.includes(ext)) {
                return { 
                    valid: false, 
                    error: `不允许创建或删除可执行文件: ${ext}` 
                };
            }
        }

        return { valid: true, resolvedPath };
    }

    /**
     * 验证 HTTP 请求参数
     * @param {string} url - 请求 URL
     * @param {object} options - 请求选项
     * @returns {{ valid: boolean, error?: string }}
     */
    validateHttpRequest(url, options = {}) {
        try {
            const parsedUrl = new URL(url);
            
            // 检查协议
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return { valid: false, error: `不支持的协议: ${parsedUrl.protocol}` };
            }

            // 检查是否访问内网地址（SSRF 防护）
            const hostname = parsedUrl.hostname;
            const privateIpPatterns = [
                /^localhost$/i,
                /^127\./,
                /^10\./,
                /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
                /^192\.168\./,
                /^0\.0\.0\.0$/,
                /^::1$/,
                /^fc00:/i,
                /^fe80:/i
            ];

            for (const pattern of privateIpPatterns) {
                if (pattern.test(hostname)) {
                    return { valid: false, error: '不允许访问内网地址' };
                }
            }

            // 检查敏感端口
            const sensitivePorts = [22, 23, 25, 3306, 5432, 6379, 27017, 9200, 5672, 15672];
            const port = parsedUrl.port ? parseInt(parsedUrl.port) : (parsedUrl.protocol === 'https:' ? 443 : 80);
            
            if (sensitivePorts.includes(port)) {
                return { valid: false, error: `不允许访问敏感端口: ${port}` };
            }

            return { valid: true };
        } catch (err) {
            return { valid: false, error: `无效的 URL: ${err.message}` };
        }
    }

    /**
     * 清理用户输入
     * @param {string} input - 用户输入
     * @param {number} maxLength - 最大长度
     * @returns {{ clean: string, wasSanitized: boolean }}
     */
    sanitizeInput(input, maxLength = 10000) {
        if (typeof input !== 'string') {
            return { clean: '', wasSanitized: true };
        }

        let clean = input;
        let wasSanitized = false;

        // 截断超长输入
        if (clean.length > maxLength) {
            clean = clean.substring(0, maxLength);
            wasSanitized = true;
        }

        // 移除危险字符
        const dangerousChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;
        if (dangerousChars.test(clean)) {
            clean = clean.replace(dangerousChars, '');
            wasSanitized = true;
        }

        // 移除 Unicode 控制字符
        const controlChars = /[\u200B-\u200D\uFEFF\u202A-\u202E]/g;
        if (controlChars.test(clean)) {
            clean = clean.replace(controlChars, '');
            wasSanitized = true;
        }

        return { clean, wasSanitized };
    }

    /**
     * 获取安全报告
     */
    getSecurityReport() {
        return {
            sandboxDirs: this.sandboxDirs,
            allowedCommands: Object.keys(this.allowedCommands),
            rules: {
                commandWhitelist: true,
                pathSandbox: true,
                inputSanitization: true,
                ssrfProtection: true,
                dangerousPatternDetection: true
            }
        };
    }
}

// 创建安全中间件
function createSecurityMiddleware(securityManager) {
    return (req, res, next) => {
        // 为请求添加安全验证方法
        req.security = {
            validateCommand: securityManager.validateCommand.bind(securityManager),
            validatePath: securityManager.validatePath.bind(securityManager),
            validateHttpRequest: securityManager.validateHttpRequest.bind(securityManager),
            sanitizeInput: securityManager.sanitizeInput.bind(securityManager)
        };
        next();
    };
}

// 导出
module.exports = {
    SecurityManager,
    createSecurityMiddleware
};
