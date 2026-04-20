# AI123 自动更新方案

## 方案对比

| 方案 | 难度 | 自动化程度 | 推荐指数 |
|------|------|-----------|---------|
| **A. 浏览器扩展** | 中 | ⭐⭐⭐⭐⭐ | 推荐 |
| **B. 定时脚本** | 低 | ⭐⭐⭐⭐ | 简单实用 |
| **C. 云端同步** | 高 | ⭐⭐⭐⭐⭐ | 企业级 |

---

## 方案 A: 浏览器扩展（推荐）

### 架构流程
```
Chrome 书签变化 → 扩展监听 → 导出 bookmarks.html → 自动更新 GitHub → Vercel 部署
```

### 实现步骤

1. 创建 Chrome 扩展，监听 `chrome.bookmarks.onCreated` 等事件
2. 将书签导出为标准 HTML 格式
3. 调用 GitHub API 提交更新
4. Vercel 自动部署

### 优点
- 完全自动化，收藏即更新
- 实时同步

### 缺点
- 需要开发浏览器扩展
- 需要处理 GitHub API 认证

---

## 方案 B: 定时脚本（简单实用）

### 架构流程
```
Windows 任务计划 → 每日运行脚本 → 解析书签 → 提交到 GitHub → Vercel 部署
```

### 使用方法

```powershell
# 1. 设置环境变量（书签文件路径）
$env:AI123_BOOKMARKS = "C:\Users\你的用户名\AppData\Local\Google\Chrome\User Data\Default\Bookmarks"

# 2. 运行同步脚本
python scripts/sync_and_push.py
```

### Windows 任务计划设置

1. 打开"任务计划程序"
2. 创建基本任务
3. 触发器：每天 00:00
4. 操作：启动程序
   - 程序：`python`
   - 参数：`scripts/sync_and_push.py`
   - 起始位置：`C:\D\工作流n8n-coze-dify\skill\skill-main\projects\ai123`

### 优点
- 简单易用
- 无需额外开发

### 缺点
- 需要电脑开机运行

---

## 方案 C: 云端同步（企业级）

### 架构流程
```
Chrome 书签 → iCloud/Google Sync → 云端 API → 定时爬取 → 自动更新
```

### 技术栈
- Cloudflare Workers / Vercel Cron
- GitHub Actions
- 对象存储 (R2/S3)

### 优点
- 24小时自动运行
- 无需本地电脑

### 缺点
- 实现复杂
- 需要处理认证

---

## 推荐方案

### 个人用户：方案 B（定时脚本）
简单实用，每天自动更新一次即可

### 团队使用：方案 A（浏览器扩展）
多人协作，实时同步

---

## 下一步

1. 我已创建 `scripts/sync_and_push.py` 一键同步脚本
2. 可设置 Windows 任务计划实现每日自动更新
3. 未来可开发浏览器扩展实现实时同步
