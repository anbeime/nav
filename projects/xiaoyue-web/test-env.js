// 测试环境变量加载
require('dotenv').config();

console.log('=== 环境变量检查 ===');
console.log('ARK_API_KEY:', process.env.ARK_API_KEY ? process.env.ARK_API_KEY.substring(0, 8) + '...' : '未设置');
console.log('ZHIPU_API_KEY:', process.env.ZHIPU_API_KEY ? process.env.ZHIPU_API_KEY.substring(0, 8) + '...' : '未设置');
console.log('PORT:', process.env.PORT);
console.log('');

// 测试 ModelRouter
async function testModelRouter() {
    console.log('=== 测试 ModelRouter ===');
    const { ModelRouter } = require('./starclaw/models/ModelRouter');
    
    const router = new ModelRouter({
        ark: {
            apiKey: process.env.ARK_API_KEY,
            baseUrl: 'https://ark.cn-beijing.volces.com/api/coding/v3',
            defaultModel: 'ark-code-latest',
            timeout: 60000,
            enabled: true
        },
        zhipu: {
            apiKey: process.env.ZHIPU_API_KEY,
            baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
            defaultModel: 'glm-4-flash',
            timeout: 30000
        }
    });
    
    await router.initialize();
    
    console.log('\n=== 发送测试消息 ===');
    const result = await router.chat([
        { role: 'user', content: '你好' }
    ], { temperature: 0.7, maxTokens: 100 });
    
    console.log('结果:', JSON.stringify(result, null, 2));
}

testModelRouter().catch(e => console.error('错误:', e));
