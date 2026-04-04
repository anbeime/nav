# StarClaw 手机客户端架构设计

> 参考红手指 Operator (kangarooking/mobileclaw) 架构，为 StarClaw 打造手机端能力

---

## 一、红手指 Operator 架构解析

### 1.1 核心架构公式

```
OpenClaw Operator = 云端大脑(VLA Model) + 终端手脚(Client) + 安全沙盒(云手机)
```

### 1.2 三层架构详解

| 层级 | 组件 | 职责 | 技术实现 |
|------|------|------|---------|
| **云端大脑** | VLA Model | 任务规划、决策调度、语义理解 | 多模态大模型 |
| **终端手脚** | Client | 执行具体操作、界面交互 | 安卓无障碍服务 |
| **安全沙盒** | 云手机 | 隔离执行环境、保护隐私 | 红手指云手机 |

### 1.3 核心创新点：App 即 Skills

```
传统 OpenClaw: 用户 → 聊天工具 → OpenClaw → Skills(插件) → 执行
红手指 Operator: 用户 → App → OpenClaw → 手机App(作为Skills) → 执行
```

**关键差异**：
- 传统方案：需要为每个 App 开发专门的 Skill 插件
- 红手指方案：手机里已安装的 App 直接作为 Skill 使用

---

## 二、StarClaw 手机客户端设计方案

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    StarClaw Mobile 架构                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │  手机客户端   │ ←→  │  StarClaw   │ ←→  │  电脑执行器   │ │
│  │  (Android)   │     │   服务器      │     │  (PC端)      │ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │ 无障碍服务   │     │  多智能体    │     │  文件系统   │ │
│  │ App控制     │     │  协作引擎    │     │  浏览器     │ │
│  │ 本地执行    │     │  记忆系统    │     │  命令执行   │ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 三种部署模式对比

| 模式 | 描述 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|---------|
| **远程控制** | 手机控制电脑 | 开发简单、功能完整 | 需电脑在线 | 办公场景 |
| **本地执行** | 手机直接操作 | 无需电脑、响应快 | 需安卓开发 | 移动场景 |
| **云手机** | 云端虚拟手机 | 24小时在线 | 成本较高 | 企业级 |

---

## 三、分阶段开发路线图

### Phase 1: 远程控制模式（1-2周）

**目标**：手机 App 远程控制电脑上的 StarClaw

**技术方案**：
- 复用现有 StarClaw Server API
- 开发轻量级 React Native App
- 支持 WebSocket 实时通信

**核心功能**：
1. 聊天界面与 StarClaw 对话
2. 召唤明星团队（多智能体）
3. 远程执行电脑任务
4. 接收任务执行结果

**API 对接**：
```javascript
// 已有 API（直接复用）
POST /api/chat           // 对话接口
GET  /api/agents         // 获取明星列表
POST /api/execute/code   // 执行代码
POST /api/execute/file   // 文件操作
POST /api/execute/command // 执行命令
GET  /api/memory/search  // 记忆搜索
```

---

### Phase 2: 本地执行模式（3-4周）

**目标**：手机端直接控制手机 App 执行任务

**技术方案**：
- 安卓无障碍服务 (AccessibilityService)
- UI 自动化 (UIAutomator)
- 本地轻量模型（可选）

**核心功能**：
1. 自动打开指定 App
2. 自动点击、滑动、输入
3. 跨 App 协同操作
4. 任务执行监控

**Skill 定义格式**：
```json
{
  "id": "douyin-browse",
  "name": "抖音刷视频",
  "version": "1.0",
  "app": {
    "package": "com.ss.android.ugc.aweme",
    "name": "抖音"
  },
  "triggers": ["刷抖音", "看抖音视频", "抖音自动刷"],
  "actions": [
    { "type": "launch", "app": "com.ss.android.ugc.aweme" },
    { "type": "wait", "duration": 2000 },
    { "type": "scroll", "direction": "up", "repeat": 10, "interval": 5000 }
  ],
  "feedback": {
    "success": "已为您刷了 {count} 个视频",
    "failure": "操作失败，请检查抖音是否安装"
  }
}
```

---

### Phase 3: App 即 Skills 能力（2-3周）

**目标**：动态生成 App 操作 Skills，无需预定义

**技术方案**：
- VLA (Vision-Language-Action) 模型
- 屏幕内容理解
- 自动生成操作序列

**核心能力**：
```
用户指令: "帮我在淘宝搜索小米手机并加入购物车"

系统处理流程:
1. 理解意图 → 淘宝 + 搜索 + 加购物车
2. 屏幕识别 → 当前在桌面
3. 生成操作 → 
   - 点击淘宝图标
   - 等待加载
   - 点击搜索框
   - 输入"小米手机"
   - 点击搜索
   - 识别商品列表
   - 点击第一个商品
   - 点击加入购物车
4. 执行并监控
5. 结果反馈
```

