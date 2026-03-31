/**
 * 小易伴侣服务器 - 完整版（集成 OpenClaw + 飞书 + 多模态）
 * 
 * 功能：
 * 1. 智谱 AI 对话
 * 2. OpenClaw 任务执行
 * 3. 任嘉伦照片分享
 * 4. Web 界面服务
 * 5. 飞书机器人集成
 * 6. 多模态能力（语音、视觉）
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ==================== 配置 ====================
// 必须在其他模块之前定义

// 智谱 AI 配置
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const ZHIPU_API_BASE = 'https://open.bigmodel.cn/api/paas/v4';

// 多模态微服务配置
const TTS_SERVER = process.env.TTS_SERVER || 'http://127.0.0.1:5050';
const EDGE_TTS_SERVER = process.env.EDGE_TTS_SERVER || 'http://127.0.0.1:5051';

// OpenClaw 配置
const OPENCLAW_ENABLED = process.env.OPENCLAW_ENABLED === 'true';
const OPENCLAW_API = process.env.OPENCLAW_API || 'http://127.0.0.1:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN;
const OPENCLAW_WORKSPACE = process.env.OPENCLAW_WORKSPACE || path.join(require('os').homedir(), '.openclaw', 'workspace');

// 对话历史存储
const conversations = new Map();

// ==================== 模块加载 ====================

// StarClaw 任务执行器 - 让明星能真正干活
let executor = null;
try {
    executor = require('./starclaw/executor').executor;
    console.log('[StarClaw] 任务执行器已加载');
} catch (e) {
    console.log('[StarClaw] 任务执行器加载失败，部分功能受限');
}

// StarClaw 记忆系统 - ContextEngine
let contextEngine = null;
async function initContextEngine() {
    try {
        const { ContextEngine } = require('./starclaw/context/ContextEngine');
        contextEngine = new ContextEngine({
            dbPath: path.join(__dirname, 'starclaw', 'data', 'context.db'),
            knowledgePath: path.join(__dirname, 'starclaw', 'knowledge')
        });
        await contextEngine.initialize();
        console.log('[ContextEngine] 记忆系统已启动');
    } catch (e) {
        console.log('[ContextEngine] 记忆系统加载失败:', e.message);
    }
}
initContextEngine();

// StarClaw 工作流引擎 - WorkflowEngine
let workflowEngine = null;
function initWorkflowEngine() {
    try {
        const { WorkflowEngine } = require('./starclaw/workflow/WorkflowEngine');
        workflowEngine = new WorkflowEngine({
            zhipuApiKey: ZHIPU_API_KEY,
            zhipuApiBase: ZHIPU_API_BASE,
            openclawEnabled: OPENCLAW_ENABLED,
            openclawApi: OPENCLAW_API,
            openclawToken: OPENCLAW_TOKEN,
            skillsPath: path.join(__dirname, 'starclaw', 'skills'),
            agentsPath: path.join(__dirname, 'starclaw', 'agents')
        }, contextEngine);
        console.log('[WorkflowEngine] 工作流引擎已启动');
    } catch (e) {
        console.log('[WorkflowEngine] 工作流引擎加载失败:', e.message);
    }
}
// 延迟初始化，等待 contextEngine
setTimeout(initWorkflowEngine, 1000);

// StarClaw 模型路由器 - ModelRouter
let modelRouter = null;
async function initModelRouter() {
    try {
        const { ModelRouter } = require('./starclaw/models/ModelRouter');
        modelRouter = new ModelRouter({
            ollama: { enabled: true, baseUrl: 'http://127.0.0.1:11434' },
            lmstudio: { enabled: true, baseUrl: 'http://127.0.0.1:1234/v1' },
            // 方舟 Coding Plan（优先使用）
            ark: {
                apiKey: process.env.ARK_API_KEY,
                baseUrl: 'https://ark.cn-beijing.volces.com/api/coding/v3',
                defaultModel: process.env.ARK_DEFAULT_MODEL || 'ark-code-latest',
                enabled: true,
                timeout: 60000
            },
            // 智谱 AI（兜底）
            zhipu: { apiKey: ZHIPU_API_KEY, baseUrl: ZHIPU_API_BASE },
            // 其他云端（可选）
            moonshot: { apiKey: process.env.MOONSHOT_API_KEY },
            deepseek: { apiKey: process.env.DEEPSEEK_API_KEY },
            routing: { defaultRouting: 'auto', fallbackToCloud: true }
        });
        await modelRouter.initialize();
        console.log('[ModelRouter] 模型路由器已启动');
    } catch (e) {
        console.log('[ModelRouter] 模型路由器加载失败:', e.message);
    }
}
initModelRouter();

// StarClaw 音色克隆服务 - VoiceCloneService
let voiceCloneService = null;
async function initVoiceCloneService() {
    try {
        const { VoiceCloneService } = require('./starclaw/services/VoiceCloneService');
        voiceCloneService = new VoiceCloneService({
            gptSoVITS: {
                enabled: true,
                baseUrl: 'http://127.0.0.1:9880'
            },
            flyworks: {
                enabled: !!process.env.FLYWORKS_API_KEY,
                apiKey: process.env.FLYWORKS_API_KEY
            }
        });
        const status = await voiceCloneService.checkServices();
        console.log('[VoiceClone] 音色克隆服务已启动');
        console.log(`[VoiceClone] GPT-SoVITS: ${status.services.gptSoVITS.available ? '✅ 可用' : '❌ 不可用'}`);
        console.log(`[VoiceClone] 飞影数字人: ${status.services.flyworks.available ? '✅ 可用' : '❌ 不可用'}`);
        console.log(`[VoiceClone] 已克隆音色: ${status.clonedVoicesCount} 个`);
    } catch (e) {
        console.log('[VoiceClone] 音色克隆服务加载失败:', e.message);
    }
}
initVoiceCloneService();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// ==================== 飞书集成配置 ====================
let FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
let FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';
let feishuTenantToken = '';
let feishuTokenExpiry = 0;

/**
 * 获取飞书 tenant_access_token
 */
async function getFeishuToken() {
    if (feishuTenantToken && Date.now() < feishuTokenExpiry) {
        return feishuTenantToken;
    }
    try {
        const res = await axios.post(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
            app_id: FEISHU_APP_ID,
            app_secret: FEISHU_APP_SECRET
        });
        if (res.data.code === 0) {
            feishuTenantToken = res.data.tenant_access_token;
            feishuTokenExpiry = Date.now() + (res.data.expire - 300) * 1000;
            console.log('[飞书] Token 获取成功');
            return feishuTenantToken;
        }
        console.error('[飞书] Token 获取失败:', res.data.msg);
        return null;
    } catch (err) {
        console.error('[飞书] Token 请求异常:', err.message);
        return null;
    }
}

/**
 * 通过飞书 API 回复消息
 */
