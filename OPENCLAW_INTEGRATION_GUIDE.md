# 🦞 小易 + OpenClaw 完整集成指南

让小易成为 OpenClaw 的前端入口，通过网页界面控制电脑执行任务！

## 📋 架构设计

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   用户浏览器     │────▶│   小易 Web 界面  │────▶│   小易服务器     │
│  (voice.html)   │     │  (前端 + API)   │     │  (Node.js)     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                              ┌──────────────────────────┘
                              │ HTTP API
                              ▼
                    ┌─────────────────┐
                    │   OpenClaw 网关  │
                    │  (localhost:18789)│
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │   电脑执行任务   │
                    │  (文件/浏览器/等) │
                    └─────────────────┘
```

## 🚀 快速开始

### 1. 安装 OpenClaw

```bash
# 克隆 OpenClaw 仓库
git clone https://github.com/anbeime/openclaw.git
cd openclaw

# 安装依赖
npm install

# 构建
npm run build

# 链接到全局（可选）
npm link
```

### 2. 配置 OpenClaw

编辑 `~/.openclaw/openclaw.json`：

```json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "auth": {
      "token": "your-api-key-here"
    }
  },
  "models": {
    "providers": {
      "zhipu": {
        "baseUrl": "https://open.bigmodel.cn/api/paas/v4",
        "apiKey": "your-zhipu-api-key",
        "auth": "api-key",
        "api": "openai-completions",
        "models": [
          {
            "id": "glm-4.7-flash",
            "name": "GLM-4.7-Flash"
          }
        ]
      }
    }
  }
}
```

### 3. 启动 OpenClaw 网关

```bash
openclaw gateway
```

访问 http://localhost:18789/ 确认网关运行正常。

### 4. 配置小易

编辑 `projects/xiaoyue-web/.env`：

```env
# 智谱 AI API Key
ZHIPU_API_KEY=your-zhipu-api-key

# OpenClaw 集成配置
OPENCLAW_ENABLED=true
OPENCLAW_API=http://127.0.0.1:18789
OPENCLAW_TOKEN=your-openclaw-token
OPENCLAW_WORKSPACE=C:\Users\YourName\.openclaw\workspace

# 服务器端口
PORT=3000
```

### 5. 启动小易服务器

```bash
cd projects/xiaoyue-web
node server.js
```

### 6. 访问小易界面

打开浏览器访问：http://localhost:3000/voice.html

## 💬 使用示例

### 示例 1：整理桌面文件

```
用户：小易，帮我整理桌面文件
小易：好的，正在为你整理桌面文件... 🍵
     [调用 OpenClaw 执行任务]
小易：整理完成！共整理了 25 个文件，已按类型分类存放 ✨
```

### 示例 2：打开浏览器搜索

```
用户：帮我搜索"AI 助手开发教程"
小易：正在打开浏览器搜索... 🍵
     [OpenClaw 打开 Chrome 并搜索]
小易：已为你打开搜索结果，请查看浏览器 ✨
```

### 示例 3：创建文档

```
用户：帮我创建一个会议纪要模板
小易：好的，正在创建会议纪要模板... 🍵
     [OpenClaw 创建 Markdown 文件]
小易：文档已创建：会议纪要_2026-02-18.md ✨
```

## 🔧 API 接口

### 聊天接口（已集成 OpenClaw）

```http
POST /api/chat
Content-Type: application/json

{
  "message": "帮我整理桌面文件",
  "sessionId": "default",
  "apiKey": "your-zhipu-api-key"
}
```

响应：

```json
{
  "success": true,
  "message": "好的，正在为你整理桌面文件... 🍵",
  "reply": "好的，正在为你整理桌面文件... 🍵",
  "isTask": true,
  "taskResult": {
    "success": true,
    "result": "整理了 25 个文件"
  },
  "openclawEnabled": true,
  "openclawRunning": true
}
```

### OpenClaw 状态检查

```http
GET /api/openclaw/status
```

响应：

```json
{
  "enabled": true,
  "running": true,
  "api": "http://127.0.0.1:18789",
  "workspace": "C:\\Users\\...\\.openclaw\\workspace"
}
```

## 🎯 任务指令关键词

小易会自动识别以下关键词并调用 OpenClaw：

- **文件操作**：帮我、整理、创建、删除、移动、复制、重命名
- **浏览器**：打开浏览器、搜索、查找、访问
- **系统操作**：截图、录屏、锁屏、关机、重启
- **应用控制**：播放、暂停、音量、亮度

## 📱 高级配置

### 内网穿透（手机远程控制）

使用 ngrok：

```bash
# 安装 ngrok
npm install -g ngrok

# 启动隧道（将小易暴露到公网）
ngrok http 3000

# 获取公网地址，手机访问
```

### 飞书/钉钉集成

配置 OpenClaw 的 channel：

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "app_id": "cli_xxxxx",
      "app_secret": "your_secret"
    }
  }
}
```

## 🔍 故障排查

### 问题 1：OpenClaw 网关未运行

**解决**：
```bash
# 检查状态
openclaw gateway status

# 启动网关
openclaw gateway
```

### 问题 2：任务执行失败

**解决**：
- 检查 OpenClaw 日志：`openclaw logs`
- 确认 Token 有效
- 检查工作区权限

### 问题 3：无法连接 OpenClaw

**解决**：
```bash
# 检查端口占用
netstat -ano | findstr 18789

# 检查防火墙
# 确认 127.0.0.1:18789 可访问
```

## 📚 相关链接

- OpenClaw 官方仓库：https://github.com/anbeime/openclaw
- 小易项目仓库：https://github.com/anbeime/skill
- 智谱 AI：https://open.bigmodel.cn

## 🤝 贡献

欢迎提交 PR 和 Issue！

## 📄 许可证

MIT License