---

## 四、技术实现细节

### 4.1 手机客户端架构（React Native）

```
starclaw-mobile/
├── src/
│   ├── screens/           # 页面
│   │   ├── ChatScreen.js  # 对话界面
│   │   ├── AgentScreen.js # 明星列表
│   │   └── TaskScreen.js  # 任务管理
│   ├── services/
│   │   ├── WebSocketService.js  # 实时通信
│   │   ├── ApiService.js        # API调用
│   │   └── AccessibilityService.js # 无障碍服务
│   ├── components/
│   │   ├── MessageBubble.js
│   │   ├── AgentCard.js
│   │   └── TaskItem.js
│   └── native/
│       └── AccessibilityModule.java  # 原生模块
├── android/
│   └── app/src/main/java/
│       └── AccessibilityService.java
└── package.json
```

### 4.2 无障碍服务核心代码

```java
// AccessibilityService.java
public class StarClawAccessibilityService extends AccessibilityService {
    
    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // 监听界面变化
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode != null) {
            processScreen(rootNode);
        }
    }
    
    // 执行点击
    public boolean clickByText(String text) {
        AccessibilityNodeInfo node = findNodeByText(text);
        if (node != null && node.isClickable()) {
            return node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
        }
        return false;
    }
    
    // 执行滚动
    public boolean scroll(String direction) {
        AccessibilityNodeInfo scrollable = findScrollableNode();
        if (scrollable != null) {
            int action = "up".equals(direction) 
                ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
                : AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD;
            return scrollable.performAction(action);
        }
        return false;
    }
    
    // 输入文本
    public boolean inputText(String text) {
        AccessibilityNodeInfo editNode = findEditableNode();
        if (editNode != null) {
            Bundle args = new Bundle();
            args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
            return editNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
        }
        return false;
    }
}
```

### 4.3 Skill 执行引擎

```javascript
// SkillExecutor.js
class SkillExecutor {
  constructor(accessibilityService) {
    this.service = accessibilityService;
  }
  
  async execute(skill, params = {}) {
    const results = [];
    
    for (const action of skill.actions) {
      const result = await this.executeAction(action, params);
      results.push(result);
      
      if (!result.success) {
        // 错误恢复机制
        const recovered = await this.recover(action, result.error);
        if (!recovered) {
          return { success: false, results, error: result.error };
        }
      }
      
      // 动态等待
      if (action.wait) {
        await this.delay(action.wait);
      }
    }
    
    return { success: true, results };
  }
  
  async executeAction(action, params) {
    switch (action.type) {
      case 'launch':
        return this.service.launchApp(action.app);
      case 'click':
        return this.service.clickByText(action.target);
      case 'scroll':
        return this.service.scroll(action.direction);
      case 'input':
        return this.service.inputText(action.text);
      case 'wait':
        return this.delay(action.duration);
      default:
        return { success: false, error: `Unknown action: ${action.type}` };
    }
  }
}
```

---

## 五、与现有 StarClaw 集成

### 5.1 服务器端扩展

```javascript
// server-with-mobile.js 新增路由

// 移动端专用 API
app.post('/api/mobile/skill', async (req, res) => {
  const { skillId, params, deviceId } = req.body;
  
  // 查找 Skill 定义
  const skill = await skillManager.getSkill(skillId);
  
  // 推送到移动端执行
  const result = await pushToDevice(deviceId, {
    type: 'execute_skill',
    skill,
    params
  });
  
  res.json(result);
});

// 移动端设备注册
app.post('/api/mobile/register', (req, res) => {
  const { deviceId, deviceInfo, capabilities } = req.body;
  
  deviceRegistry.register(deviceId, {
    ...deviceInfo,
    capabilities,
    lastSeen: Date.now()
  });
  
  res.json({ success: true, message: '设备已注册' });
});

// 移动端状态上报
app.post('/api/mobile/heartbeat', (req, res) => {
  const { deviceId, status } = req.body;
  deviceRegistry.updateStatus(deviceId, status);
  res.json({ success: true });
});
```

### 5.2 WebSocket 实时通信

```javascript
// WebSocket 服务端扩展
io.on('connection', (socket) => {
  socket.on('mobile:register', (data) => {
    socket.join(`device:${data.deviceId}`);
    console.log(`Mobile device registered: ${data.deviceId}`);
  });
  
  socket.on('mobile:skill:result', (data) => {
    // 接收移动端执行结果
    eventBus.emit('skill:completed', data);
  });
  
  socket.on('mobile:screen:update', (data) => {
    // 接收屏幕截图（用于 VLA 分析）
    visionAnalyzer.analyze(data.screenshot);
  });
});

// 推送任务到移动端
function pushToDevice(deviceId, task) {
  io.to(`device:${deviceId}`).emit('task:execute', task);
}
```

