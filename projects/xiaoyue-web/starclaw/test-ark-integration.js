/**
 * 方舟 Coding Plan 集成测试
 * 验证配置是否正确加载，并测试 API 调用
 */

const path = require('path');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 导入模型路由器
const { ModelRouter, ArkProvider } = require('./models/ModelRouter');

async function testArkIntegration() {
    console.log('========================================');
    console.log('方舟 Coding Plan 集成测试');
    console.log('========================================\n');

    // 1. 检查环境变量
    console.log('1. 环境变量检查:');
    console.log(`   ARK_API_KEY: ${process.env.ARK_API_KEY ? '已配置 ✅' : '未配置 ❌'}`);
    console.log(`   ZHIPU_API_KEY: ${process.env.ZHIPU_API_KEY ? '已配置 ✅ (兜底)' : '未配置 ❌'}`);
    console.log('');

    // 2. 初始化模型路由器
    console.log('2. 初始化模型路由器...');
    const router = new ModelRouter();
    await router.initialize();
    console.log('');

    // 3. 检查提供商状态
    console.log('3. 提供商状态:');
    const stats = router.getStats();
    Object.entries(stats.providers).forEach(([name, available]) => {
        const priority = name === 'ark' ? ' (优先)' : name === 'zhipu' ? ' (兜底)' : '';
        console.log(`   ${name}: ${available ? '✅ 可用' : '❌ 不可用'}${priority}`);
    });
    console.log('');

    // 4. 获取可用模型列表
    console.log('4. 可用模型列表:');
    const models = router.getAvailableModels();
    models.forEach(m => {
        const priority = m.provider === 'ark' ? ' ⭐优先' : '';
        console.log(`   - ${m.name} (${m.provider})${priority}`);
    });
    console.log('');

    // 5. 测试路由决策
    console.log('5. 路由决策测试:');
    const testCases = [
        { messages: [{ role: 'user', content: '帮我写一个排序算法' }], taskType: 'code' },
        { messages: [{ role: 'user', content: '分析这个问题的原因' }], taskType: 'analysis' },
        { messages: [{ role: 'user', content: '你好，今天天气怎么样' }], taskType: 'chat' }
    ];

    testCases.forEach(({ messages, taskType }) => {
        const analysis = router.analyzeTask(messages);
        const selection = router.selectModel(analysis);
        console.log(`   任务[${taskType}]: ${selection.provider}:${selection.model || 'default'} - ${selection.reason}`);
    });
    console.log('');

    // 6. 测试 API 调用（如果方舟可用）
    if (stats.providers.ark) {
        console.log('6. 测试方舟 API 调用...');
        try {
            const result = await router.chat([
                { role: 'user', content: '请用一句话介绍自己' }
            ]);
            
            if (result.success) {
                console.log('   ✅ 调用成功');
                console.log(`   提供商: ${result.provider}`);
                console.log(`   模型: ${result.model}`);
                console.log(`   响应: ${result.content.substring(0, 100)}...`);
            } else {
                console.log('   ❌ 调用失败:', result.error);
            }
        } catch (error) {
            console.log('   ❌ 调用出错:', error.message);
        }
    } else {
        console.log('6. ⚠️ 方舟 API 未配置，跳过 API 调用测试');
    }
    console.log('');

    // 7. 测试降级机制
    console.log('7. 降级机制测试:');
    console.log('   当方舟不可用时，自动降级到智谱 AI（兜底）');
    console.log(`   方舟状态: ${stats.providers.ark ? '可用' : '不可用'}`);
    console.log(`   智谱状态: ${stats.providers.zhipu ? '可用 (兜底)' : '不可用'}`);
    console.log('');

    console.log('========================================');
    console.log('测试完成！');
    console.log('========================================');
    
    // 返回状态
    return {
        arkConfigured: !!process.env.ARK_API_KEY,
        zhipuConfigured: !!process.env.ZHIPU_API_KEY,
        arkAvailable: stats.providers.ark,
        zhipuAvailable: stats.providers.zhipu,
        totalModels: models.length
    };
}

// 运行测试
testArkIntegration()
    .then(result => {
        console.log('\n测试结果摘要:', result);
        process.exit(0);
    })
    .catch(error => {
        console.error('测试失败:', error);
        process.exit(1);
    });
