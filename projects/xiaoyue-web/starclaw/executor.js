/**
 * StarClaw 任务执行引擎 v2.0
 * 参考 OpenClaw 架构设计 - 真正能干活的执行系统
 * 
 * 核心能力:
 * 1. 代码执行 (JavaScript/Python/Shell)
 * 2. 文件系统操作 (读写/创建/删除/搜索)
 * 3. 网络请求 (HTTP/API调用)
 * 4. 浏览器控制 (Puppeteer)
 * 5. 系统命令执行
 * 6. 任务规划与拆解
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const util = require('util');
// cheerio 是可选依赖，如果需要网页爬取功能，请运行: npm install cheerio
// const cheerio = require('cheerio');

const execAsync = util.promisify(exec);

// ==================== 配置 ====================
const CONFIG = {
    workspace: path.join(__dirname, 'workspace'),
    tempDir: path.join(__dirname, 'temp'),
    outputDir: path.join(__dirname, 'output'),
    maxExecutionTime: 120000, // 2分钟超时
    maxOutputSize: 1024 * 1024 * 10, // 10MB 输出限制
};

// 确保目录存在
[CONFIG.workspace, CONFIG.tempDir, CONFIG.outputDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ==================== 工具定义 ====================

const TOOLS = {
    // 代码执行工具
    execute_code: {
        name: 'execute_code',
        description: '执行代码并返回结果，支持 JavaScript、Python、Shell',
        parameters: {
            type: 'object',
            properties: {
                code: { type: 'string', description: '要执行的代码' },
                language: { type: 'string', enum: ['javascript', 'python', 'shell'], default: 'javascript' }
            },
            required: ['code']
        },
        execute: async (params) => {
            const { code, language = 'javascript' } = params;
            const ext = { javascript: 'js', python: 'py', shell: 'sh' }[language];
            const runner = { javascript: 'node', python: 'python', shell: 'cmd /c' }[language];
            
            const tempFile = path.join(CONFIG.tempDir, `exec_${Date.now()}.${ext}`);
            
            try {
                fs.writeFileSync(tempFile, code, 'utf-8');
                const { stdout, stderr } = await execAsync(`${runner} "${tempFile}"`, {
                    cwd: CONFIG.workspace,
                    timeout: CONFIG.maxExecutionTime,
                    maxBuffer: CONFIG.maxOutputSize
                });
                return { success: true, output: stdout, stderr, language };
            } catch (error) {
                return { success: false, error: error.message, stderr: error.stderr, output: error.stdout };
            } finally {
                setTimeout(() => { try { fs.unlinkSync(tempFile); } catch (e) {} }, 1000);
            }
        }
    },

    // 文件操作工具
    file_operation: {
        name: 'file_operation',
        description: '文件系统操作：读取、写入、创建、删除、列出、搜索文件',
        parameters: {
            type: 'object',
            properties: {
                operation: { type: 'string', enum: ['read', 'write', 'append', 'delete', 'list', 'mkdir', 'search', 'copy', 'move'] },
                path: { type: 'string', description: '文件或目录路径' },
                content: { type: 'string', description: '写入内容（write/append时使用）' },
                destination: { type: 'string', description: '目标路径（copy/move时使用）' },
                pattern: { type: 'string', description: '搜索模式（search时使用）' }
            },
            required: ['operation', 'path']
        },
        execute: async (params) => {
            const { operation, path: filePath, content, destination, pattern } = params;
            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(CONFIG.outputDir, filePath);
            
            try {
                switch (operation) {
                    case 'read':
                        if (fs.existsSync(fullPath)) {
                            return { success: true, content: fs.readFileSync(fullPath, 'utf-8'), path: fullPath };
                        }
                        return { success: false, error: '文件不存在', path: fullPath };
                    
                    case 'write':
                        const dir = path.dirname(fullPath);
                        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                        fs.writeFileSync(fullPath, content || '', 'utf-8');
                        return { success: true, path: fullPath, size: (content || '').length };
                    
                    case 'append':
                        fs.appendFileSync(fullPath, content || '', 'utf-8');
                        return { success: true, path: fullPath };
                    
                    case 'delete':
                        if (fs.existsSync(fullPath)) {
                            if (fs.statSync(fullPath).isDirectory()) {
                                fs.rmSync(fullPath, { recursive: true });
                            } else {
                                fs.unlinkSync(fullPath);
                            }
                            return { success: true, path: fullPath };
                        }
                        return { success: false, error: '文件不存在' };
                    
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
                    
                    case 'copy':
                        if (fs.existsSync(fullPath)) {
                            const destPath = path.isAbsolute(destination) ? destination : path.join(CONFIG.outputDir, destination);
                            fs.copyFileSync(fullPath, destPath);
                            return { success: true, source: fullPath, destination: destPath };
                        }
                        return { success: false, error: '源文件不存在' };
                    
                    case 'move':
                        if (fs.existsSync(fullPath)) {
                            const destPath = path.isAbsolute(destination) ? destination : path.join(CONFIG.outputDir, destination);
                            fs.renameSync(fullPath, destPath);
                            return { success: true, source: fullPath, destination: destPath };
                        }
                        return { success: false, error: '源文件不存在' };
                    
                    default:
                        return { success: false, error: `未知操作: ${operation}` };
                }
            } catch (error) {
                return { success: false, error: error.message, path: fullPath };
            }
        }
    },

    // HTTP请求工具
    http_request: {
        name: 'http_request',
        description: '发送HTTP请求，支持GET、POST、PUT、DELETE等方法',
        parameters: {
            type: 'object',
            properties: {
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'GET' },
                url: { type: 'string', description: '请求URL' },
                headers: { type: 'object', description: '请求头' },
                body: { type: 'object', description: '请求体' },
                timeout: { type: 'number', default: 30000 }
            },
            required: ['url']
        },
        execute: async (params) => {
            const { method = 'GET', url, headers = {}, body, timeout = 30000 } = params;
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

    // 命令执行工具
    run_command: {
        name: 'run_command',
        description: '执行系统命令（Shell/CMD）',
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

    // 打开应用工具
    open_app: {
        name: 'open_app',
        description: '打开应用程序或网页',
        parameters: {
            type: 'object',
            properties: {
                app: { type: 'string', description: '应用名称或URL' }
            },
            required: ['app']
        },
        execute: async (params) => {
            const { app } = params;
            const appCommands = {
                '浏览器': 'start https://www.google.com',
                'chrome': 'start chrome',
                'edge': 'start msedge',
                '记事本': 'notepad',
                '计算器': 'calc',
                '画图': 'mspaint',
                '资源管理器': 'explorer',
                '命令行': 'cmd',
            };
            
            const command = appCommands[app.toLowerCase()] || 
                (app.startsWith('http') ? `start ${app}` : `start ${app}`);
            
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
            try {
                switch (operation) {
                    case 'parse_json':
                        return { success: true, result: JSON.parse(data) };
                    case 'stringify':
                        return { success: true, result: JSON.stringify(typeof data === 'string' ? JSON.parse(data) : data, null, 2) };
                    case 'format_json':
                        return { success: true, result: JSON.stringify(JSON.parse(data), null, 2) };
                    case 'csv_to_json':
                        const lines = data.trim().split('\n');
                        const headers = lines[0].split(',');
                        const result = lines.slice(1).map(line => {
                            const values = line.split(',');
                            return headers.reduce((obj, h, i) => ({ ...obj, [h.trim()]: values[i]?.trim() }), {});
                        });
                        return { success: true, result };
                    case 'json_to_csv':
                        const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
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
     * 执行单个工具
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
}

// 导出
const executor = new TaskExecutor();

module.exports = {
    executor,
    TaskExecutor,
    TOOLS,
    CONFIG
};
