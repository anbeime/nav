# 飞书集成配置指南

## 问题说明

**问题**: ngrok 未在启动脚本中自动启动，导致无法与飞书通信。

**原因**: 之前的 `StarClaw-Start-Full.bat` 只是询问是否启动 ngrok，需要用户手动确认。

**解决方案**: 已更新启动脚本，ngrok 现在会自动启动。

---

## 快速启动（飞书版）

### 方法一：使用飞书快速启动脚本（推荐）

```bash
双击运行: Start-Feishu-Quick.bat
```

这个脚本会自动：
1. ✅ 检查环境（Node.js、ngrok）
2. ✅ 启动 ngrok 隧道
3. ✅ 获取公网地址
4. ✅ 启动 StarClaw 服务
5. ✅ 显示飞书配置信息

### 方法二：使用完整启动脚本

```bash
双击运行: StarClaw-Start-Full.bat
```

---

## ngrok 安装指南

如果提示 `ngrok 未安装`，请按以下步骤操作：

### 步骤 1: 注册 ngrok 账号

1. 访问 https://ngrok.com
2. 点击 "Sign up" 注册
3. 填写邮箱和密码
4. 验证邮箱

### 步骤 2: 下载 ngrok

1. 登录后访问 https://dashboard.ngrok.com/get-started/setup
2. 下载 Windows 版本：`ngrok-v3-stable-windows-amd64.zip`
3. 解压到 `C:\ngrok\`

### 步骤 3: 配置 ngrok

**方法一：添加到 PATH（推荐）**

以管理员身份运行命令提示符：

```cmd
mklink "C:\Windows\System32\ngrok.exe" "C:\ngrok\ngrok.exe"
```

**方法二：添加到环境变量**

1. 右键「此电脑」→「属性」→「高级系统设置」
2. 点击「环境变量」
3. 在「系统变量」中找到 `Path`，点击「编辑」
4. 添加：`C:\ngrok`
5. 确定保存

### 步骤 4: 配置 authtoken

1. 在 ngrok 控制台复制你的 authtoken
   - 访问：https://dashboard.ngrok.com/get-started/your-authtoken
   - 点击「Copy」

2. 在命令行中配置：

```cmd
ngrok config add-authtoken YOUR_TOKEN_HERE
```

示例：
```cmd
ngrok config add-authtoken 2abc123def456ghi789
```

### 步骤 5: 验证安装

```cmd
ngrok version
```

如果显示版本号，说明安装成功！

---

## 飞书配置步骤

### 步骤 1: 创建飞书应用

1. 访问飞书开发者后台：https://open.feishu.cn/app
2. 点击「创建企业自建应用」
3. 填写应用名称和描述
4. 上传应用图标
5. 创建成功

### 步骤 2: 获取应用凭证

1. 进入应用详情页
2. 点击「凭证与基础信息」
3. 复制以下信息：
   - **App ID**: `cli_xxxxxxxxxxxx`
   - **App Secret**: `xxxxxxxxxxxxxxxxxx`

### 步骤 3: 配置环境变量

编辑项目的 `.env` 文件：

```env
# 飞书配置
FEISHU_APP_ID=cli_xxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxx

# 可选配置（如果飞书后台有设置）
FEISHU_ENCRYPT_KEY=
FEISHU_VERIFICATION_TOKEN=
```

### 步骤 4: 启动服务

运行启动脚本：

```bash
Start-Feishu-Quick.bat
```

等待启动完成，会显示类似信息：

```
Webhook 地址（复制到飞书）:
https://abc123.ngrok.io/api/feishu/webhook
```

### 步骤 5: 配置事件订阅

1. 在飞书开发者后台，进入应用
2. 点击「事件订阅」
3. 点击「添加事件订阅」
4. 在「请求网址」中粘贴 Webhook 地址
   ```
   https://abc123.ngrok.io/api/feishu/webhook
   ```
5. 点击「保存」
6. 系统会自动验证，显示 ✓ 表示成功

### 步骤 6: 配置权限

在飞书应用后台：

1. 进入「权限管理」
2. 搜索并开通以下权限：
   - `contact:user.base:readonly` - 获取用户基本信息
   - `im:message` - 获取消息
   - `im:message:send_as_bot` - 以应用身份发消息
   - `im:message.p2p_msg` - 接收私聊消息
   - `im:message.p2p_msg:readonly` - 读取私聊消息

### 步骤 7: 发布应用

1. 在飞书开发者后台
2. 点击「版本管理与发布」
3. 创建版本并提交审核
4. 审核通过后，应用即可使用

---

## 常见问题

### Q1: ngrok 启动失败

**错误**: `ngrok: command not found`

**解决**:
1. 确认 ngrok 已添加到 PATH
2. 重启命令行窗口
3. 验证: `ngrok version`

---

### Q2: 飞书验证失败

**错误**: 飞书后台显示验证失败

**解决**:
1. 确认 StarClaw 服务已启动
2. 检查 ngrok 是否正常运行
3. 验证 Webhook 地址格式正确
4. 检查 .env 文件配置

---

### Q3: ngrok 连接不稳定

**症状**: 经常断开连接

**解决**:
1. 升级 ngrok 到最新版本
2. 检查网络连接
3. 使用付费版 ngrok 获得更稳定的连接

---

### Q4: 无法接收飞书消息

**症状**: 飞书发送消息无响应

**解决**:
1. 检查事件订阅是否配置成功
2. 确认应用权限已开通
3. 查看 StarClaw Server 窗口的日志
4. 测试 Webhook 地址是否可访问

---

### Q5: ngrok 公网地址变化

**症状**: 每次启动地址都不同

**解决**:
免费版 ngrok 每次启动地址会变化，需要重新配置飞书。

**推荐**:
1. 升级 ngrok 付费版，使用固定域名
2. 或使用其他内网穿透服务：
   - frp（自建）
   - cpolar（国内）
   - 花生壳

---

## 测试方法

### 1. 测试 ngrok

启动后访问：http://127.0.0.1:4040

可以看到：
- 公网地址
- 请求日志
- 连接状态

### 2. 测试飞书 Webhook

使用 curl 或 Postman 发送测试请求：

```bash
curl -X POST https://abc123.ngrok.io/api/feishu/webhook \
  -H "Content-Type: application/json" \
  -d '{"challenge":"test"}'
```

### 3. 测试飞书消息

在飞书中向机器人发送消息，观察 StarClaw Server 窗口的日志输出。

---

## 启动脚本对比

| 脚本 | ngrok | 飞书支持 | 适用场景 |
|------|-------|----------|----------|
| `Start-Feishu-Quick.bat` | ✅ 自动启动 | ✅ 完整支持 | 飞书用户首选 |
| `StarClaw-Start-Full.bat` | ✅ 自动启动 | ✅ 完整支持 | 完整功能 |
| `StarClaw-Start.bat` | ❌ 不启动 | ❌ 仅本地 | 本地测试 |
| `start-ngrok.bat` | ✅ 仅启动 ngrok | - | 手动配置 |

---

## 推荐启动方式

### 飞书用户

```bash
双击: Start-Feishu-Quick.bat
```

### 本地测试

```bash
双击: StarClaw-Start.bat
```

### 完整功能

```bash
双击: StarClaw-Start-Full.bat
```

---

## 更新日志

### 2026-03-30
- ✅ 更新 `StarClaw-Start-Full.bat`，ngrok 自动启动
- ✅ 新增 `Start-Feishu-Quick.bat`，飞书专用快速启动
- ✅ 新增本配置指南文档

---

## 技术支持

如遇问题，请提供以下信息：

1. 启动脚本的完整输出
2. `ngrok-log.txt` 文件内容
3. StarClaw Server 窗口的错误日志
4. 飞书开发者后台的配置截图