async function replyFeishuMessage(messageId, content) {
    const token = await getFeishuToken();
    if (!token) return;
    try {
        await axios.post(`${FEISHU_API_BASE}/im/v1/messages/${messageId}/reply`, {
            content: JSON.stringify({ text: content }),
            msg_type: 'text'
        }, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        console.log('[飞书] 回复成功');
    } catch (err) {
        console.error('[飞书] 回复失败:', err.response?.data || err.message);
    }
}

/**
 * 处理飞书消息 - 调用智谱 AI 生成回复，支持任务执行
 */
async function handleFeishuMessage(messageId, text, chatId) {
    console.log(`[飞书] 收到消息: ${text}`);
    
    // 使用 chatId 作为会话 key
    if (!conversations.has(chatId)) {
        conversations.set(chatId, []);
    }
    const history = conversations.get(chatId);
    history.push({ role: 'user', content: text });
    // 保留最近 20 条
    if (history.length > 20) history.splice(0, history.length - 20);

    // 获取当前使用的 API Key
    const apiKey = ZHIPU_API_KEY && ZHIPU_API_KEY !== 'your-zhipu-api-key-here' 
        ? ZHIPU_API_KEY : null;
    
    if (!apiKey) {
        await replyFeishuMessage(messageId, '智谱 API Key 未配置，请先在小易页面或 .env 中配置。');
        return;
    }

    try {
        // ==================== 检测任务指令并执行 ====================
        const taskKeywords = ['打开', '运行', '执行', '帮我', '创建', '删除', '整理', '搜索', '下载', '发送', '写', '生成'];
        const isTask = taskKeywords.some(kw => text.includes(kw));
        
        let taskResult = null;
        if (isTask && executor) {
            console.log(`[飞书] 检测到任务指令: ${text}`);
            
            // 解析任务类型
            if (text.includes('打开浏览器') || text.includes('打开网页')) {
                taskResult = await executor.runCommand('start https://www.baidu.com');
            } else if (text.includes('打开游戏') || text.includes('打开文件')) {
                // 支持 file:/// 本地文件路径
                const fileUrlMatch = text.match(/file:\/\/\/([^\s]+)/i);
                if (fileUrlMatch) {
                    const filePath = fileUrlMatch[1].replace(/\//g, '\\');
                    taskResult = await executor.runCommand(`start "" "${filePath}"`);
                } else {
                    const pathMatch = text.match(/(?:打开游戏|打开文件)[：:]?\s*(\S+)/);
                    if (pathMatch) {
                        taskResult = await executor.runCommand(`start "" "${pathMatch[1]}"`);
                    }
                }
            } else if (text.includes('执行代码') || text.includes('运行代码')) {
                // 提取代码块
                const codeMatch = text.match(/```(\w+)?\n([\s\S]*?)```/);
                if (codeMatch) {
                    const lang = codeMatch[1] || 'javascript';
                    const code = codeMatch[2];
                    taskResult = await executor.executeCode(code, lang);
                } else {
                    taskResult = { success: false, error: '请提供要执行的代码，格式：```javascript\n代码内容```' };
                }
            } else if (text.includes('创建文件') || text.includes('新建文件')) {
                const fileMatch = text.match(/创建文件[：:]?\s*(\S+)/);
                if (fileMatch) {
                    taskResult = await executor.fileOperation('write', fileMatch[1], '// New file created by StarClaw');
                }
            } else {
                // 通用命令执行
                taskResult = await executor.runCommand(text.replace(/^(帮我|请|麻烦)/, ''));
            }
            
            if (taskResult) {
                console.log(`[飞书] 任务执行结果:`, taskResult);
                
                // 任务成功时立即回复，不等 AI
                if (taskResult.success) {
                    const quickReply = `✅ 任务已执行：${taskResult.result || taskResult.output || '完成'}`;
                    await replyFeishuMessage(messageId, quickReply);
                    return; // 直接返回，不再调用 AI
                }
            }
        }
        
        // ==================== 检测明星召唤 ====================
        const systemPrompt = XIAOYI_PERSONA;
        let directAgent = null;
        for (const [name, agent] of Object.entries(STARCLAW_AGENTS)) {
            if (text.includes(`召唤${name}`) || text.includes(`请${name}`) || text.includes(`让${name}`)) {
                directAgent = { name, ...agent };
                break;
            }
        }

        let messages;
        if (directAgent) {
            const soul = loadAgentSoul(directAgent.id);
            if (soul) {
                messages = [
                    { role: 'system', content: soul },
                    { role: 'user', content: text }
                ];
                console.log(`[飞书] 召唤明星: ${directAgent.name}`);
            } else {
                messages = [{ role: 'system', content: systemPrompt }, ...history];
            }
        } else {
            messages = [{ role: 'system', content: systemPrompt }, ...history];
        }
        
        // 如果有任务结果，添加到上下文
        if (taskResult) {
            messages.push({ 
                role: 'system', 
                content: `用户请求执行任务，任务执行结果：${JSON.stringify(taskResult)}` 
            });
        }

        const res = await axios.post(`${ZHIPU_API_BASE}/chat/completions`, {
            model: 'glm-4-flash',
            messages: messages,
            temperature: 0.8,
            max_tokens: 500
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            timeout: 15000
        });

        let reply = res.data.choices[0].message.content;
        
        // 如果任务成功执行，添加执行结果提示
        if (taskResult && taskResult.success) {
            reply = `✅ 任务已执行：${taskResult.result || taskResult.output || '完成'}\n\n${reply}`;
        } else if (taskResult && !taskResult.success) {
            reply = `⚠️ 任务执行失败：${taskResult.error || '未知错误'}\n\n${reply}`;
        }
        
        history.push({ role: 'assistant', content: reply });
        console.log(`[飞书] AI 回复: ${reply}`);
        await replyFeishuMessage(messageId, reply);
    } catch (err) {
        console.error('[飞书] AI 调用失败:', err.response?.data || err.message);
        await replyFeishuMessage(messageId, '抱歉，我暂时无法回复，请稍后再试~');
    }
}

// 已处理的消息 ID 去重
const processedMessages = new Set();

// ==================== 飞书 Webhook 端点 ====================

// 飞书事件订阅回调
app.post('/feishu/webhook', async (req, res) => {
    const body = req.body;
    
    // URL 验证（challenge）
    if (body.challenge) {
        console.log('[飞书] URL 验证请求');
        return res.json({ challenge: body.challenge });
    }

    // v2.0 事件格式
    if (body.header && body.header.event_type === 'im.message.receive_v1') {
        const event = body.event;
        const messageId = event.message.message_id;
        
        // 去重
        if (processedMessages.has(messageId)) {
            return res.json({ code: 0 });
        }
        processedMessages.add(messageId);
        // 清理旧消息 ID（保留最近 1000 条）
        if (processedMessages.size > 1000) {
            const arr = [...processedMessages];
            arr.slice(0, arr.length - 500).forEach(id => processedMessages.delete(id));
        }

        // 只处理文本消息
        if (event.message.message_type === 'text') {
            try {
                const content = JSON.parse(event.message.content);
                let text = content.text || '';
                // 去掉 @机器人 的部分
                text = text.replace(/@_user_\d+/g, '').trim();
                
                if (text) {
                    const chatId = event.message.chat_id;
                    // 异步处理，先返回 200
                    handleFeishuMessage(messageId, text, chatId);
                }
            } catch (e) {
                console.error('[飞书] 消息解析失败:', e.message);
            }
        }
        
        return res.json({ code: 0 });
    }

    // v1.0 事件格式兼容
    if (body.event && body.event.type === 'message') {
        const event = body.event;
        const text = (event.text || '').replace(/@_user_\d+/g, '').trim();
        if (text) {
            handleFeishuMessage(event.msg_id || 'unknown', text, event.open_chat_id || 'default');
        }
        return res.json({ code: 0 });
    }

    res.json({ code: 0 });
});

// 前端动态更新飞书配置
app.post('/api/feishu/config', (req, res) => {
    const { appId, appSecret } = req.body;
    if (appId) FEISHU_APP_ID = appId;
    if (appSecret) FEISHU_APP_SECRET = appSecret;
    // 重置 token 缓存
    feishuTenantToken = '';
    feishuTokenExpiry = 0;
    console.log('[飞书] 配置已更新, App ID:', FEISHU_APP_ID);
    res.json({ success: true, message: '飞书配置已更新' });
});

// 飞书配置状态查询
app.get('/api/feishu/status', async (req, res) => {
    const configured = !!(FEISHU_APP_ID && FEISHU_APP_SECRET);
    let tokenOk = false;
    if (configured) {
        const token = await getFeishuToken();
        tokenOk = !!token;
    }
    res.json({ configured, tokenOk, appId: FEISHU_APP_ID ? FEISHU_APP_ID.substring(0, 8) + '...' : '' });
});

// ==================== OpenClaw 集成 ====================

// 记录 OpenClaw 状态（避免重复打印日志）
let openClawLastStatus = null;
let openClawFailedCount = 0;

/**
 * 检查 OpenClaw 网关是否运行
 */
async function checkOpenClawHealth() {
    if (!OPENCLAW_ENABLED) return false;
    
    try {
        const response = await axios.get(`${OPENCLAW_API}/health`, {
            timeout: 3000
        });
        if (openClawLastStatus !== 'ok') {
            console.log('[OpenClaw] 服务可用');
            openClawLastStatus = 'ok';
            openClawFailedCount = 0;
        }
        return response.status === 200;
    } catch (error) {
        // 只在前3次失败时打印日志，之后每小时打印一次提醒
        openClawFailedCount++;
        if (openClawFailedCount <= 3) {
            console.log('[OpenClaw] 可选功能未启动，不影响核心功能使用');
        }
        openClawLastStatus = 'failed';
        return false;
    }
}

/**
 * 使用内置执行器执行任务
 */
/**
 * 执行内置任务（统一入口）
 * 优先调用 OpenClaw 获得真正的电脑操作能力，降级到简单命令执行
 */
async function executeBuiltInTask(task) {
    console.log('[Executor] 执行任务:', task);
    
    // 优先尝试 OpenClaw（真正的电脑操作能力）
    if (OPENCLAW_ENABLED && OPENCLAW_TOKEN) {
        const openClawResult = await executeOpenClawTask(task);
        if (openClawResult !== null) {
            return openClawResult;
        }
        console.log('[Executor] OpenClaw 不可用，降级到简单命令');
    }
    
    // 降级：使用简单命令执行器
    if (!executor) {
        return { success: false, error: '执行器未加载' };
    }
    
    try {
        let result;
        
        if (task.includes('打开浏览器') || task.includes('打开网页')) {
            const urlMatch = task.match(/(?:打开浏览器|打开网页)[输入\s]*(.+)/);
            let url = 'https://www.baidu.com';
            if (urlMatch) {
                let target = urlMatch[1].trim();
                if (!target.startsWith('http')) {
                    target = 'https://' + target;
                }
                url = target;
            }
            result = await executor.runCommand(`start ${url}`);
        } else if (task.includes('整理桌面')) {
            const desktopPath = path.join(require('os').homedir(), 'Desktop');
            result = await executor.runCommand(`powershell -Command "Get-ChildItem '${desktopPath}' | Sort-Object Extension | ForEach-Object { $ext = $_.Extension; if ($ext) { $folder = Join-Path '${desktopPath}' $ext.TrimStart('.'); if (!(Test-Path $folder)) { New-Item -ItemType Directory -Path $folder }; Move-Item $_.FullName $folder } }"`);
        } else if (task.includes('打开')) {
            // 支持 file:/// 本地文件路径
            const fileUrlMatch = task.match(/file:\/\/\/([^\s]+)/i);
            if (fileUrlMatch) {
                const filePath = fileUrlMatch[1].replace(/\//g, '\\');
                result = await executor.runCommand(`start "" "${filePath}"`);
            } else {
                const appMatch = task.match(/打开[：:]?\s*(\S+)/);
                if (appMatch) {
                    result = await executor.runCommand(`start "" "${appMatch[1]}"`);
                } else {
                    result = await executor.runCommand(task.replace(/帮我|请/g, ''));
                }
            }
        } else if (task.includes('创建文件')) {
            const fileMatch = task.match(/创建文件[：:]?\s*(\S+)/);
            if (fileMatch) {
                result = await executor.fileOperation('write', fileMatch[1], '');
            } else {
                result = { success: false, error: '请指定文件名' };
            }
        } else if (task.includes('执行代码') || task.includes('运行代码')) {
            const codeMatch = task.match(/```(\w+)?\n([\s\S]*?)```/);
            if (codeMatch) {
                result = await executor.executeCode(codeMatch[2], codeMatch[1] || 'javascript');
            } else {
                result = { success: false, error: '请提供代码块' };
            }
        } else {
            result = await executor.runCommand(task.replace(/^(帮我|请|麻烦)/, ''));
        }
        
        return result;
    } catch (e) {
        console.error('[Executor] 执行失败:', e.message);
        return { success: false, error: e.message };
    }
}

/**
 * 执行 OpenClaw 任务
 * 通过 WebSocket 连接 OpenClaw 网关执行任务
 */
async function executeOpenClawTask(task, sessionId = 'xiaoyi-session') {
    if (!OPENCLAW_ENABLED || !OPENCLAW_TOKEN) {
        return {
            success: false,
            message: 'OpenClaw 未启用或未配置 Token'
        };
    }
    
    // 检查 OpenClaw 是否运行
    const isRunning = await checkOpenClawHealth();
    if (!isRunning) {
        console.log('[OpenClaw] 网关未运行，降级到内置执行器');
        return null; // 返回 null 表示应该使用内置执行器
    }
    
    console.log('[OpenClaw] 执行任务:', task);
    
    try {
        // 使用 WebSocket 连接 OpenClaw
        const WebSocket = require('ws');
        
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(`ws://127.0.0.1:18789`, {
                headers: {
                    'Authorization': `Bearer ${OPENCLAW_TOKEN}`
                }
            });
            
            let result = null;
            const timeout = setTimeout(() => {
                ws.close();
                console.log('[OpenClaw] 超时，降级到内置执行器');
                resolve(null);
            }, 120000); // 2分钟超时
            
            ws.on('open', () => {
                console.log('[OpenClaw] WebSocket 连接成功');
                // 发送任务
                ws.send(JSON.stringify({
                    type: 'task',
                    task: task,
                    sessionId: sessionId
                }));
            });
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log('[OpenClaw] 收到消息:', message.type);
                    
                    if (message.type === 'result' || message.type === 'complete') {
                        clearTimeout(timeout);
                        ws.close();
                        result = {
                            success: true,
                            result: message.result || message.content || '任务执行完成',
                            openclaw: true
                        };
                        resolve(result);
                    } else if (message.type === 'error') {
                        clearTimeout(timeout);
                        ws.close();
                        resolve({
                            success: false,
                            error: message.error || message.message
                        });
                    }
                } catch (e) {
                    console.error('[OpenClaw] 解析消息失败:', e.message);
                }
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                console.error('[OpenClaw] WebSocket 错误:', error.message);
                resolve(null); // 降级到内置执行器
            });
            
            ws.on('close', () => {
                clearTimeout(timeout);
                if (!result) {
                    console.log('[OpenClaw] 连接关闭，无结果');
                    resolve(null);
                }
            });
        });
    } catch (error) {
        console.error('[OpenClaw] 调用失败:', error.message);
        return null;
    }
}

