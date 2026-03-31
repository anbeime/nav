# TOOLS.md - StarClaw 工具配置

## API 配置

### 智谱 AI
- baseUrl: `https://open.bigmodel.cn/api/paas/v4`
- 支持模型: glm-4-flash, glm-4.7-flash

### OpenClaw 集成
- gateway: `http://localhost:18789`
- token: 从环境变量 `OPENCLAW_TOKEN` 读取

## 默认参数

- temperature: 0.85 (创意性)
- max_tokens: 500 (对话), 2000 (方案输出)
- context_window: 10轮历史

## 文件路径

- agents: `./starclaw/agents/`
- skills: `./starclaw/skills/`
- knowledge: `./starclaw/knowledge/`
- sessions: `./starclaw/sessions/`

## 多模态能力

- TTS: Edge-TTS 本地服务
- 语音克隆: GPT-SoVITS (可选)
- 图片: 自动从 xiaoyi-photos 目录选择

---

_这是 StarClaw 的工具配置，记录环境特定的设置。_