---

## 六、预置 Skills 清单

### 6.1 社交类

| Skill | App | 功能 | 触发词 |
|-------|-----|------|--------|
| 微信自动回复 | 微信 | 自动回复消息 | "自动回复微信" |
| 微信群发 | 微信 | 批量发送消息 | "群发消息" |
| 朋友圈点赞 | 微信 | 自动点赞朋友圈 | "点赞朋友圈" |
| 微博签到 | 微博 | 每日签到 | "微博签到" |

### 6.2 购物类

| Skill | App | 功能 | 触发词 |
|-------|-----|------|--------|
| 淘宝搜索 | 淘宝 | 搜索并浏览商品 | "淘宝搜索XXX" |
| 京东签到 | 京东 | 领取京豆 | "京东签到" |
| 拼多多助力 | 拼多多 | 自动助力 | "帮我助力" |

### 6.3 娱乐类

| Skill | App | 功能 | 触发词 |
|-------|-----|------|--------|
| 抖音刷视频 | 抖音 | 自动刷视频 | "刷抖音" |
| B站投币 | B站 | 自动投币 | "B站投币" |
| 网易云签到 | 网易云 | 每日签到 | "网易云签到" |

### 6.4 工具类

| Skill | App | 功能 | 触发词 |
|-------|-----|------|--------|
| 支付宝收能量 | 支付宝 | 蚂蚁森林 | "收能量" |
| 钉钉打卡 | 钉钉 | 远程打卡 | "钉钉打卡" |
| 飞书签到 | 飞书 | 每日签到 | "飞书签到" |

---

## 七、安全与隐私

### 7.1 权限管理

```javascript
// 权限分级
const PERMISSION_LEVELS = {
  'read_screen': 1,      // 读取屏幕内容
  'click': 2,            // 模拟点击
  'input': 3,            // 输入文本
  'launch_app': 2,       // 启动应用
  'accessibility': 4,    // 完全无障碍权限
  'notification': 2      // 读取通知
};

// Skill 执行前检查权限
async function checkPermission(skill, devicePermissions) {
  const required = skill.permissions || [];
  for (const perm of required) {
    const level = PERMISSION_LEVELS[perm] || 1;
    if (!devicePermissions.includes(perm)) {
      return { allowed: false, reason: `缺少权限: ${perm}` };
    }
  }
  return { allowed: true };
}
```

### 7.2 敏感操作确认

```javascript
// 敏感操作需要用户确认
const SENSITIVE_ACTIONS = [
  'payment',        // 支付操作
  'send_message',   // 发送消息
  'modify_setting', // 修改设置
  'delete_data'     // 删除数据
];

async function executeWithConfirm(action, context) {
  if (SENSITIVE_ACTIONS.includes(action.type)) {
    // 推送确认请求到用户
    const confirmed = await requestUserConfirm({
      title: '敏感操作确认',
      message: `即将执行: ${action.description}`,
      timeout: 30000
    });
    
    if (!confirmed) {
      return { success: false, reason: '用户取消' };
    }
  }
  
  return executeAction(action);
}
```

---

## 八、下一步行动

### 立即可做（无需开发）

1. **使用现有飞书/钉钉接入**
   - 已支持飞书消息控制
   - 手机飞书 App 直接对话 StarClaw
   - 召唤明星团队执行任务

2. **局域网访问**
   - 手机浏览器访问 `http://电脑IP:3000/voice.html`
   - 无需安装 App 即可使用

### 短期开发（1-2周）

1. **React Native 移动端壳**
   - 封装 Web 界面为 App
   - 支持推送通知
   - 支持语音输入

### 中期开发（3-4周）

1. **安卓无障碍服务**
   - 实现 App 控制
   - 预置 10+ 常用 Skills
   - 支持自定义 Skill 编辑

### 长期规划（2-3月）

1. **VLA 模型集成**
   - 自动生成 Skills
   - 跨 App 协同
   - 复杂任务规划

---

## 附录：参考资源

- 红手指 Operator: https://github.com/kangarooking/mobileclaw
- ApkClaw: https://github.com/apkclaw-team/ApkClaw
- OpenClaw 官方: https://github.com/openclaw/openclaw
- Android AccessibilityService: https://developer.android.com/reference/android/accessibilityservice/AccessibilityService

---

*设计时间: 2026-04-03*
*版本: v1.0*
