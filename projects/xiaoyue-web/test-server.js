// 测试服务器的 chat API
require('dotenv').config();

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const ZHIPU_API_BASE = 'https://open.bigmodel.cn/api/paas/v4';

console.log('=== 环境检查 ===');
console.log('ARK_API_KEY:', process.env.ARK_API_KEY ? '已设置' : '未设置');
console.log('ZHIPU_API_KEY:', ZHIPU_API_KEY ? '已设置' : '未设置');

async function testServer() {
    // 初始化 ModelRouter
    const { ModelRouter } = require('./starclaw/models/ModelRouter');
    const modelRouter = new ModelRouter({
        ollama: { enabled: true, baseUrl: 'http://127.0.0.1:11434' },
        lmstudio: { enabled: true, baseUrl: 'http://127.0.0.1:1234/v1' },
        ark: {
            apiKey: process.env.ARK_API_KEY,
            baseUrl: 'https://ark.cn-beijing.volces.com/api/coding/v3',
            defaultModel: process.env.ARK_DEFAULT_MODEL || 'ark-code-latest',
            enabled: true,
            timeout: 60000
        },
        zhipu: { apiKey: ZHIPU_API_KEY, baseUrl: ZHIPU_API_BASE },
        routing: { defaultRouting: 'auto', fallbackToCloud: true }
    });

    await modelRouter.initialize();
    console.log('\n=== 开始对话测试 ===');

    const messages = [
        { role: 'system', content: '你是小易，一个温暖的AI助手。' },
        { role: 'user', content: '你好' }
    ];

    console.log('[ModelRouter] 开始调用...');
    const result = await modelRouter.chat(messages, {
        temperature: 0.9,
        maxTokens: 200
    });

    console.log('[ModelRouter] 结果:', JSON.stringify(result, null, 2));

    if (result && result.success) {
        console.log('\n✅ 成功! 回复:', result.content);
    } else {
        console.log('\n❌ 失败:', result?.error);
    }
}

testServer().catch(e => {
    console.error('错误:', e.message);
    console.error('堆栈:', e.stack);
});