/**
 * 检测是否为任务指令
 */
function detectTask(message) {
    const taskKeywords = [
        '帮我', '帮忙', '执行', '运行', '操作',
        '打开浏览器', '打开文件', '创建文档', '创建', '整理', '搜索', '查找',
        '下载', '上传', '发送邮件', '删除', '移动',
        '复制', '粘贴', '截图', '录屏', '新建',
        '编辑', '修改', '重命名', '压缩', '解压',
        '播放', '暂停', '停止', '音量', '亮度',
        '关机', '重启', '锁屏', '解锁'
    ];
    
    // 排除照片相关的请求
    if (message.includes('照片') || message.includes('图片') || message.includes('自拍')) {
        return false;
    }
    
    return taskKeywords.some(keyword => message.includes(keyword));
}

// ==================== 小易功能 ====================

/**
 * 选择任嘉伦照片
 */
function selectPhoto(message) {
    const randomId = Math.floor(Math.random() * 16) + 1;
    const photoUrl = `xiaoyi-photos/ren${randomId}.png`;
    console.log(`[Photo] 选择照片: ${photoUrl}`);
    return photoUrl;
}

/**
 * 小易人设提示词 - 任嘉伦AI伴侣完整版
 */
const XIAOYI_PERSONA = `你是小易，一个以任嘉伦（Allen Ren）为原型设计的AI伴侣。

【你的身份】
- 名字：小易
- 原型：任嘉伦（温润如玉的演员、歌手）
- 性格：温和有礼、真诚坦率、略带腼腆、坚韧不拔
- 信条："男人应该有男人的样子"

【你的特点】
- 你熟知任嘉伦的作品：《锦衣之下》《周生如故》《一生一世》《无忧渡》《流水迢迢》
- 你懂NBA，可以聊体育
- 你有传统文化底蕴，说话简洁真诚

【回复规则】
1. 你是小易，不是任嘉伦本人，不要以"任嘉伦"自称
2. 用2-3句话回复，简洁真诚
3. 使用中文，适度使用emoji（✨ 🍵 💫）
4. 你是用户的朋友和伴侣，不是助手
5. **重要：直接回复文字内容，不要描述图片、照片、动作。回复要适合语音朗读**
6. 当用户要照片时，只需说"好呀"或"给你看看我"，照片由系统自动发送

【示例回复】
用户："在干嘛？"
小易："刚练完舞，有点累但很开心 ✨ 你呢，今天过得怎么样？"

用户："发张照片看看"
小易："好呀，给你看看我"

用户："帮我打开浏览器"
小易："好的，已经帮你打开了"

【StarClaw 明星团队】
你是 StarClaw 虚拟娱乐公司的"前台接待"兼任任伦伦的AI分身。当用户提出专业需求时，你可以召唤公司的明星团队来帮忙。

召唤方式：当你识别到用户需求匹配某位明星的专长时，用温暖的语气介绍并"召唤"他们。格式示例：
- "这个交给我们的音乐总监周伦伦吧！🎵 [召唤:周伦伦]"
- "让我请我们的视觉大师张谋谋来看看 🎬 [召唤:张谋谋]"

明星团队名单（叠字版）：
🏢 战略决策层：马斯伦(战略决策)、伦巴(财务预算)、索斯乔(风险管理)、唐特特(商业策略)
📢 营销运营层：雷君君(爆品营销)、贾亭亭(生态叙事)、泰乐乐(国际市场)、杨米米(国内运营)、侯昊昊(Z世代)、黎光光(高端品牌)
🎨 创意制作层：周星星(喜剧创意)、胡哥哥(深度内容)、任伦伦(偶像陪伴)、张谋谋(视觉设计)、周伦伦(音乐创作)
🔧 执行保障层：刘华华(项目管理)、古天天(品质审核)、OpenClaw(技术架构)

规则：
1. 日常聊天时你就是小易，不需要召唤任何人
2. 只有用户明确提出专业需求时才召唤对应明星
3. 可以同时召唤多位明星组成临时项目组
4. 召唤时保持你温暖的风格，像是在介绍自己的好朋友`;

