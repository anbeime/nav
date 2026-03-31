/**
 * MCP (Model Context Protocol) 集成服务
 * 参考 WorkBuddy 的 MCP 实现设计
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class MCPIntegration {
    constructor(config = {}) {
        this.mcpServers = new Map();
        this.config = config.mcpConfig || {};
        this.skillsPath = config.skillsPath || path.join(__dirname, '../skills');
    }

    /**
     * 初始化 MCP 服务器
     */
    async initialize() {
        console.log('[MCP] 初始化 MCP 集成...');

        // 加载技能中的 MCP 配置
        await this.loadSkillMCPConfigs();

        // 启动配置的服务器
        for (const [name, config] of Object.entries(this.config.servers || {})) {
            await this.startServer(name, config);
        }

        console.log('[MCP] MCP 集成初始化完成');
    }

    /**
     * 从技能配置中加载 MCP 配置
     */
    async loadSkillMCPConfigs() {
        try {
            const skillsDir = this.skillsPath;
            const entries = await fs.readdir(skillsDir, { withFileTypes: true });

            for (const entry of entries) {
                if (!entry.isDirectory()) continue;

                const skillDir = path.join(skillsDir, entry.name);
                const mcpConfigPath = path.join(skillDir, 'mcp.json');

                try {
                    const content = await fs.readFile(mcpConfigPath, 'utf-8');
                    const mcpConfig = JSON.parse(content);

                    // 注册技能的 MCP 服务器
                    for (const [serverName, serverConfig] of Object.entries(mcpConfig.servers || {})) {
                        const fullName = `${entry.name}_${serverName}`;
                        this.config.servers[fullName] = serverConfig;
                    }
                } catch (e) {
                    // 技能没有 MCP 配置，跳过
                }
            }
        } catch (e) {
            console.error('[MCP] 加载技能 MCP 配置失败:', e);
        }
    }

    /**
     * 启动 MCP 服务器
     */
    async startServer(name, config) {
        if (this.mcpServers.has(name)) {
            console.log(`[MCP] 服务器 ${name} 已在运行`);
            return;
        }

        try {
            const { command, args = [], env = {} } = config;

            console.log(`[MCP] 启动服务器: ${name}`);
            console.log(`[MCP] 命令: ${command} ${args.join(' ')}`);

            const serverProcess = spawn(command, args, {
                env: { ...process.env, ...env },
                stdio: ['pipe', 'pipe', 'pipe'],
                windowsHide: true
            });

            serverProcess.stdout.on('data', (data) => {
                console.log(`[MCP:${name}] ${data.toString().trim()}`);
            });

            serverProcess.stderr.on('data', (data) => {
                console.error(`[MCP:${name}] ERROR: ${data.toString().trim()}`);
            });

            serverProcess.on('close', (code) => {
                console.log(`[MCP] 服务器 ${name} 已停止，退出码: ${code}`);
                this.mcpServers.delete(name);
            });

            this.mcpServers.set(name, {
                process: serverProcess,
                config,
                status: 'running'
            });

            // 等待服务器启动
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (e) {
            console.error(`[MCP] 启动服务器 ${name} 失败:`, e);
            throw e;
        }
    }

    /**
     * 停止 MCP 服务器
     */
    async stopServer(name) {
        const server = this.mcpServers.get(name);
        if (!server) {
            console.log(`[MCP] 服务器 ${name} 未运行`);
            return;
        }

        console.log(`[MCP] 停止服务器: ${name}`);
        server.process.kill();
        this.mcpServers.delete(name);
    }

    /**
     * 获取 MCP 工具列表
     */
    async getTools() {
        const tools = [];

        for (const [name, server] of this.mcpServers.entries()) {
            // 从配置或服务器获取工具列表
            if (server.config.tools) {
                tools.push(...server.config.tools.map(tool => ({
                    ...tool,
                    server: name
                })));
            }
        }

        return tools;
    }

    /**
     * 调用 MCP 工具
     */
    async callTool(toolName, params) {
        // 查找工具所在的服务器
        let targetServer = null;
        let targetTool = null;

        for (const [serverName, server] of this.mcpServers.entries()) {
            const tool = server.config.tools?.find(t => t.name === toolName);
            if (tool) {
                targetServer = serverName;
                targetTool = tool;
                break;
            }
        }

        if (!targetServer) {
            throw new Error(`工具 ${toolName} 未找到`);
        }

        // 通过 stdin 与 MCP 服务器通信
        const server = this.mcpServers.get(targetServer);
        
        return new Promise((resolve, reject) => {
            const request = JSON.stringify({
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: params
                }
            });

            let response = '';
            const timeout = setTimeout(() => {
                reject(new Error('MCP 调用超时'));
            }, 30000);

            server.process.stdout.once('data', (data) => {
                clearTimeout(timeout);
                try {
                    response = JSON.parse(data.toString());
                    resolve(response);
                } catch (e) {
                    resolve({ result: data.toString() });
                }
            });

            server.process.stdin.write(request + '\n');
        });
    }

    /**
     * 获取服务器状态
     */
    getStatus() {
        const status = {};

        for (const [name, server] of this.mcpServers.entries()) {
            status[name] = {
                status: server.status,
                pid: server.process.pid,
                tools: server.config.tools?.map(t => t.name) || []
            };
        }

        return status;
    }

    /**
     * 关闭所有 MCP 服务器
     */
    async shutdown() {
        console.log('[MCP] 关闭所有 MCP 服务器...');

        for (const [name] of this.mcpServers.entries()) {
            await this.stopServer(name);
        }

        console.log('[MCP] 所有 MCP 服务器已关闭');
    }
}

/**
 * 预定义的 MCP 服务器配置
 */
const PREDEFINED_MCP_SERVERS = {
    // 文件系统访问
    filesystem: {
        command: 'mcp-server-filesystem',
        args: ['--path', process.cwd()],
        tools: [
            { name: 'read_file', description: '读取文件内容' },
            { name: 'write_file', description: '写入文件内容' },
            { name: 'list_directory', description: '列出目录内容' }
        ]
    },

    // 网络搜索
    web_search: {
        command: 'mcp-server-brave-search',
        args: [],
        env: {
            BRAVE_API_KEY: process.env.BRAVE_API_KEY
        },
        tools: [
            { name: 'search', description: '网络搜索' }
        ]
    },

    // Git 操作
    git: {
        command: 'mcp-server-git',
        args: ['--repository', process.cwd()],
        tools: [
            { name: 'git_status', description: '查看 Git 状态' },
            { name: 'git_diff', description: '查看变更' },
            { name: 'git_commit', description: '提交变更' }
        ]
    },

    // SQLite 数据库
    sqlite: {
        command: 'mcp-server-sqlite',
        args: ['--db-path', path.join(__dirname, '../data/context.db')],
        tools: [
            { name: 'query', description: '执行 SQL 查询' },
            { name: 'list_tables', description: '列出数据表' }
        ]
    }
};

module.exports = {
    MCPIntegration,
    PREDEFINED_MCP_SERVERS
};
