# 🚀 小易 + OpenClaw 快速启动指南

## 5 分钟快速开始

### 1. 安装 OpenClaw

```bash
# 克隆仓库
git clone https://github.com/anbeime/openclaw.git
cd openclaw

# 安装并构建
npm install
npm run build

# 链接到全局（推荐）
npm link
```

### 2. 配置 OpenClaw

```bash
# 运行配置向导
openclaw configure

# 或手动编辑配置文件
notepad ~/.openclaw/openclaw.json
```

配置示例：
```json
{
  "gateway": {
    "port": 18789,
    "auth": {
      "token": "your-token-here"
    }
  },
  "models": {
    "providers": {
      "zhipu": {
        "apiKey": "your-zhipu-key"
      }
    }
  }
}
```

### 3. 启动 OpenClaw 网关

```bash
openclaw gateway
```

访问 http://localhost:18789/ 确认运行正常。

### 4. 配置小易

```bash
cd projects/xiaoyue-web

# 复制环境变量文件
cp .env.example .env

# 编辑配置
notepad .env
```

填写：
- `ZHIPU_API_KEY`：你的智谱 API Key
- `OPENCLAW_TOKEN`：从 OpenClaw 配置获取

### 5. 启动小易

```bash
# 使用完整版服务器（推荐）
node server-with-openclaw.js

# 或使用基础版
node server.js
```

### 6. 开始使用！

打开浏览器访问：http://localhost:3000/voice.html

## 💬 试试这些指令

- "你好小易" - 打招呼
- "帮我整理桌面文件" - 执行电脑任务
- "帮我打开浏览器搜索 OpenClaw" - 打开浏览器
- "发张照片" - 看任嘉伦照片
- "有点累了" - 聊天安慰

## 🔧 故障排查

### OpenClaw 未运行

```bash
# 检查状态
openclaw gateway status

# 重新启动
openclaw gateway
```

### API Key 错误

- 确认 `.env` 文件配置正确
- 确认智谱 API Key 有效
- 确认 OpenClaw Token 正确

### 端口冲突

```bash
# 检查端口占用
netstat -ano | findstr 3000
netstat -ano | findstr 18789
```

## 📚 更多信息

- [完整集成指南](../../OPENCLAW_INTEGRATION_GUIDE.md)
- [OpenClaw 官方文档](https://github.com/anbeime/openclaw)
- [智谱 AI 文档](https://open.bigmodel.cn/)