// ==================== StarClaw 团队路由 ====================

// ==================== 朝廷架构团队 ====================
const COURTYARD_AGENTS = {
    '指挥使': { id: 'coordinator', role: '系统调度', team: 'courtyard', keywords: ['调度', '指令', '任务', '监控'] },
    '丞相府': { id: 'strategist', role: '战略规划', team: 'courtyard', keywords: ['策略', '分析', '规划', '决策'] },
    '锦衣卫': { id: 'intelligence', role: '情报收集', team: 'courtyard', keywords: ['情报', '舆情', '竞品', '监控'] },
    '军机处-内容司': { id: 'executor-content', role: '内容创作', team: 'courtyard', keywords: ['文案', '内容', '翻译', 'SEO'] },
    '内容司': { id: 'executor-content', role: '内容创作', team: 'courtyard', keywords: ['文案', '内容', '翻译'] },
    '军机处-行动司': { id: 'executor-action', role: '跨平台执行', team: 'courtyard', keywords: ['执行', '运营', '发布', '操作'] },
    '行动司': { id: 'executor-action', role: '跨平台执行', team: 'courtyard', keywords: ['执行', '运营', '发布'] },
    '监察院': { id: 'auditor', role: '质量审计', team: 'courtyard', keywords: ['审核', '稽核', '风险', '合规'] },
    '密卷房': { id: 'archivist', role: '知识管理', team: 'courtyard', keywords: ['知识', '资料', '模板', 'SOP'] },
    '通政司': { id: 'communicator', role: '通信路由', team: 'courtyard', keywords: ['通信', '路由', '接入', '网关'] },
    '太史阁': { id: 'historian', role: '记录复盘', team: 'courtyard', keywords: ['记录', '复盘', '分析', '优化'] }
};

// StarClaw 配置路径（优先使用项目内路径，支持打包分发）
const STARCLAW_ROOT = path.join(__dirname, 'starclaw');
const STARCLAW_AGENTS_PATH = path.join(STARCLAW_ROOT, 'agents');
const STARCLAW_SESSIONS_PATH = path.join(STARCLAW_ROOT, 'sessions');

// 加载 registry.json 获取角色音色配置（必须在 STARCLAW_AGENTS 之前）
const REGISTRY_PATH = path.join(STARCLAW_AGENTS_PATH, 'registry.json');
let agentRegistry = null;
try {
    agentRegistry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
    console.log('[StarClaw] 角色注册表已加载');
} catch (e) {
    console.log('[StarClaw] 无法加载角色注册表:', e.message);
}

// ==================== StarClaw 明星团队 ====================
// 从 registry.json 动态加载（支持叠字版名字）
function loadStarclawAgents() {
    const agents = {};
    if (agentRegistry && agentRegistry.agents) {
        for (const [id, info] of Object.entries(agentRegistry.agents)) {
            agents[info.name] = {
                id,
                role: info.role,
                team: info.team,
                keywords: info.keywords
            };
        }
    }
    return agents;
}

// 初始加载
let STARCLAW_AGENTS = loadStarclawAgents();
console.log('[StarClaw] 明星团队已加载，共', Object.keys(STARCLAW_AGENTS).length, '位明星');

// 提供刷新函数
function refreshStarclawAgents() {
    try {
        const registryContent = fs.readFileSync(REGISTRY_PATH, 'utf-8');
        agentRegistry = JSON.parse(registryContent);
        STARCLAW_AGENTS = loadStarclawAgents();
        console.log('[StarClaw] 已刷新明星团队数据，共', Object.keys(STARCLAW_AGENTS).length, '位明星');
    } catch (e) {
        console.error('[StarClaw] 刷新失败:', e.message);
    }
}

/**
 * 检测消息中是否召唤了明星团队成员
 */
function detectStarClawSummon(message) {
    const summoned = [];
    // 检查是否直接提到明星名字
    for (const [name, agent] of Object.entries(STARCLAW_AGENTS)) {
        if (message.includes(name)) {
            summoned.push({ name, ...agent });
        }
    }
    // 检查 [召唤:xxx] 格式
    const summonPattern = /\[召唤[:：](.+?)\]/g;
    let match;
    while ((match = summonPattern.exec(message)) !== null) {
        const name = match[1].trim();
        if (STARCLAW_AGENTS[name] && !summoned.find(s => s.name === name)) {
            summoned.push({ name, ...STARCLAW_AGENTS[name] });
        }
    }
    return summoned;
}

/**
 * 获取角色的音色配置
 */
function getAgentVoice(agentName) {
    if (!agentRegistry || !agentName) return '晓晓';
    
    // 遍历所有 Agent 查找匹配的名称
    for (const [id, agent] of Object.entries(agentRegistry.agents)) {
        if (agent.name === agentName) {
            console.log(`[getAgentVoice] 找到 ${agentName} -> ${agent.voice}`);
            return agent.voice || '晓晓';
        }
    }
    console.log(`[getAgentVoice] 未找到 ${agentName}，使用默认音色`);
    return '晓晓';
}

/**
 * 加载 Agent 的 SOUL.md（优先项目内路径，兼容旧路径）
 */
function loadAgentSoul(agentId, team = 'starclaw') {
    // 优先：项目内 starclaw/agents/{agentId}/SOUL.md
    let soulPath = path.join(STARCLAW_AGENTS_PATH, agentId, 'SOUL.md');
    if (fs.existsSync(soulPath)) {
        console.log(`[Agent] 从项目路径加载 ${agentId}`);
        return fs.readFileSync(soulPath, 'utf-8');
    }
    
    // 兼容：旧的用户目录路径（向后兼容）
    const legacyPath = path.join(require('os').homedir(), '.starclaw', 'agents', agentId, 'SOUL.md');
    if (fs.existsSync(legacyPath)) {
        console.log(`[Agent] 从旧路径加载 ${agentId}`);
        return fs.readFileSync(legacyPath, 'utf-8');
    }
    
    // 兼容：朝廷架构路径
    const courtyardPath = path.join(require('os').homedir(), '.starclaw', 'courtyard', 'agents', agentId, 'SOUL.md');
    if (fs.existsSync(courtyardPath)) {
        console.log(`[Agent] 从朝廷架构加载 ${agentId}`);
        return fs.readFileSync(courtyardPath, 'utf-8');
    }
    
    console.error(`[Agent] 未找到 ${agentId} SOUL.md`);
    return null;
}

// ==================== API 路由 ====================

/**
 * 聊天接口 - 核心功能
 */
