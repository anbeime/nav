/**
 * StarClaw 优化模块使用示例
 * 
 * 演示如何使用新的配置管理、向量嵌入、安全执行器
 */

// ==================== 1. 配置管理 ====================

// 方式一：直接导入单例
const { config, get, set, validate } = require('./config');

// 获取配置
const apiKey = get('env.zhipu.apiKey');
const port = get('env.port', 3003);
const timeout = get('defaults.timeout.default', 30000);

console.log('配置摘要:', config.getSummary());

// 验证配置
const validation = validate();
if (!validation.valid) {
    console.error('配置错误:', validation.errors);
}

// 方式二：监听配置变化
const unwatch = config.watch((key, value) => {
    console.log(`配置变化: ${key} =`, value);
});

// 运行时修改配置
set('runtime.customValue', 'hello');

// 取消监听
unwatch();

// ==================== 2. 向量嵌入服务 ====================

const { VectorStore, EmbeddingService } = require('./context/EmbeddingService');

// 创建向量存储
const vectorStore = new VectorStore({
    storePath: './data/vectors.json',
    embedding: {
        // Ollama 本地嵌入（推荐）
        ollama: {
            enabled: true,
            baseUrl: 'http://127.0.0.1:11434',
            model: 'nomic-embed-text'
        },
        // 智谱 AI 嵌入（备用）
        zhipu: {
            apiKey: get('env.zhipu.apiKey'),
            model: 'embedding-2'
        }
    }
});

// 添加向量
async function addVectors() {
    await vectorStore.add('mem-001', '今天和马斯克讨论了新的产品战略', {
        type: 'meeting',
        agent: 'ceo',
        date: '2026-03-26'
    });
    
    await vectorStore.add('mem-002', '周星驰提出了一个搞笑广告创意', {
        type: 'creative',
        agent: 'creative_comedy',
        date: '2026-03-26'
    });
    
    console.log('向量统计:', vectorStore.getStats());
}

// 搜索相似内容
async function searchVectors() {
    const results = await vectorStore.search('讨论产品创意', 3, 0.5);
    console.log('搜索结果:', results);
}

// ==================== 3. 安全执行器 ====================

const { executor } = require('./executor-secure');

async function testSecureExecutor() {
    // 允许的命令
    const result1 = await executor.runCommand('git status');
    console.log('Git status:', result1.success);
    
    // 被拒绝的危险命令会返回错误
    const result2 = await executor.runCommand('format C:');
    console.log('危险命令被拒绝:', !result2.success);
    
    // 沙箱内的文件操作
    const result3 = await executor.fileOperation('write', './test.txt', 'Hello StarClaw');
    console.log('文件写入:', result3.success);
    
    // 查看安全报告
    console.log('安全配置:', executor.getSecurityReport());
}

// ==================== 4. 工作流模板 ====================

async function runWorkflow(templateName, input) {
    const { WORKFLOW_TEMPLATES } = require('./workflow/templates');
    const template = WORKFLOW_TEMPLATES[templateName];
    if (!template) {
        throw new Error(`工作流模板不存在: ${templateName}`);
    }
    
    console.log(`执行工作流: ${template.name}`);
    console.log(`步骤数: ${template.steps.length}`);
    
    // 实际执行需要 WorkflowEngine
    // 这里仅演示模板结构
    for (let i = 0; i < template.steps.length; i++) {
        const step = template.steps[i];
        console.log(`步骤 ${i + 1}: ${step.type} - ${step.agent || step.skill || step.task || 'parallel'}`);
    }
    
    return { success: true, template: template.name };
}

// ==================== 5. 完整使用示例 ====================

async function main() {
    console.log('=== StarClaw 优化模块测试 ===\n');
    
    // 1. 配置验证
    console.log('1. 配置验证');
    const configValidation = validate();
    console.log('   配置状态:', configValidation.valid ? '有效' : '无效');
    if (configValidation.warnings.length > 0) {
        console.log('   警告:', configValidation.warnings);
    }
    
    // 2. 向量嵌入
    console.log('\n2. 向量嵌入测试');
    await addVectors();
    await searchVectors();
    
    // 3. 安全执行器
    console.log('\n3. 安全执行器测试');
    await testSecureExecutor();
    
    // 4. 工作流模板
    console.log('\n4. 工作流模板');
    await runWorkflow('product_launch', { product: 'StarClaw 2.0' });
    
    console.log('\n=== 测试完成 ===');
}

// 运行测试
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testSecureExecutor,
    addVectors,
    searchVectors,
    runWorkflow
};
