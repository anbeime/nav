# StarClaw 安全补丁应用指南

## 快速开始

### 1. 应用安全补丁

```bash
# 进入项目目录
cd C:\D\工作流n8n-coze-dify\skill\skill-main\projects\xiaoyue-web\starclaw

# 备份原文件
copy executor.js executor.js.backup

# 应用安全版本
copy executor-secure.js executor.js
```

### 2. 验证安全加固

运行测试脚本验证安全功能：

```javascript
// test-security.js
const { executor } = require('./executor');
const { SecurityManager } = require('./security-patch');

async function testSecurity() {
    const security = new SecurityManager();
    
    // 测试 1: 命令白名单
    console.log('=== 测试命令白名单 ===');
    console.log('git status:', security.validateCommand('git status'));
    console.log('rm -rf /:', security.validateCommand('rm -rf /'));
    console.log('del /f /s *:', security.validateCommand('del /f /s *'));
    
    // 测试 2: 文件沙箱
    console.log('\n=== 测试文件沙箱 ===');
    console.log('./workspace/test.txt:', security.validatePath('./workspace/test.txt', 'write'));
    console.log('C:\\Windows\\System32:', security.validatePath('C:\\Windows\\System32', 'read'));
    console.log('/etc/passwd:', security.validatePath('/etc/passwd', 'read'));
    
    // 测试 3: SSRF 防护
    console.log('\n=== 测试 SSRF 防护 ===');
    console.log('https://api.openai.com:', security.validateHttpRequest('https://api.openai.com'));
    console.log('http://127.0.0.1:', security.validateHttpRequest('http://127.0.0.1'));
    console.log('http://192.168.1.1:', security.validateHttpRequest('http://192.168.1.1'));
}

testSecurity().catch(console.error);
```

运行测试：

```bash
node test-security.js
```

### 3. 查看审计日志

```bash
# 查看最近的审计记录
type logs\audit.log

# 或使用 PowerShell
Get-Content logs\audit.log -Tail 20
```

---

## 安全配置选项

### 自定义沙箱目录

```javascript
const { SecurityManager } = require('./security-patch');

const security = new SecurityManager({
    sandboxDirs: [
        'D:\\Projects\\StarClaw\\workspace',
        'D:\\Projects\\StarClaw\\output',
        'D:\\Projects\\StarClaw\\temp'
    ]
});
```

### 添加允许的命令

```javascript
security.allowedCommands['mytool'] = {
    allowed: ['run', 'test'],
    requiresAuth: {
        'run': true
    }
};
```

---

## API 参考

### SecurityManager

#### `validateCommand(command)`
验证命令是否安全执行

**返回值:**
```javascript
{
    valid: boolean,      // 是否有效
    error?: string,      // 错误信息
    requiresAuth?: boolean // 是否需要额外授权
}
```

#### `validatePath(filePath, operation)`
验证文件路径是否在沙箱内

**参数:**
- `filePath` - 文件路径
- `operation` - 操作类型: 'read' | 'write' | 'delete'

**返回值:**
```javascript
{
    valid: boolean,      // 是否有效
    error?: string,      // 错误信息
    resolvedPath?: string // 解析后的绝对路径
}
```

#### `validateHttpRequest(url, options)`
验证 HTTP 请求是否安全

**返回值:**
```javascript
{
    valid: boolean,
    error?: string
}
```

#### `sanitizeInput(input, maxLength)`
清理用户输入

**返回值:**
```javascript
{
    clean: string,        // 清理后的内容
    wasSanitized: boolean // 是否进行了清理
}
```

---

## 安全检查清单

### 部署前检查

- [ ] 已备份原 `executor.js`
- [ ] 已应用 `security-patch.js`
- [ ] 已应用 `executor-secure.js`
- [ ] 测试命令白名单功能
- [ ] 测试文件沙箱功能
- [ ] 测试 SSRF 防护功能
- [ ] 确认审计日志目录可写
- [ ] 配置环境变量（API Keys）

### 运行时监控

- [ ] 定期检查 `logs/audit.log`
- [ ] 监控安全违规事件
- [ ] 定期更新命令白名单
- [ ] 审查敏感操作日志

---

## 常见问题

### Q: 为什么某些命令被拒绝？

A: 命令需要满足两个条件：
1. 命令本身在白名单中
2. 参数不包含危险字符或模式

**解决方法：** 在 `security-patch.js` 中添加允许的命令和参数。

### Q: 如何允许访问内网服务？

A: 默认禁止访问内网地址以防止 SSRF 攻击。如果需要访问特定的内网服务：

```javascript
// 在 validateHttpRequest 中添加例外
const allowedInternalHosts = ['internal-api.company.com'];
if (allowedInternalHosts.includes(hostname)) {
    return { valid: true };
}
```

### Q: 审计日志占用太多空间怎么办？

A: 配置日志轮转：

```javascript
// 使用 logrotate 或定期清理
const fs = require('fs');
const path = require('path');

// 保留最近 7 天的日志
function rotateLogs() {
    const logDir = path.join(__dirname, 'logs');
    const files = fs.readdirSync(logDir);
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    files.forEach(file => {
        const stat = fs.statSync(path.join(logDir, file));
        if (now - stat.mtime > sevenDays) {
            fs.unlinkSync(path.join(logDir, file));
        }
    });
}
```

---

## 性能影响

安全加固对性能的影响：

| 功能 | 性能影响 | 说明 |
|------|----------|------|
| 命令验证 | < 1ms | 正则匹配开销 |
| 路径验证 | < 1ms | 字符串解析开销 |
| HTTP 验证 | < 5ms | URL 解析开销 |
| 输入清理 | < 1ms | 字符串处理开销 |
| 审计日志 | < 5ms | 文件写入开销 |

**总体影响**：每次工具调用增加约 5-10ms，对整体性能影响可忽略。

---

## 更新日志

### v1.0 (2026-03-26)
- 初始版本
- 命令执行白名单
- 文件操作沙箱
- SSRF 防护
- 输入验证增强
- 审计日志系统