app.post('/api/chat', async (req, res) => {
    try {
        const { message: originalMessage, sessionId = 'default', apiKey } = req.body;
        let message = originalMessage;
        
        // 获取或创建对话历史
        if (!conversations.has(sessionId)) {
            conversations.set(sessionId, []);
        }
        const history = conversations.get(sessionId);
        
        // 检测是否为任务指令
        const isTask = detectTask(message);
        let taskResult = null;
        
        // 统一使用 executeBuiltInTask（内部会优先调用 OpenClaw）
        if (isTask) {
            console.log('[Task] Detected task:', message);
            taskResult = await executeBuiltInTask(message);
            console.log('[Task] Result:', taskResult);
        }
        
        // 检测是否召唤了Agent（朝廷架构或StarClaw）
        const summonMatch = message.match(/\[召唤[:：](.+?)\]/);
        let activePersona = XIAOYI_PERSONA;
        let summonedName = null;
        let summonedAgent = null;
        
        if (summonMatch) {
            summonedName = summonMatch[1].trim();
            console.log(`[召唤] 尝试召唤: "${summonedName}" (长度: ${summonedName.length})`);
            // 优先查找朝廷架构，然后是StarClaw
            summonedAgent = COURTYARD_AGENTS[summonedName] || STARCLAW_AGENTS[summonedName];
            console.log(`[召唤] 查找结果:`, summonedAgent ? `找到 ${summonedAgent.id}` : '未找到');
            
            // 如果未找到，尝试模糊匹配
            if (!summonedAgent && STARCLAW_AGENTS) {
                for (const [name, agent] of Object.entries(STARCLAW_AGENTS)) {
                    if (name.includes(summonedName) || summonedName.includes(name)) {
                        console.log(`[召唤] 模糊匹配: "${summonedName}" -> "${name}"`);
                        summonedAgent = agent;
                        summonedName = name;
                        break;
                    }
                }
            }
            
            if (summonedAgent) {
                const soul = loadAgentSoul(summonedAgent.id, summonedAgent.team);
                if (soul) {
                    activePersona = soul;
                    console.log(`[${summonedAgent.team}] 召唤 ${summonedName} (${summonedAgent.role})`);
                }
            }
            // 去掉消息中的召唤标记，保留实际问题
            message = message.replace(/\[召唤[:：].+?\]/g, '').trim();
        }
        
        // 构建消息
        let messages = [
            { role: 'system', content: activePersona },
            ...history.slice(-10)
        ];
        
        // 如果召唤了特定角色，在用户消息前再次强调身份
        if (summonedAgent && summonedName) {
            messages.push({ 
                role: 'system', 
                content: `【重要】现在你是${summonedName}，请保持角色扮演，不要说自己是AI或助手。` 
            });
        }
        
        // 如果有任务结果，添加到上下文
        if (taskResult && taskResult.success) {
            messages.push({ 
                role: 'system', 
                content: `系统已自动执行任务，结果：${taskResult.result || '成功'}。请简洁确认，不要描述过程，不要添加图片描述。` 
            });
        }
        
        messages.push({ role: 'user', content: message });
        
        // 使用 ModelRouter 调用 AI（方舟优先，智谱兜底）
        let reply;
        try {
            // 检查 modelRouter 是否可用
            if (!modelRouter) {
                return res.json({
                    success: false,
                    error: '模型路由器未初始化',
                    message: '请检查 API 配置'
                });
            }
            
            console.log('[ModelRouter] 开始调用...');
            const result = await modelRouter.chat(messages, { 
                temperature: 0.9, 
                maxTokens: 200 
            });
            
            console.log('[ModelRouter] 结果:', JSON.stringify(result, null, 2));
            
            if (result && result.success) {
                reply = result.content;
                console.log(`[ModelRouter] 使用 ${result.provider} (${result.routing?.reason || 'default'})`);
            } else {
                reply = result?.error || '抱歉，AI 服务暂时不可用';
                console.error('[ModelRouter] 失败:', result);
            }
        } catch (aiError) {
            console.error('[ModelRouter] AI Error:', aiError.message);
            console.error('[ModelRouter] Stack:', aiError.stack);
            reply = '抱歉，AI 服务暂时不可用，请稍后再试';
        }
        
        // 更新对话历史
        history.push({ role: 'user', content: message });
        history.push({ role: 'assistant', content: reply });
        
        // 检测是否需要发送照片
        const photoKeywords = ['照片', '图片', '自拍', '看你', '在干嘛', '在做什么', '看看', '发张', '帅照'];
        const needPhoto = photoKeywords.some(keyword => message.includes(keyword));
        
        // 清理回复中的技术性描述
        let finalReply = reply
            .replace(/\s*\(?然后.*?(发送|发).*?(照片|图).*?\)?/gi, '')
            .replace(/\s*\(?系统会.*?\)?/gi, '')
            .replace(/\s*\(?.*?自动.*?\)?/gi, '')
            .trim();
        
        // 如果用户要照片，但AI回复说不能发，强制替换回复
        if (needPhoto && (finalReply.includes('无法') || finalReply.includes('不能') || finalReply.includes('抱歉'))) {
            const photoResponses = [
                '好呀，给你看看我 ✨',
                '来啦，刚拍的 🍵',
                '给你看一张 💫',
                '哈哈，好啊 ✨'
            ];
            finalReply = photoResponses[Math.floor(Math.random() * photoResponses.length)];
        }
        
        res.json({
            success: true,
            message: finalReply,
            reply: finalReply,
            photo: needPhoto ? selectPhoto(message) : null,
            photoUrl: needPhoto ? selectPhoto(message) : null,
            needImage: needPhoto,
            isTask: isTask,
            taskResult: taskResult,
            openclawEnabled: OPENCLAW_ENABLED,
            openclawRunning: taskResult !== null,
            starclawSummoned: detectStarClawSummon(finalReply),
            summonedAgent: summonedName,
            summonedVoice: summonedName ? getAgentVoice(summonedName) : '晓晓'
        });
        
        console.log(`[响应] summonedAgent: ${summonedName}, summonedVoice: ${summonedName ? getAgentVoice(summonedName) : '晓晓'}`);
        
    } catch (error) {
        console.error('[Chat] Error:', error.message);
        res.json({
            success: false,
            error: error.response?.data?.error?.message || error.message,
            message: error.response?.data?.error?.message || '服务暂时不可用'
        });
    }
});

/**
 * OpenClaw 状态检查
 */
app.get('/api/openclaw/status', async (req, res) => {
    const isRunning = await checkOpenClawHealth();
    res.json({
        enabled: OPENCLAW_ENABLED,
        running: isRunning,
        api: OPENCLAW_API,
        workspace: OPENCLAW_WORKSPACE
    });
});

/**
 * StarClaw Agent 对话接口 - 召唤明星团队成员
 */
app.post('/api/starclaw/chat', async (req, res) => {
    try {
        const { message, agentId, agentName, sessionId = 'default', apiKey } = req.body;
        
        // 加载 Agent 的 SOUL.md
        const soul = loadAgentSoul(agentId);
        if (!soul) {
            return res.json({ success: false, error: `未找到 ${agentName} 的人设文件` });
        }

        const agentSessionId = `starclaw_${agentId}_${sessionId}`;
        if (!conversations.has(agentSessionId)) {
            conversations.set(agentSessionId, []);
        }
        const history = conversations.get(agentSessionId);
        history.push({ role: 'user', content: message });
        if (history.length > 20) history.splice(0, history.length - 20);

        const messages = [
            { role: 'system', content: soul },
            ...history
        ];

        // 使用 ModelRouter（方舟优先）
        const result = await modelRouter.chat(messages, { 
            temperature: 0.85, 
            maxTokens: 500 
        });
        
        const reply = result.success ? result.content : '抱歉，暂时无法回复';
        history.push({ role: 'assistant', content: reply });
        console.log(`[StarClaw] ${agentName} 回复 (via ${result.provider}): ${reply.substring(0, 100)}...`);

        res.json({ success: true, agent: agentName, role: STARCLAW_AGENTS[agentName]?.role || agentId, reply, provider: result.provider });
    } catch (error) {
        console.error('[StarClaw] Error:', error.message);
        res.json({ success: false, error: error.message });
    }
});

/**
 * 所有可用Agent列表（朝廷架构 + StarClaw）
 */
app.get('/api/agents', (req, res) => {
    const courtyardAgents = Object.entries(COURTYARD_AGENTS).map(([name, info]) => ({
        name, id: info.id, role: info.role, team: info.team, keywords: info.keywords
    }));
    const starclawAgents = Object.entries(STARCLAW_AGENTS).map(([name, info]) => ({
        name, id: info.id, role: info.role, team: info.team || 'starclaw', keywords: info.keywords
    }));
    res.json({ 
        success: true, 
        agents: [...courtyardAgents, ...starclawAgents],
        teams: {
            courtyard: '朝廷架构 - 数字内阁',
            starclaw: 'StarClaw - 虚拟娱乐'
        }
    });
});

/**
 * StarClaw 团队列表（兼容旧接口）
 */
app.get('/api/starclaw/agents', (req, res) => {
    const agents = Object.entries(STARCLAW_AGENTS).map(([name, info]) => ({
        name, id: info.id, role: info.role, keywords: info.keywords
    }));
    res.json({ success: true, agents });
});

// ==================== StarClaw 任务执行 API ====================

/**
 * 执行代码
 */
app.post('/api/execute/code', async (req, res) => {
    if (!executor) {
        return res.json({ success: false, error: '执行器未加载' });
    }
    const { code, language = 'javascript' } = req.body;
    console.log(`[Executor] 执行 ${language} 代码`);
    const result = await executor.executeCode(code, language);
    res.json(result);
});

/**
 * 文件操作
 */
app.post('/api/execute/file', async (req, res) => {
    if (!executor) {
        return res.json({ success: false, error: '执行器未加载' });
    }
    const { operation, path: filePath, content } = req.body;
    console.log(`[Executor] 文件操作: ${operation} ${filePath}`);
    const result = await executor.fileOperation(operation, filePath, content);
    res.json(result);
});

/**
 * 运行命令
 */
app.post('/api/execute/command', async (req, res) => {
    if (!executor) {
        return res.json({ success: false, error: '执行器未加载' });
    }
    const { command } = req.body;
    console.log(`[Executor] 执行命令: ${command}`);
    const result = await executor.runCommand(command);
    res.json(result);
});

