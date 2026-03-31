// 直接测试方舟 API
const axios = require('axios');

const ARK_API_KEY = '7b00c8c1-c418-4277-9c9d-5dd6351d6cc5';
const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/coding/v3';

async function testArk() {
    console.log('测试方舟 API...');
    console.log('API Key:', ARK_API_KEY.substring(0, 8) + '...');
    console.log('Base URL:', ARK_BASE_URL);
    
    try {
        const response = await axios.post(
            `${ARK_BASE_URL}/chat/completions`,
            {
                model: 'ark-code-latest',
                messages: [{ role: 'user', content: '你好' }],
                temperature: 0.7,
                max_tokens: 100
            },
            {
                headers: {
                    'Authorization': `Bearer ${ARK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        console.log('\n✅ 方舟 API 调用成功!');
        console.log('模型:', response.data.model);
        console.log('回复:', response.data.choices[0]?.message?.content);
        console.log('Usage:', response.data.usage);
    } catch (error) {
        console.log('\n❌ 方舟 API 调用失败');
        console.log('错误:', error.message);
        if (error.response) {
            console.log('状态码:', error.response.status);
            console.log('响应:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testArk();
