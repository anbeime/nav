# 任务规划与分解系统修复说明

## 问题描述

用户反馈系统无法正确执行复杂任务，例如："打开百度网页www.baidu.com 搜索下伊朗最新新闻"

### 原始问题
1. **任务未分解**：系统将整个任务作为单一命令执行
2. **URL解析错误**：无法从"打开百度网页www.baidu.com"中正确提取URL
3. **执行失败**：命令执行失败，提示"系统找不到文件 百度网页www.baidu.com"

## 解决方案

### 1. 新增任务规划器（Task Planner）

在 `server-with-openclaw.js` 中新增 `planTask()` 函数，使用 AI 将复杂任务分解为可执行步骤。

```javascript
async function planTask(task) {
    // 检测是否需要分解任务
    const needsDecomposition = /打开.*网页?.*(搜索|查找|输入)|打开.*网页?.*搜索/.test(task);
    
    if (!needsDecomposition) {
        return { steps: [task], needPlanning: false };
    }
    
    // 使用 AI 分解任务
    const response = await axios.post(`${ZHIPU_API_BASE}/chat/completions`, {
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: planPrompt }],
        temperature: 0.3,
        max_tokens: 500
    });
    
    // 解析步骤
    const steps = planText
        .split('\n')
        .filter(line => line.match(/^步骤\d+[:：]/))
        .map(line => line.replace(/^步骤\d+[:：]\s*/, '').trim())
        .filter(step => step.length > 0);
    
    return { steps, needPlanning: true };
}
```

### 2. 改进执行流程

修改 `executeBuiltInTask()` 函数，增加任务分解逻辑：

```javascript
async function executeBuiltInTask(task) {
    // 优先尝试 OpenClaw
    if (OPENCLAW_ENABLED && OPENCLAW_TOKEN) {
        const openClawResult = await executeOpenClawTask(task);
        if (openClawResult !== null) {
            return openClawResult;
        }
    }
    
    // 任务规划与分解
    const plan = await planTask(task);
    
    if (plan.needPlanning && plan.steps.length > 1) {
        // 执行分解后的多个步骤
        for (let i = 0; i < plan.steps.length; i++) {
            const stepResult = await executeSingleStep(plan.steps[i]);
            results.push(stepResult);
            
            // 步骤间添加延迟，让系统响应
            if (i < plan.steps.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return { success: results.some(r => r.success), steps: results };
    }
    
    // 单步任务直接执行
    return await executeSingleStep(task);
}
```

### 3. 优化URL解析

在 `executeSingleStep()` 函数中改进URL提取逻辑：

```javascript
if (step.includes('打开网页') || step.includes('打开浏览器')) {
    let url = 'https://www.baidu.com';
    
    // 多种匹配模式
    const urlMatch1 = step.match(/(?:打开网页|打开浏览器)\s+(https?:\/\/\S+)/i);
    const urlMatch2 = step.match(/(?:打开网页|打开浏览器)\s+(www\.\S+)/i);
    const urlMatch3 = step.match(/打开(?:百度|Baidu)网页/);
    const urlMatch4 = step.match(/(?:打开浏览器|打开网页)[输入\s]*(.+)/);
    
    if (urlMatch1) url = urlMatch1[1];
    else if (urlMatch2) url = 'https://' + urlMatch2[1];
    else if (urlMatch3) url = 'https://www.baidu.com';
    else if (urlMatch4) {
        let target = urlMatch4[1].trim();
        if (!target.startsWith('http')) target = 'https://' + target;
        url = target;
    }
    
    result = await executor.runCommand(`start ${url}`);
}
```

### 4. 新增操作支持

增加了搜索框输入和点击搜索按钮的支持：

```javascript
// 搜索框输入
if (step.includes('在搜索框输入') || step.includes('输入文字')) {
    const text = inputMatch[1].trim();
    result = await executor.runCommand(
        `powershell -Command "Set-Clipboard -Value '${text}'; ` +
        `Add-Type -AssemblyName System.Windows.Forms; ` +
        `[System.Windows.Forms.SendKeys]::SendWait('^{v}{ENTER}')"`
    );
}

// 点击搜索按钮
if (step.includes('点击搜索按钮') || step.includes('点击搜索')) {
    result = await executor.runCommand(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; ` +
        `[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')"`
    );
}
```

## 执行流程示例

### 用户输入
```
"打开百度网页www.baidu.com 搜索下伊朗最新新闻"
```

### 系统处理流程

1. **任务检测**
   ```
   [Task] Detected task: 打开百度网页www.baidu.com 搜索下伊朗最新新闻
   ```

2. **任务规划**
   ```
   [TaskPlanner] 检测到复杂任务，开始分解...
   [TaskPlanner] AI规划结果:
   步骤1: 打开网页 https://www.baidu.com
   步骤2: 在搜索框输入 伊朗最新新闻
   步骤3: 点击搜索按钮
   [TaskPlanner] 分解步骤: ['打开网页 https://www.baidu.com', '在搜索框输入 伊朗最新新闻', '点击搜索按钮']
   ```

3. **步骤执行**
   ```
   [Executor] 执行分解任务，共 3 步
   [Executor] 步骤 1/3: 打开网页 https://www.baidu.com
   [Executor] 提取URL: https://www.baidu.com
   [Executor] 完成: run_command (成功)
   
   [Executor] 步骤 2/3: 在搜索框输入 伊朗最新新闻
   [Executor] 完成: run_command (成功)
   
   [Executor] 步骤 3/3: 点击搜索按钮
   [Executor] 完成: run_command (成功)
   ```

4. **返回结果**
   ```json
   {
     "success": true,
     "result": "步骤1: 成功\n步骤2: 成功\n步骤3: 成功",
     "steps": [...]
   }
   ```

## 优势

1. **智能分解**：使用 AI 自动理解复杂任务并分解为可执行步骤
2. **容错性强**：支持多种URL格式和表述方式
3. **可扩展**：易于添加新的操作类型
4. **降级机制**：AI 分解失败时自动降级为简单执行
5. **步骤协调**：步骤间自动添加延迟，确保系统响应

## 注意事项

1. **OpenClaw 优先**：如果 OpenClaw 可用，会优先使用其强大的浏览器操作能力
2. **延迟设置**：步骤间默认延迟 1 秒，可根据需要调整
3. **错误处理**：某个步骤失败不会中断整个流程，会继续执行后续步骤
4. **AI 模型**：使用 `glm-4-flash` 进行任务分解，速度快成本低

## 后续优化方向

1. 增加更多浏览器操作支持（滚动、截图等）
2. 支持条件判断和循环操作
3. 增加任务执行进度反馈
4. 支持任务取消和回滚
5. 增加任务模板库

---

**修改时间**：2026-04-04  
**修改文件**：`server-with-openclaw.js`  
**相关模块**：任务执行器、任务规划器