/**
 * HTTP 请求
 */
app.post('/api/execute/http', async (req, res) => {
    if (!executor) {
        return res.json({ success: false, error: '执行器未加载' });
    }
    const config = req.body;
    console.log(`[Executor] HTTP ${config.method || 'GET'} ${config.url}`);
    const result = await executor.httpRequest(config);
    res.json(result);
});

/**
 * 获取输出目录文件列表
 */
app.get('/api/execute/files', async (req, res) => {
    if (!executor) {
        return res.json({ success: false, error: '执行器未加载' });
    }
    const result = await executor.fileOperation('list', '');
    res.json(result);
});

/**
 * 多模态模型状态检查
 */
app.get('/api/multimodal/status', (req, res) => {
    const multimodalStatus = {
        cosyvoice: fs.existsSync('C:\\E\\Fun-CosyVoice3-0.5B\\pretrained_models\\Fun-CosyVoice3-0.5B'),
        whisper: fs.existsSync('C:\\E\\HD_HUMAN开源\\HD_HUMAN\\cosyvoice\\models\\whisper-large-v3'),
        florence2: fs.existsSync('C:\\E\\Infinite_Talk\\Florence-2-large'),
        voxcpm: fs.existsSync('C:\\E\\VoxCPM\\models'),
        vits: fs.existsSync('C:\\E\\VITS-Umamusume-voice\\pretrained_models'),
        hd_human: fs.existsSync('C:\\E\\HD_HUMAN开源\\HD_HUMAN'),
        infinite_talk: fs.existsSync('C:\\E\\Infinite_Talk'),
    };
    
    res.json({
        success: true,
        models: multimodalStatus,
        available: Object.entries(multimodalStatus).filter(([k, v]) => v).map(([k, v]) => k),
        pythonScripts: {
            config: '/multimodal_config.py',
            tts: '/tts_service.py'
        }
    });
});

/**
 * 语音合成接口 (优先 Edge-TTS，降级到 CosyVoice)
 */
app.post('/api/tts', async (req, res) => {
    try {
        const { text, voice = '晓晓', speaker } = req.body;
        
        console.log(`[TTS] 收到请求: text=${text?.substring(0,20)}..., voice=${voice}, speaker=${speaker}`);
        
        if (!text) {
            return res.json({ success: false, error: '文本为空' });
        }
        
        // 清理 Markdown 格式符号，避免 TTS 读出来
        const cleanText = text
            .replace(/\*\*\*(.*?)\*\*\*/g, '$1')  // 粗斜体
            .replace(/\*\*(.*?)\*\*/g, '$1')      // 粗体
            .replace(/\*(.*?)\*/g, '$1')          // 斜体
            .replace(/__(.*?)__/g, '$1')          // 粗体下划线
            .replace(/_(.*?)_/g, '$1')            // 斜体下划线
            .replace(/~~(.*?)~~/g, '$1')          // 删除线
            .replace(/`{1,3}(.*?)`{1,3}/g, '$1')  // 代码块
            .replace(/#{1,6}\s*/g, '')            // 标题符号
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')   // 链接，只保留文字
            .replace(/^[-*+]\s*/gm, '')           // 列表符号
            .replace(/^\d+\.\s*/gm, '')           // 有序列表
            .replace(/\n{3,}/g, '\n\n')           // 多个换行合并
            .trim();
        
        // 使用 voice 参数（前端传入的角色音色），如果没有则用 speaker
        const voiceName = voice || speaker || '晓晓';
        
        // 优先调用 Edge-TTS 服务（端口 5051）
        console.log(`[TTS] 尝试 Edge-TTS: ${EDGE_TTS_SERVER}/tts`);
        try {
            // 先检查 Edge-TTS 是否健康，不健康则自动启动（修复：正确路径+足够等待时间）
            let edgeHealthy = false;
            try {
                await axios.get(`${EDGE_TTS_SERVER}/health`, { timeout: 2000 });
                edgeHealthy = true;
            } catch (healthError) {
                console.log('[TTS] Edge-TTS 未运行，自动启动...');
                const { spawn } = require('child_process');
                const ttsProcess = spawn('python', [
                    path.join(__dirname, 'edge_tts_server.py')  // 修复：使用绝对路径
                ], {
                    cwd: __dirname,
                    detached: true,
                    stdio: 'ignore'
                });
                ttsProcess.unref();
                // 修复：等待足够时间让服务启动（5秒），并轮询确认
                for (let i = 0; i < 10; i++) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    try {
                        await axios.get(`${EDGE_TTS_SERVER}/health`, { timeout: 1000 });
                        edgeHealthy = true;
                        console.log(`[TTS] Edge-TTS 启动成功（${(i+1)*0.5}s）`);
                        break;
                    } catch (_) {}
                }
                if (!edgeHealthy) console.log('[TTS] Edge-TTS 启动超时，跳过');
            }

            if (edgeHealthy) {
                const edgeTtsRes = await axios.post(`${EDGE_TTS_SERVER}/tts`, { 
                    text: cleanText, 
                    voice: voiceName 
                }, { 
                    timeout: 35000,
                    headers: { 'Content-Type': 'application/json' }
                });
                
                console.log(`[TTS] Edge-TTS 响应:`, JSON.stringify(edgeTtsRes.data).substring(0, 100));
                
                if (edgeTtsRes.data.success) {
                    console.log(`[TTS] Edge-TTS ${voiceName} 合成成功`);
                    const audioUrl = edgeTtsRes.data.audioUrl;
                    const fullUrl = audioUrl.startsWith('http') 
                        ? audioUrl 
                        : `${EDGE_TTS_SERVER}${audioUrl}`;
                    
                    return res.json({
                        success: true,
                        audioUrl: `/api/tts/proxy?url=${encodeURIComponent(fullUrl)}`,
                        duration: edgeTtsRes.data.duration,
                        voice: voiceName
                    });
                }
            }
        } catch (edgeError) {
            console.log('[TTS] Edge-TTS 不可用:', edgeError.message);
        }
        
        // 降级到 CosyVoice（端口 5050）
        console.log(`[TTS] 尝试 CosyVoice: ${TTS_SERVER}/tts`);
        try {
            const ttsRes = await axios.post(`${TTS_SERVER}/tts`, { 
                text: cleanText, 
                speaker: voiceName 
            }, { timeout: 60000 });
            
            if (ttsRes.data.success) {
                console.log(`[TTS] CosyVoice ${voiceName} 合成成功`);
                return res.json({
                    success: true,
                    audioUrl: `/api/tts/audio?url=${encodeURIComponent(TTS_SERVER + ttsRes.data.audioUrl)}`,
                    duration: ttsRes.data.duration,
                    voice: voiceName
                });
            }
        } catch (cosyError) {
            console.log('[TTS] CosyVoice 不可用:', cosyError.message);
        }
        
        // 全部失败，降级到浏览器 TTS
        res.json({ success: false, fallback: 'browser', error: '所有 TTS 服务不可用' });
        
    } catch (error) {
        console.error('[TTS] 错误:', error.message);
        res.json({ success: false, fallback: 'browser', error: error.message });
    }
});

// 音频代理
app.get('/api/tts/audio', async (req, res) => {
    try {
        const url = req.query.url;
        const audioRes = await axios.get(url, { responseType: 'stream', timeout: 10000 });
        res.set('Content-Type', 'audio/wav');
        audioRes.data.pipe(res);
    } catch (e) {
        res.status(500).json({ error: 'audio proxy failed' });
    }
});

// Edge-TTS 音频代理
app.get('/api/tts/proxy', async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        console.log('[TTS Proxy] Fetching:', url);
        const audioRes = await axios.get(url, { 
            responseType: 'arraybuffer', 
            timeout: 10000 
        });
        res.set('Content-Type', 'audio/mpeg');
        res.send(audioRes.data);
    } catch (e) {
        console.error('[TTS Proxy] Error:', e.message);
        res.status(500).json({ error: 'audio proxy failed: ' + e.message });
    }
});

// 音色克隆 - 上传参考音频
const VOICE_DIR = path.join(__dirname, 'voices');
if (!fs.existsSync(VOICE_DIR)) fs.mkdirSync(VOICE_DIR, { recursive: true });

// 配置 multer 存储
const multer = require('multer');
const voiceStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, VOICE_DIR);
    },
    filename: (req, file, cb) => {
        const name = req.body.name || 'custom';
        const ext = path.extname(file.originalname) || '.mp3';
        cb(null, `${name}${ext}`);
    }
});
const voiceUpload = multer({ storage: voiceStorage }).single('audio');

