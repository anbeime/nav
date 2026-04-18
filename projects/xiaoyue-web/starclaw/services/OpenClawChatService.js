/**
 * OpenClawChatService - OpenClaw 对话服务
 * 
 * 通过 OpenClaw 网关进行对话，自动获得：
 * - Lossless-Claw 无损上下文管理
 * - DAG 摘要压缩
 * - FTS5 全文搜索
 * - 智能工具 (lcm_grep, lcm_describe, lcm_expand)
 * 
 * API 端点：ws://127.0.0.1:18789
 */

const axios = require('axios');
const WebSocket = require('ws');

class OpenClawChatService {
    constructor(config = {}) {
        this.apiEndpoint = config.apiEndpoint || 'http://127.0.0.1:18789';
        this.wsEndpoint = config.wsEndpoint || 'ws://127.0.0.1:18789';
        this.token = config.token || process.env.OPENCLAW_TOKEN || '';
        this.timeout = config.timeout || 120000;
        this.enabled = config.enabled !== false;
    }
    
    /**
     * 检查 OpenClaw 网关是否运行
     */
    async checkHealth() {
        try {
            const res = await axios.get(`${this.apiEndpoint}/health`, {
                timeout: 5000
            });
            return {
                available: true,
                status: res.data
            };
        } catch (e) {
            return {
                available: false,
                error: e.message
            };
        }
    }
    
    /**
     * 通过 WebSocket 进行对话
     * 这会触发 OpenClaw 的完整处理流程，包括 Lossless-Claw
     * 
     * @param {string} message - 用户消息
     * @param {string} sessionId - 会话 ID
     * @param {object} options - 其他选项
     * @returns {Promise<object>} - 回复结果
     */
    async chat(message, sessionId = 'default', options = {}) {
        if (!this.enabled) {
            return {
                success: false,
                error: 'OpenClaw 服务未启用',
                fallback: true
            };
        }
        
        // 检查网关状态
        const health = await this.checkHealth();
        if (!health.available) {
            return {
                success: false,
                error: 'OpenClaw 网关未运行',
                fallback: true,
                healthError: health.error
            };
        }
        
        return new Promise((resolve, reject) => {
            // 使用正确的连接参数格式
            const wsUrl = `${this.wsEndpoint}?token=${encodeURIComponent(this.token)}`;
            
            const ws = new WebSocket(wsUrl, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                handshakeTimeout: 10000
            });
            
            let response = null;
            const timeout = setTimeout(() => {
                ws.close();
                resolve({
                    success: false,
                    error: '请求超时',
                    fallback: true
                });
            }, this.timeout);
            
            ws.on('open', () => {
                console.log('[OpenClaw] WebSocket 连接成功');
                
                // 发送消息 - 使用 OpenClaw 的消息格式
                ws.send(JSON.stringify({
                    type: 'message',
                    content: message,
                    session_id: sessionId,
                    stream: false
                }));
            });
            
            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    console.log('[OpenClaw] 收到消息:', msg.type);
                    
                    switch (msg.type) {
                        case 'response':
                        case 'assistant':
                        case 'content':
                            clearTimeout(timeout);
                            ws.close();
                            response = {
                                success: true,
                                content: msg.content || msg.message || msg.text || '',
                                sessionId: msg.session_id || sessionId,
                                provider: 'openclaw',
                                usage: msg.usage,
                                context: msg.context
                            };
                            resolve(response);
                            break;
                            
                        case 'error':
                            clearTimeout(timeout);
                            ws.close();
                            resolve({
                                success: false,
                                error: msg.error || msg.message || '未知错误',
                                fallback: true
                            });
                            break;
                            
                        case 'done':
                        case 'complete':
                            clearTimeout(timeout);
                            ws.close();
                            if (!response) {
                                response = {
                                    success: true,
                                    content: msg.content || msg.result || '',
                                    sessionId: sessionId,
                                    provider: 'openclaw'
                                };
                            }
                            resolve(response);
                            break;
                    }
                } catch (e) {
                    console.error('[OpenClaw] 解析消息失败:', e.message);
                }
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                console.error('[OpenClaw] WebSocket 错误:', error.message);
                resolve({
                    success: false,
                    error: `WebSocket 错误: ${error.message}`,
                    fallback: true
                });
            });
            
            ws.on('close', (code, reason) => {
                clearTimeout(timeout);
                if (code !== 1000 && code !== 1001) {
                    console.log(`[OpenClaw] WebSocket 关闭: code=${code}, reason=${reason}`);
                }
            });
        });
    }
    
    /**
     * 执行任务（带工具调用）
     */
    async executeTask(task, sessionId = 'default') {
        return this.chat(task, sessionId, { taskMode: true });
    }
    
    /**
     * 搜索历史对话（使用 Lossless-Claw 的 lcm_grep）
     */
    async searchHistory(query, sessionId = null, options = {}) {
        const health = await this.checkHealth();
        if (!health.available) {
            return { success: false, error: 'OpenClaw 网关未运行', results: [] };
        }
        
        try {
            const res = await axios.post(`${this.apiEndpoint}/api/lcm/grep`, {
                query,
                session_id: sessionId,
                limit: options.limit || 10
            }, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            
            return {
                success: true,
                results: res.data.results || []
            };
        } catch (e) {
            return {
                success: false,
                error: e.message,
                results: []
            };
        }
    }
    
    /**
     * 展开摘要（使用 Lossless-Claw 的 lcm_expand）
     */
    async expandSummary(summaryId, options = {}) {
        const health = await this.checkHealth();
        if (!health.available) {
            return { success: false, error: 'OpenClaw 网关未运行' };
        }
        
        try {
            const res = await axios.post(`${this.apiEndpoint}/api/lcm/expand`, {
                summary_id: summaryId,
                prompt: options.prompt || '展开此摘要的详细信息'
            }, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            });
            
            return {
                success: true,
                content: res.data.content || res.data.result || ''
            };
        } catch (e) {
            return {
                success: false,
                error: e.message
            };
        }
    }
}

module.exports = { OpenClawChatService };
