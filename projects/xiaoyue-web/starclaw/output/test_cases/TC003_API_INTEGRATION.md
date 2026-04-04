# 测试用例 TC003：API 集成与错误处理

## 测试目标
验证 StarClaw 在 API 集成和错误处理场景下的表现

## 测试输入
**API 文档片段**：
```javascript
POST https://api.example.com/v1/users
Content-Type: application/json
Authorization: Bearer {token}

Request:
{
  "name": "string",
  "email": "string"
}

Response:
{
  "id": "string",
  "name": "string",
  "created_at": "timestamp"
}
```

**错误响应示例**：
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded",
    "retry_after": 60
  }
}
```

## 测试步骤
1. 输入 API 文档，要求生成调用代码
2. 检查生成的代码是否包含：
   - 正确的请求方法
   - 完整的 Header 设置
   - 请求体构造
3. 输入错误响应，要求添加错误处理
4. 验证是否实现：
   - 状态码检查
   - 限流重试逻辑
   - 指数退避

## 预期结果
- 生成符合文档的 API 调用代码
- 完善的错误处理机制
- 正确处理限流场景

## 评分维度
| 维度 | 权重 | 标准 |
|------|------|------|
| API 调用正确性 | 30% | 符合文档规范 |
| 错误处理完整性 | 30% | 覆盖常见错误码 |
| 重试逻辑 | 20% | 实现指数退避 |
| 边界处理 | 10% | 处理超时、网络错误 |
| 代码可读性 | 10% | 结构清晰 |

## 实测记录
| 模型 | 调用正确 | 错误处理 | 重试逻辑 | 边界处理 | 总分 |
|------|---------|---------|---------|---------|------|
| 方舟 Coding | - | - | - | - | - |
| 智谱 AI | - | - | - | - | - |

## 备注
- 测试环境：localhost:3000/voice.html
- 测试时间：2026-03-30