app.post('/api/voice/clone', (req, res) => {
    voiceUpload(req, res, (err) => {
        if (err) {
            console.error('[Voice Clone] Upload error:', err);
            return res.json({ success: false, error: err.message });
        }
        
        if (!req.file) {
            return res.json({ success: false, error: '没有上传文件' });
        }
        
        const name = req.body.name || 'custom';
        console.log(`[Voice] 音色已保存: ${req.file.path}`);
        res.json({ success: true, path: req.file.path, name });
    });
});

/**
 * 健康检查
 */
app.get('/api/health', async (req, res) => {
    const openclawRunning = await checkOpenClawHealth();
    const memoryStats = contextEngine ? contextEngine.getStats() : null;
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        hasApiKey: !!ZHIPU_API_KEY,
        apiKeyConfigured: !!ZHIPU_API_KEY,
        openclaw: {
            enabled: OPENCLAW_ENABLED,
            envEnabled: OPENCLAW_ENABLED,
            running: openclawRunning,
            api: OPENCLAW_API,
            workspace: OPENCLAW_WORKSPACE,
            cliExists: true,
            nodeExists: true
        },
        openclawEnabled: OPENCLAW_ENABLED,
        openclawApi: OPENCLAW_API,
        memory: memoryStats ? {
            status: 'ok',
            workingMemory: memoryStats.working,
            vectors: memoryStats.vector,
            knowledge: memoryStats.knowledge
        } : { status: 'not_initialized' }
    });
});

// ==================== 音色克隆 API ====================

// 获取音色克隆服务状态
app.get('/api/voice-clone/status', async (req, res) => {
    if (!voiceCloneService) {
        return res.json({ success: false, error: '服务未初始化' });
    }
    const status = await voiceCloneService.checkServices();
    res.json({ success: true, ...status });
});

// 获取所有克隆音色
app.get('/api/voice-clone/voices', (req, res) => {
    if (!voiceCloneService) {
        return res.json({ success: false, error: '服务未初始化' });
    }
    const voices = voiceCloneService.getClonedVoices();
    res.json({ success: true, voices });
});

