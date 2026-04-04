/**
 * 开源大模型异常日志分析评测脚本
 * 
 * 使用方法：
 * 1. 配置 .env 文件中的 API Keys
 * 2. 运行: node run_evaluation.js
 * 
 * 输出：
 * - evaluation_results.json: 详细测试结果
 * - screenshots/: 模型输出截图（需要手动截取）
 */

const fs = require('fs');
const path = require('path');

// ==================== 配置 ====================

const API_KEYS = {
  zhipu: process.env.ZHIPU_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  aliyun: process.env.ALIYUN_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY
};

const MODELS = [
  {
    name: 'GLM-5-Code',
    provider: 'zhipu',
    model: 'glm-4-flash',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4'
  },
  {
    name: 'Qwen2.5-Coder-32B',
    provider: 'aliyun',
    model: 'qwen2.5-coder-32b-instruct',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1'
  },
  {
    name: 'DeepSeek-Coder-33B',
    provider: 'deepseek',
    model: 'deepseek-coder-33b-instruct',
    baseUrl: 'https://api.deepseek.com/v1'
  },
  {
    name: 'Code Llama-34B',
    provider: 'openrouter',
    model: 'meta-llama/codellama-34b-instruct',
    baseUrl: 'https://openrouter.ai/api/v1'
  },
  {
    name: 'StarCoder2-15B',
    provider: 'openrouter',
    model: 'bigcode/starcoder2-15b',
    baseUrl: 'https://openrouter.ai/api/v1'
  }
];

// ==================== 测试用例 ====================

const TEST_CASES = [
  {
    id: 'TC001',
    category: '数据库异常',
    difficulty: 2,
    log_content: `[2026-04-01 09:23:15] ERROR: Database connection timeout
[2026-04-01 09:23:16] WARN: Retrying connection... attempt 1/3
[2026-04-01 09:23:18] ERROR: Connection failed after 3 attempts
[2026-04-01 09:23:19] ERROR: Service unhealthy, initiating failover
[2026-04-01 09:23:20] INFO: Failover to backup database successful`
  },
  {
    id: 'TC002',
    category: 'API限流',
    difficulty: 2,
    log_content: `[2026-04-01 10:15:32] ERROR: API rate limit exceeded
[2026-04-01 10:15:32] ERROR: Service: payment-gateway
[2026-04-01 10:15:32] ERROR: Retry-After: 60 seconds
[2026-04-01 10:15:33] WARN: Request queue overflow, dropping 150 requests`
  },
  {
    id: 'TC003',
    category: '内存溢出',
    difficulty: 3,
    log_content: `[2026-04-01 08:00:01] INFO: Memory usage: 45%
[2026-04-01 10:30:15] INFO: Memory usage: 62%
[2026-04-01 12:45:30] WARN: Memory usage: 78%
[2026-04-01 14:20:45] ERROR: Memory usage: 91%, approaching limit
[2026-04-01 14:21:02] ERROR: OutOfMemoryError: Java heap space
[2026-04-01 14:21:05] ERROR: Service crashed, restarting...`
  },
  {
    id: 'TC004',
    category: '并发冲突',
    difficulty: 4,
    log_content: `[2026-04-01 11:30:15] INFO: Transaction T1 started, locking resource R1
[2026-04-01 11:30:16] INFO: Transaction T2 started, locking resource R2
[2026-04-01 11:30:17] WARN: T1 waiting for R2 (held by T2)
[2026-04-01 11:30:17] WARN: T2 waiting for R1 (held by T1)
[2026-04-01 11:30:18] ERROR: Deadlock detected, aborting T2
[2026-04-01 11:30:18] INFO: Transaction T1 completed successfully`
  },
  {
    id: 'TC005',
    category: '微服务调用链',
    difficulty: 5,
    log_content: `[2026-04-01 14:23:15.123] [order-service] INFO: 收到下单请求, userId=100234, productId=SKU_8899
[2026-04-01 14:23:15.234] [order-service] INFO: 调用库存服务扣减库存
[2026-04-01 14:23:15.345] [inventory-service] INFO: 开始扣减库存, productId=SKU_8899, num=1
[2026-04-01 14:23:15.456] [inventory-service] WARN: 库存不足, current=0, required=1
[2026-04-01 14:23:15.567] [inventory-service] ERROR: 库存扣减失败, 返回错误码=INSUFFICIENT_STOCK
[2026-04-01 14:23:15.678] [order-service] WARN: 库存服务返回失败, 准备回滚订单
[2026-04-01 14:23:15.789] [order-service] INFO: 调用支付服务取消支付
[2026-04-01 14:23:15.890] [payment-service] INFO: 支付取消成功, orderId=ORD_20260401142315
[2026-04-01 14:23:16.012] [order-service] ERROR: 订单创建失败, 原因=库存不足
[2026-04-01 14:23:16.123] [notification-service] INFO: 发送失败通知给用户, userId=100234`
  }
];

// ==================== Prompt模板 ====================

function buildPrompt(logContent) {
  return `你是一位资深运维工程师，请分析以下异常日志，给出专业的诊断报告：

【日志内容】
${logContent}

【输出要求】
1. 问题定位：识别异常类型和关键信息
2. 根因分析：深入分析可能的根本原因（至少列举3个可能原因）
3. 修复建议：给出紧急处理、短期优化、长期预防三个层次的建议
4. 如果可能，提供代码示例或配置修改建议

请用中文回答。`;
}

// ==================== API调用 ====================

