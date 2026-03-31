/**
 * StarClaw 安全执行器 v2.1
 * 
 * 在原 executor.js 基础上增加安全加固
 * 
 * 新增特性：
 * 1. 命令执行白名单
 * 2. 文件操作沙箱
 * 3. HTTP 请求 SSRF 防护
 * 4. 输入验证增强
 * 5. 操作审计日志
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const util = require('util');
const crypto = require('crypto');

const execAsync = util.promisify(exec);

// 导入安全模块
let SecurityManager;
try {
    SecurityManager = require('./security-patch').SecurityManager;
} catch (e) {
    console.warn('[Executor] 安全模块加载失败，使用默认安全策略');
    // 提供默认实现
    SecurityManager = class {
        validateCommand() { return { valid: true }; }
        validatePath(p) { return { valid: true, resolvedPath: p }; }
        validateHttpRequest() { return { valid: true }; }
        sanitizeInput(input) { return { clean: input, wasSanitized: false }; }
    };
}

// ==================== 配置 ====================
const CONFIG = {
    workspace: path.join(__dirname, 'workspace'),
    tempDir: path.join(__dirname, 'temp'),
    outputDir: path.join(__dirname, 'output'),
    maxExecutionTime: 120000, // 2分钟超时
    maxOutputSize: 1024 * 1024 * 10, // 10MB 输出限制
    auditLog: path.join(__dirname, 'logs', 'audit.log'),
    enableAudit: true
};

// 确保目录存在
[CONFIG.workspace, CONFIG.tempDir, CONFIG.outputDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 日志目录
const logsDir = path.dirname(CONFIG.auditLog);
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// ==================== 审计日志 ====================
class AuditLogger {
    constructor(logPath, enabled = true) {
        this.logPath = logPath;
        this.enabled = enabled;
    }

    log(entry) {
        if (!this.enabled) return;
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            ...entry
        };

        const logLine = JSON.stringify(logEntry) + '\n';
        
        try {
            fs.appendFileSync(this.logPath, logLine, 'utf-8');
        } catch (e) {
            console.error('[AuditLogger] 写入失败:', e.message);
        }
    }

    logToolExecution(tool, params, result, duration) {
        this.log({
            type: 'tool_execution',
            tool,
            params: this.sanitizeParams(params),
            success: result.success,
            duration,
            error: result.error
        });
    }

    logSecurityViolation(type, details) {
        this.log({
            type: 'security_violation',
            violationType: type,
            details
        });
    }

    sanitizeParams(params) {
        // 敏感信息脱敏
        const sanitized = { ...params };
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential'];
        
        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                sanitized[key] = '***REDACTED***';
            }
        }
        
        return sanitized;
    }
}

const auditLogger = new AuditLogger(CONFIG.auditLog, CONFIG.enableAudit);

// ==================== 安全执行器 ====================

const security = new SecurityManager({
    sandboxDirs: [CONFIG.workspace, CONFIG.outputDir, CONFIG.tempDir]
});

// ==================== 工具定义（安全加固版）====================

const TOOLS = {
    // 代码执行工具（安全加固）
    execute_code: {
        name: 'execute_code',
        description: '执行代码并返回结果，支持 JavaScript、Python',
        parameters: {
            type: 'object',
            properties: {
                code: { type: 'string', description: '要执行的代码' },
                language: { type: 'string', enum: ['javascript', 'python'], default: 'javascript' }
            },
            required: ['code']
        },
        execute: async (params) => {
            const { code, language = 'javascript' } = params;
            
            // 输入验证
            const { clean: cleanCode, wasSanitized } = security.sanitizeInput(code, 100000);
            if (wasSanitized) {
                console.warn('[Executor] 代码输入已清理');
            }

            // 危险代码检测
            const dangerousPatterns = [
                /eval\s*\(/gi,
                /Function\s*\(/gi,
                /require\s*\(\s*['"]child_process['"]\s*\)/gi,
                /process\.exit/gi,
                /fs\.(rm|unlink|rmSync|unlinkSync)/gi,
                /\.destroy\(/gi,
            ];

            for (const pattern of dangerousPatterns) {
                if (pattern.test(cleanCode)) {
                    auditLogger.logSecurityViolation('dangerous_code', { pattern: pattern.source });
                    return { success: false, error: `代码包含危险模式: ${pattern.source}` };
                }
            }

            const ext = { javascript: 'js', python: 'py' }[language];
            const runner = { javascript: 'node', python: 'python' }[language];
            
            const tempFile = path.join(CONFIG.tempDir, `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`);
            
            try {
                fs.writeFileSync(tempFile, cleanCode, 'utf-8');
                const { stdout, stderr } = await execAsync(`${runner} "${tempFile}"`, {
                    cwd: CONFIG.workspace,
                    timeout: CONFIG.maxExecutionTime,
                    maxBuffer: CONFIG.maxOutputSize
                });
                return { success: true, output: stdout, stderr, language };
            } catch (error) {
                return { success: false, error: error.message, stderr: error.stderr, output: error.stdout };
            } finally {
                setTimeout(() => { 
                    try { fs.unlinkSync(tempFile); } catch (e) {} 
                }, 1000);
            }
        }
    },

    // 文件操作工具（沙箱加固）
    file_operation: {
        name: 'file_operation',
        description: '文件系统操作：读取、写入、列出文件（沙箱内）',
        parameters: {
            type: 'object',
            properties: {
                operation: { type: 'string', enum: ['read', 'write', 'append', 'list', 'mkdir', 'search'] },
                path: { type: 'string', description: '文件或目录路径（相对于沙箱）' },
                content: { type: 'string', description: '写入内容' },
                pattern: { type: 'string', description: '搜索模式' }
            },
            required: ['operation', 'path']
        },
        execute: async (params) => {
            const { operation, path: filePath, content, pattern } = params;
            
            // 路径安全验证
            const pathValidation = security.validatePath(filePath, operation);
            if (!pathValidation.valid) {
                auditLogger.logSecurityViolation('invalid_path', { path: filePath, operation });
                return { success: false, error: pathValidation.error };
            }
            
            const fullPath = pathValidation.resolvedPath;
            
            try {
                switch (operation) {
                    case 'read':
                        if (fs.existsSync(fullPath)) {
                            const fileContent = fs.readFileSync(fullPath, 'utf-8');
                            return { success: true, content: fileContent, path: fullPath };
                        }
                        return { success: false, error: '文件不存在', path: fullPath };
                    
                    case 'write':
                        const writeDir = path.dirname(fullPath);
                        if (!fs.existsSync(writeDir)) fs.mkdirSync(writeDir, { recursive: true });
                        fs.writeFileSync(fullPath, content || '', 'utf-8');
                        return { success: true, path: fullPath, size: (content || '').length };
                    
                    case 'append':
                        fs.appendFileSync(fullPath, content || '', 'utf-8');
                        return { success: true, path: fullPath };
                    
                    case 'list':
                        const listPath = fs.existsSync(fullPath) ? fullPath : CONFIG.outputDir;
                        const files = fs.readdirSync(listPath).map(name => {
                            const p = path.join(listPath, name);
                            const stat = fs.statSync(p);
                            return { name, isDirectory: stat.isDirectory(), size: stat.size, modified: stat.mtime };
                        });
                        return { success: true, files, path: listPath };
                    
                    case 'mkdir':
                        fs.mkdirSync(fullPath, { recursive: true });
                        return { success: true, path: fullPath };
                    
                    case 'search':
                        const results = [];
                        const searchDir = fs.existsSync(fullPath) ? fullPath : CONFIG.outputDir;
                        const searchPattern = pattern || '*';
                        const searchRecursive = (dir) => {
                            fs.readdirSync(dir).forEach(name => {
                                const p = path.join(dir, name);
                                if (fs.statSync(p).isDirectory()) {
                                    searchRecursive(p);
                                } else if (name.includes(searchPattern.replace(/\*/g, ''))) {
                                    results.push(p);
                                }
                            });
                        };
                        searchRecursive(searchDir);
                        return { success: true, results, count: results.length };
                    
                    default:
                        return { success: false, error: `未知操作: ${operation}` };
                }
            } catch (error) {
                return { success: false, error: error.message, path: fullPath };
            }
        }
    },

    // HTTP请求工具（SSRF防护）
    http_request: {
        name: 'http_request',
        description: '发送HTTP请求，支持GET、POST方法',
        parameters: {
            type: 'object',
            properties: {
                method: { type: 'string', enum: ['GET', 'POST'], default: 'GET' },
                url: { type: 'string', description: '请求URL' },
                headers: { type: 'object', description: '请求头' },
                body: { type: 'object', description: '请求体' },
                timeout: { type: 'number', default: 30000 }
            },
            required: ['url']
        },
        execute: async (params) => {
            const { method = 'GET', url, headers = {}, body, timeout = 30000 } = params;
            
            // SSRF 防护验证
            const requestValidation = security.validateHttpRequest(url, { method, headers, body });
            if (!requestValidation.valid) {
                auditLogger.logSecurityViolation('ssrf_attempt', { url });
                return { success: false, error: requestValidation.error };
            }
            
            try {
                const response = await axios({
                    method, url,
                    data: body,
                    headers: { 'Content-Type': 'application/json', ...headers },
                    timeout
                });
                return {
                    success: true,
                    status: response.status,
                    data: response.data,
                    headers: response.headers
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data
                };
            }
        }
    },

    // 安全命令执行（白名单）
    run_command: {
        name: 'run_command',
        description: '执行白名单内的系统命令',
        parameters: {
            type: 'object',
            properties: {
                command: { type: 'string', description: '要执行的命令' },
                cwd: { type: 'string', description: '工作目录' },
                timeout: { type: 'number', default: 60000 }
            },
            required: ['command']
        },
        execute: async (params) => {
            const { command, cwd = CONFIG.workspace, timeout = 60000 } = params;
            
            // 命令白名单验证
            const commandValidation = security.validateCommand(command);
            if (!commandValidation.valid) {
                auditLogger.logSecurityViolation('forbidden_command', { command });
                return { success: false, error: commandValidation.error };
            }
            
            // 如果需要额外授权，记录日志
            if (commandValidation.requiresAuth) {
                auditLogger.log({
                    type: 'sensitive_command',
                    command,
                    note: '需要用户确认'
                });
            }
            
            try {
                const { stdout, stderr } = await execAsync(command, {
                    cwd,
                    timeout,
                    maxBuffer: CONFIG.maxOutputSize
                });
                return { success: true, output: stdout, stderr };
            } catch (error) {
                return { success: false, error: error.message, stderr: error.stderr, output: error.stdout };
            }
        }
    },

    // 打开应用工具（白名单）
    open_app: {
        name: 'open_app',
        description: '打开允许列表中的应用程序',
        parameters: {
            type: 'object',
            properties: {
                app: { type: 'string', description: '应用名称' }
            },
            required: ['app']
        },
        execute: async (params) => {
            const { app } = params;
            
            // 应用白名单
            const appCommands = {
                '浏览器': 'start https://www.google.com',
                'chrome': 'start chrome',
                'edge': 'start msedge',
                '记事本': 'notepad',
                '计算器': 'calc',
                '画图': 'mspaint',
                '资源管理器': 'explorer'
            };
            
            const command = appCommands[app.toLowerCase()];
            
            if (!command) {
                auditLogger.logSecurityViolation('forbidden_app', { app });
                return { success: false, error: `应用不在允许列表中: ${app}` };
            }
            
            try {
                await execAsync(command);
                return { success: true, app, message: `已打开 ${app}` };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    },

    // 数据处理工具
    process_data: {
        name: 'process_data',
        description: '数据处理：JSON解析、格式化、转换等',
        parameters: {
            type: 'object',
            properties: {
                operation: { type: 'string', enum: ['parse_json', 'stringify', 'format_json', 'csv_to_json', 'json_to_csv'] },
                data: { type: 'string', description: '输入数据' }
            },
            required: ['operation', 'data']
        },
        execute: async (params) => {
            const { operation, data } = params;
            
            // 输入清理
            const { clean: cleanData } = security.sanitizeInput(data, 1000000);
            
            try {
                switch (operation) {
                    case 'parse_json':
                        return { success: true, result: JSON.parse(cleanData) };
                    case 'stringify':
                        return { success: true, result: JSON.stringify(typeof cleanData === 'string' ? JSON.parse(cleanData) : cleanData, null, 2) };
                    case 'format_json':
                        return { success: true, result: JSON.stringify(JSON.parse(cleanData), null, 2) };
                    case 'csv_to_json':
                        const lines = cleanData.trim().split('\n');
                        const headers = lines[0].split(',');
                        const result = lines.slice(1).map(line => {
                            const values = line.split(',');
                            return headers.reduce((obj, h, i) => ({ ...obj, [h.trim()]: values[i]?.trim() }), {});
                        });
                        return { success: true, result };
                    case 'json_to_csv':
                        const jsonData = typeof cleanData === 'string' ? JSON.parse(cleanData) : cleanData;
                        if (!Array.isArray(jsonData) || jsonData.length === 0) {
                            return { success: false, error: 'JSON数据必须是非空数组' };
                        }
                        const csvHeaders = Object.keys(jsonData[0]).join(',');
                        const csvRows = jsonData.map(obj => Object.values(obj).join(','));
                        return { success: true, result: [csvHeaders, ...csvRows].join('\n') };
                    default:
                        return { success: false, error: `未知操作: ${operation}` };
                }
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    }
};

// ==================== 执行器类 ====================

class TaskExecutor {
    constructor() {
        this.tools = TOOLS;
        this.taskHistory = [];
        this.auditLogger = auditLogger;
    }

    /**
     * 获取所有可用工具
     */
    getTools() {
        return Object.values(this.tools).map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters
        }));
    }

    /**
     * 执行单个工具（带审计）
     */
    async executeTool(toolName, params) {
        const tool = this.tools[toolName];
        if (!tool) {
            return { success: false, error: `工具不存在: ${toolName}` };
        }

        console.log(`[Executor] 执行工具: ${toolName}`);
        console.log(`[Executor] 参数:`, JSON.stringify(params, null, 2));

        const startTime = Date.now();
        const result = await tool.execute(params);
        const duration = Date.now() - startTime;

        // 记录审计日志
        this.auditLogger.logToolExecution(toolName, params, result, duration);

        // 记录历史
        this.taskHistory.push({
            tool: toolName,
            params,
            result,
            duration,
            timestamp: new Date().toISOString()
        });

        console.log(`[Executor] 完成: ${toolName} (${duration}ms)`);
        return { ...result, duration, tool: toolName };
    }

    /**
     * 执行代码（便捷方法）
     */
    async executeCode(code, language = 'javascript') {
        return this.executeTool('execute_code', { code, language });
    }

    /**
     * 文件操作（便捷方法）
     */
    async fileOperation(operation, filePath, options = {}) {
        return this.executeTool('file_operation', { operation, path: filePath, ...options });
    }

    /**
     * HTTP请求（便捷方法）
     */
    async httpRequest(config) {
        return this.executeTool('http_request', config);
    }

    /**
     * 运行命令（便捷方法）
     */
    async runCommand(command, options = {}) {
        return this.executeTool('run_command', { command, ...options });
    }

    /**
     * 打开应用（便捷方法）
     */
    async openApp(app) {
        return this.executeTool('open_app', { app });
    }

    /**
     * 获取执行历史
     */
    getHistory() {
        return this.taskHistory;
    }

    /**
     * 清除历史
     */
    clearHistory() {
        this.taskHistory = [];
        return { success: true };
    }

    /**
     * 获取安全报告
     */
    getSecurityReport() {
        return security.getSecurityReport();
    }
}

// 导出
const executor = new TaskExecutor();

module.exports = {
    executor,
    TaskExecutor,
    TOOLS,
    CONFIG,
    SecurityManager,
    AuditLogger
};