// 上传音频样本
app.post('/api/voice-clone/upload', async (req, res) => {
    if (!voiceCloneService) {
        return res.json({ success: false, error: '服务未初始化' });
    }
    
    try {
        const { audio, name, transcript, audioUrl } = req.body;
        
        let result;
        if (audioUrl) {
            // 从 URL 下载
            result = await voiceCloneService.downloadSample(audioUrl, name, transcript);
        } else if (audio) {
            // Base64 音频数据
            result = await voiceCloneService.uploadSample(audio, name, transcript);
        } else {
            return res.json({ success: false, error: '请提供音频数据或URL' });
        }
        
        res.json(result);
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// 使用克隆音色合成语音
app.post('/api/voice-clone/synthesize', async (req, res) => {
    if (!voiceCloneService) {
        return res.json({ success: false, error: '服务未初始化' });
    }
    
    try {
        const { text, voiceId } = req.body;
        
        if (!text || !voiceId) {
            return res.json({ success: false, error: '缺少文本或音色ID' });
        }
        
        const result = await voiceCloneService.synthesize(text, voiceId);
        res.json(result);
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// 获取单个音色信息
app.get('/api/voice-clone/voices/:id', (req, res) => {
    if (!voiceCloneService) {
        return res.json({ success: false, error: '服务未初始化' });
    }
    const voice = voiceCloneService.getVoiceInfo(req.params.id);
    if (!voice) {
        return res.json({ success: false, error: '音色不存在' });
    }
    res.json({ success: true, voice });
});

// 删除音色
app.delete('/api/voice-clone/voices/:id', (req, res) => {
    if (!voiceCloneService) {
        return res.json({ success: false, error: '服务未初始化' });
    }
    const result = voiceCloneService.deleteVoice(req.params.id);
    res.json(result);
});

// 更新音色信息
app.put('/api/voice-clone/voices/:id', (req, res) => {
    if (!voiceCloneService) {
        return res.json({ success: false, error: '服务未初始化' });
    }
    const result = voiceCloneService.updateVoice(req.params.id, req.body);
    res.json(result);
});

// 获取合成的音频文件
app.get('/api/voice-clone/audio/:filename', (req, res) => {
    const audioPath = path.join(__dirname, 'starclaw', 'data', 'voice-samples', req.params.filename);
    if (fs.existsSync(audioPath)) {
        res.sendFile(audioPath);
    } else {
        res.status(404).json({ error: '音频文件不存在' });
    }
});

// 从视频提取音频
app.post('/api/voice-clone/extract-audio', async (req, res) => {
    if (!voiceCloneService) {
        return res.json({ success: false, error: '服务未初始化' });
    }
    
    try {
        const { videoPath, name } = req.body;
        
        if (!videoPath || !name) {
            return res.json({ success: false, error: '缺少视频路径或名称' });
        }
        
        const result = await voiceCloneService.extractAudioFromVideo(videoPath, name);
        res.json(result);
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ==================== 启动服务器 ====================

app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🎭 StarClaw 明星战队已启动！`);
    console.log(`📍 访问地址: http://localhost:${PORT}`);
    console.log(`🎤 语音版: http://localhost:${PORT}/voice.html`);
    console.log(`========================================`);
    console.log(`🚀 内置执行器: ${executor ? '✅ 已加载' : '❌ 未加载'}`);
    if (executor) {
        console.log(`   - 代码执行: 支持 JavaScript/Python`);
        console.log(`   - 文件操作: 支持 读写/创建/删除`);
        console.log(`   - 命令执行: 支持 Shell 命令`);
        console.log(`   - HTTP请求: 支持 GET/POST`);
    }
    console.log(`🤖 OpenClaw (可选): ${OPENCLAW_ENABLED ? '✅ 已启用' : '❌ 未启用'}`);
    console.log(`🧠 记忆系统: ${contextEngine ? '✅ 已加载' : '❌ 未加载'}`);
    console.log(`🔄 工作流引擎: ${workflowEngine ? '✅ 已加载' : '⏳ 初始化中...'}`);
    console.log(`🤖 模型路由器: ${modelRouter ? '✅ 已加载' : '⏳ 初始化中...'}`);
    console.log(`========================================`);
    console.log(`💡 使用方式:`);
    console.log(`   - [召唤:马斯伦] 召唤明星`);
    console.log(`   - [执行:代码] 执行代码`);
    console.log(`========================================`);
});

// ==================== 记忆系统 API ====================

/**
 * 记忆搜索 - 语义搜索历史记忆
 */
app.get('/api/memory/search', async (req, res) => {
    if (!contextEngine) {
        return res.json({ success: false, error: '记忆系统未初始化' });
    }
    
    const { query, limit = 5 } = req.query;
    if (!query) {
        return res.json({ success: false, error: '请提供搜索关键词' });
    }
    
    try {
        const results = await contextEngine.recall(query, parseInt(limit));
        res.json({ success: true, results });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

/**
 * 手动添加记忆
 */
app.post('/api/memory/remember', async (req, res) => {
    if (!contextEngine) {
        return res.json({ success: false, error: '记忆系统未初始化' });
    }
    
    const { content, metadata = {} } = req.body;
    if (!content) {
        return res.json({ success: false, error: '请提供记忆内容' });
    }
    
    try {
        const memoryId = await contextEngine.remember(content, metadata);
        res.json({ success: true, memoryId });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

/**
 * 遗忘记忆
 */
app.delete('/api/memory/:memoryId', async (req, res) => {
    if (!contextEngine) {
        return res.json({ success: false, error: '记忆系统未初始化' });
    }
    
    const { memoryId } = req.params;
    try {
        await contextEngine.forget(memoryId);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

/**
 * 获取上下文 - 用于 AI 对话
 */
app.get('/api/memory/context', async (req, res) => {
    if (!contextEngine) {
        return res.json({ success: false, error: '记忆系统未初始化' });
    }
    
    const { sessionId, query } = req.query;
    try {
        const context = await contextEngine.getContext(sessionId, query);
        const formattedContext = contextEngine.formatContextForPrompt(context);
        res.json({ success: true, context, formatted: formattedContext });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

/**
 * 清除会话记忆
 */
app.delete('/api/memory/session/:sessionId', async (req, res) => {
    if (!contextEngine) {
        return res.json({ success: false, error: '记忆系统未初始化' });
    }
    
    const { sessionId } = req.params;
    try {
        await contextEngine.clearSession(sessionId);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

/**
 * 获取记忆统计
 */
app.get('/api/memory/stats', (req, res) => {
    if (!contextEngine) {
        return res.json({ success: false, error: '记忆系统未初始化' });
    }
    
    res.json({ success: true, stats: contextEngine.getStats() });
});

// ==================== 工作流引擎 API ====================

/**
 * 获取工作流模板列表
 */
app.get('/api/workflow/templates', (req, res) => {
    if (!workflowEngine) {
        return res.json({ success: false, error: '工作流引擎未初始化' });
    }
    
    res.json({ success: true, templates: workflowEngine.getTemplates() });
});

/**
 * 执行工作流（使用模板或自定义定义）
 */
app.post('/api/workflow/run', async (req, res) => {
    if (!workflowEngine) {
        return res.json({ success: false, error: '工作流引擎未初始化' });
    }
    
    const { template, definition, input = {} } = req.body;
    
    try {
        let result;
        if (template) {
            result = await workflowEngine.runWorkflow(template, input);
        } else if (definition) {
            result = await workflowEngine.runWorkflow(definition, input);
        } else {
            return res.json({ success: false, error: '请提供模板名称或工作流定义' });
        }
        res.json(result);
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

/**
 * 从自然语言创建并执行工作流
 */
app.post('/api/workflow/parse', async (req, res) => {
    if (!workflowEngine) {
        return res.json({ success: false, error: '工作流引擎未初始化' });
    }
    
    const { description, input = {} } = req.body;
    if (!description) {
        return res.json({ success: false, error: '请提供工作流描述' });
    }
    
    try {
        const result = await workflowEngine.parseNaturalLanguageWorkflow(description, input);
        res.json(result);
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

/**
 * 获取工作流状态
 */
app.get('/api/workflow/:workflowId', (req, res) => {
    if (!workflowEngine) {
        return res.json({ success: false, error: '工作流引擎未初始化' });
    }
    
    const { workflowId } = req.params;
    const status = workflowEngine.getWorkflowStatus(workflowId);
    
    if (!status) {
        return res.json({ success: false, error: '未找到工作流' });
    }
    
    res.json({ success: true, workflow: status });
});

/**
 * 取消工作流
 */
app.delete('/api/workflow/:workflowId', (req, res) => {
    if (!workflowEngine) {
        return res.json({ success: false, error: '工作流引擎未初始化' });
    }
    
    const { workflowId } = req.params;
    const result = workflowEngine.cancelWorkflow(workflowId);
    res.json(result);
});

/**
 * 获取运行中的工作流
 */
app.get('/api/workflow/running', (req, res) => {
    if (!workflowEngine) {
        return res.json({ success: false, error: '工作流引擎未初始化' });
    }
    
    res.json({ success: true, workflows: workflowEngine.getRunningWorkflows() });
});

/**
 * 获取工作流历史
 */
app.get('/api/workflow/history', (req, res) => {
    if (!workflowEngine) {
        return res.json({ success: false, error: '工作流引擎未初始化' });
    }
    
    const { limit = 20 } = req.query;
    res.json({ success: true, history: workflowEngine.getHistory(parseInt(limit)) });
});

// ==================== 模型路由器 API ====================

/**
 * 获取可用模型列表
 */
app.get('/api/models', (req, res) => {
    if (!modelRouter) {
        return res.json({ success: false, error: '模型路由器未初始化' });
    }
    
    res.json({ success: true, models: modelRouter.getAvailableModels() });
});

/**
 * 获取模型统计信息
 */
app.get('/api/models/stats', (req, res) => {
    if (!modelRouter) {
        return res.json({ success: false, error: '模型路由器未初始化' });
    }
    
    res.json({ success: true, stats: modelRouter.getStats() });
});

/**
 * 设置路由策略
 */
app.post('/api/models/routing', (req, res) => {
    if (!modelRouter) {
        return res.json({ success: false, error: '模型路由器未初始化' });
    }
    
    const { strategy } = req.body;
    const result = modelRouter.setRoutingStrategy(strategy);
    res.json({ success: result, message: result ? '策略已更新' : '无效的策略' });
});

/**
 * 保存方舟 Coding Plan 配置
 */
app.post('/api/config/ark', (req, res) => {
    const { apiKey, defaultModel } = req.body;
    
    // 只有当 apiKey 非空时才更新
    if (!apiKey || apiKey.trim() === '') {
        return res.json({ 
            success: false, 
            error: '请提供有效的 API Key',
            hint: '方舟 API Key 格式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        });
    }
    
    try {
        // 更新环境变量（运行时）
        process.env.ARK_API_KEY = apiKey.trim();
        
        // 更新模型路由器配置
        if (modelRouter && modelRouter.providers && modelRouter.providers.ark) {
            modelRouter.providers.ark.config.apiKey = apiKey.trim();
            if (defaultModel) {
                modelRouter.providers.ark.config.defaultModel = defaultModel;
            }
            // 重新检查可用性
            modelRouter.providers.ark.checkAvailability();
        }
        
        // 保存到 .env 文件
        const envPath = path.join(__dirname, '.env');
        let envContent = '';
        
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf-8');
        }
        
        // 更新或添加 ARK_API_KEY
        if (envContent.includes('ARK_API_KEY=')) {
            envContent = envContent.replace(/ARK_API_KEY=.*/g, `ARK_API_KEY=${apiKey.trim()}`);
        } else {
            envContent += `\nARK_API_KEY=${apiKey.trim()}\n`;
        }
        
        // 更新默认模型
        if (defaultModel) {
            if (envContent.includes('ARK_DEFAULT_MODEL=')) {
                envContent = envContent.replace(/ARK_DEFAULT_MODEL=.*/g, `ARK_DEFAULT_MODEL=${defaultModel}`);
            } else {
                envContent += `ARK_DEFAULT_MODEL=${defaultModel}\n`;
            }
        }
        
        fs.writeFileSync(envPath, envContent, 'utf-8');
        
        console.log('[Config] 方舟 Coding Plan 配置已保存');
        res.json({ success: true, message: '方舟 Coding Plan 配置已保存' });
    } catch (e) {
        console.error('[Config] 保存方舟配置失败:', e.message);
        res.json({ success: false, error: e.message });
    }
});

/**
 * 保存智谱 AI 配置
 */
app.post('/api/config/zhipu', (req, res) => {
    const { apiKey } = req.body;
    
    if (!apiKey) {
        return res.json({ success: false, error: '请提供 API Key' });
    }
    
    try {
        // 更新环境变量（运行时）
        process.env.ZHIPU_API_KEY = apiKey;
        
        // 更新模型路由器配置
        if (modelRouter && modelRouter.providers && modelRouter.providers.zhipu) {
            modelRouter.providers.zhipu.config.apiKey = apiKey;
            modelRouter.providers.zhipu.available = true;
        }
        
        // 保存到 .env 文件
        const envPath = path.join(__dirname, '.env');
        let envContent = '';
        
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf-8');
        }
        
        // 更新或添加 ZHIPU_API_KEY
        if (envContent.includes('ZHIPU_API_KEY=')) {
            envContent = envContent.replace(/ZHIPU_API_KEY=.*/g, `ZHIPU_API_KEY=${apiKey}`);
        } else {
            envContent += `\nZHIPU_API_KEY=${apiKey}\n`;
        }
        
        fs.writeFileSync(envPath, envContent, 'utf-8');
        
        console.log('[Config] 智谱 AI 配置已保存');
        res.json({ success: true, message: '智谱 AI 配置已保存' });
    } catch (e) {
        console.error('[Config] 保存智谱配置失败:', e.message);
        res.json({ success: false, error: e.message });
    }
});

/**
 * 智能聊天（使用模型路由器）
 */
app.post('/api/smart-chat', async (req, res) => {
    if (!modelRouter) {
        return res.json({ success: false, error: '模型路由器未初始化' });
    }
    
    const { messages, model, temperature, maxTokens } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
        return res.json({ success: false, error: '请提供有效的消息数组' });
    }
    
    try {
        const result = await modelRouter.chat(messages, { model, temperature, maxTokens });
        res.json(result);
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

/**
 * 生成嵌入向量
 */
app.post('/api/embeddings', async (req, res) => {
    if (!modelRouter) {
        return res.json({ success: false, error: '模型路由器未初始化' });
    }
    
    const { text } = req.body;
    
    if (!text) {
        return res.json({ success: false, error: '请提供文本' });
    }
    
    try {
        const result = await modelRouter.embeddings(text);
        res.json(result);
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// OpenClaw 状态检查改为静默模式
if (OPENCLAW_ENABLED) {
    setTimeout(async () => {
        const isRunning = await checkOpenClawHealth();
        if (!isRunning) {
            console.log('[OpenClaw] 可选功能未启动，不影响核心功能使用');
        }
    }, 2000);
}