async function callModel(model, prompt) {
  const apiKey = API_KEYS[model.provider];
  
  if (!apiKey) {
    return {
      error: `缺少 API Key: ${model.provider}`,
      skipped: true
    };
  }

  const startTime = Date.now();
  
  try {
    let response;
    
    // 根据不同提供商调用不同API
    if (model.provider === 'zhipu') {
      response = await callZhipuAPI(model, prompt, apiKey);
    } else if (model.provider === 'deepseek') {
      response = await callDeepSeekAPI(model, prompt, apiKey);
    } else if (model.provider === 'aliyun') {
      response = await callAliyunAPI(model, prompt, apiKey);
    } else if (model.provider === 'openrouter') {
      response = await callOpenRouterAPI(model, prompt, apiKey);
    }
    
    const endTime = Date.now();
    
    return {
      model: model.name,
      provider: model.provider,
      response: response.content,
      tokens: response.tokens,
      duration: endTime - startTime,
      success: true
    };
    
  } catch (error) {
    const endTime = Date.now();
    return {
      model: model.name,
      provider: model.provider,
      error: error.message,
      duration: endTime - startTime,
      success: false
    };
  }
}

// 智谱API
async function callZhipuAPI(model, prompt, apiKey) {
  const response = await fetch(`${model.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });
  
  const data = await response.json();
  
  return {
    content: data.choices[0].message.content,
    tokens: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
      total: data.usage?.total_tokens || 0
    }
  };
}

// DeepSeek API
async function callDeepSeekAPI(model, prompt, apiKey) {
  const response = await fetch(`${model.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });
  
  const data = await response.json();
  
  return {
    content: data.choices[0].message.content,
    tokens: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
      total: data.usage?.total_tokens || 0
    }
  };
}

// 阿里云API
async function callAliyunAPI(model, prompt, apiKey) {
  const response = await fetch(`${model.baseUrl}/services/aigc/text-generation/generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model.model,
      input: { prompt },
      parameters: { temperature: 0.7 }
    })
  });
  
  const data = await response.json();
  
  return {
    content: data.output?.text || data.choices?.[0]?.message?.content,
    tokens: {
      input: data.usage?.input_tokens || 0,
      output: data.usage?.output_tokens || 0,
      total: data.usage?.total_tokens || 0
    }
  };
}

// OpenRouter API
async function callOpenRouterAPI(model, prompt, apiKey) {
  const response = await fetch(`${model.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/starclaw',
      'X-Title': 'StarClaw Log Analysis Evaluation'
    },
    body: JSON.stringify({
      model: model.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });
  
  const data = await response.json();
  
  return {
    content: data.choices[0].message.content,
    tokens: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
      total: data.usage?.total_tokens || 0
    }
  };
}

// ==================== 主评测流程 ====================

async function runEvaluation() {
  console.log('========================================');
  console.log('开源大模型异常日志分析评测');
  console.log('========================================\n');
  
  const results = {
    metadata: {
      test_date: new Date().toISOString(),
      total_models: MODELS.length,
      total_test_cases: TEST_CASES.length
    },
    models: MODELS,
    test_cases: TEST_CASES,
    results: {}
  };
  
  // 检查API Keys
  console.log('【步骤1】检查API配置...\n');
  for (const model of MODELS) {
    const apiKey = API_KEYS[model.provider];
    if (apiKey) {
      console.log(`✅ ${model.name}: API Key 已配置`);
    } else {
      console.log(`❌ ${model.name}: 缺少 API Key (${model.provider})`);
    }
  }
  console.log('');
  
  // 逐个测试用例执行
  console.log('【步骤2】开始评测...\n');
  
  for (const testCase of TEST_CASES) {
    console.log(`\n========== 测试用例: ${testCase.id} (${testCase.category}) ==========\n`);
    
    const prompt = buildPrompt(testCase.log_content);
    results.results[testCase.id] = {
      test_case: testCase,
      prompt: prompt,
      model_outputs: []
    };
    
    // 逐个模型测试
    for (const model of MODELS) {
      console.log(`正在测试: ${model.name}...`);
      
      const output = await callModel(model, prompt);
      results.results[testCase.id].model_outputs.push(output);
      
      if (output.success) {
        console.log(`✅ 成功 (耗时: ${output.duration}ms, Tokens: ${output.tokens?.total || 'N/A'})`);
      } else if (output.skipped) {
        console.log(`⏭️  跳过: ${output.error}`);
      } else {
        console.log(`❌ 失败: ${output.error}`);
      }
      
      // 避免API限流
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // 保存结果
  console.log('\n【步骤3】保存结果...\n');
  const outputPath = path.join(__dirname, 'evaluation_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`✅ 结果已保存到: ${outputPath}\n`);
  
  // 统计摘要
  console.log('【评测摘要】\n');
  for (const model of MODELS) {
    const successCount = Object.values(results.results)
      .filter(r => r.model_outputs.some(o => o.model === model.name && o.success))
      .length;
    console.log(`${model.name}: ${successCount}/${TEST_CASES.length} 成功`);
  }
  
  console.log('\n========================================');
  console.log('评测完成！');
  console.log('========================================');
  console.log('\n下一步：');
  console.log('1. 查看 evaluation_results.json 了解详细输出');
  console.log('2. 手动截取每个模型输出的截图（保存到 screenshots/ 目录）');
  console.log('3. 根据实际输出完善评测文章');
}

// ==================== 执行 ====================

runEvaluation().catch(console.error);
