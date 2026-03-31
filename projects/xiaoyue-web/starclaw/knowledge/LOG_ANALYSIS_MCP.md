# StarClaw 日志分析优化架构

> 参考 openEuler 日志异常检测 MCP 架构设计

## 核心问题

海量日志直接喂给大模型存在：
- 上下文窗口不足
- 注意力分散
- 成本高昂

## 解决方案

采用 **"预处理（降噪/浓缩）+ 多策略融合 + 大模型精析"** 的工程化架构

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                    StarClaw 日志分析管道                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1.【收集】实时收集各 Agent 日志                                   │
│       ├── Agent 对话日志                                         │
│       ├── 任务执行日志                                           │
│       ├── 系统状态日志                                           │
│       └── 错误/异常日志                                          │
│                                                                 │
│  2.【预处理】日志降噪与浓缩                                        │
│       ├── 关键字过滤: ERROR | FAIL | Timeout | Exception         │
│       ├── 时间窗口聚合: 按分钟/小时分组                            │
│       └── Agent 维度聚合: 按 agent_id 分组                        │
│                                                                 │
│  3.【初筛】优先级标记                                             │
│       ├── P0: 系统崩溃/服务不可用                                 │
│       ├── P1: 任务执行失败/超时                                   │
│       ├── P2: 性能下降/资源警告                                   │
│       └── P3: 常规信息日志                                       │
│                                                                 │
│  4.【精析】大模型深度分析                                          │
│       ├── 仅对 P0/P1 高优先级日志                                  │
│       ├── 调用 GLM-4-Flash 进行根因分析                           │
│       └── 生成结构化诊断报告                                      │
│                                                                 │
│  5.【反馈】自动化响应                                             │
│       ├── 生成告警通知                                           │
│       ├── 提供修复建议                                           │
│       └── 触发自愈流程（如重启服务）                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 成本效益分析

| 场景 | 输入量 | Token 消耗 | 分析质量 | 总成本 |
|------|--------|-----------|---------|-------|
| 原始分析 | 1000行日志 | ~5000 tokens | 中等 | 高 |
| 预处理后 | 50行关键日志 | ~250 tokens | 高 | 低 |

**节省比例**: 约 95% Token 消耗

## 实现代码

```javascript
// 日志预处理器
class LogPreprocessor {
    // 关键字过滤
    filterByKeywords(logs, keywords = ['ERROR', 'FAIL', 'Timeout', 'Exception']) {
        return logs.filter(log => 
            keywords.some(kw => log.message.includes(kw))
        );
    }

    // 时间窗口聚合
    aggregateByTimeWindow(logs, windowMs = 60000) {
        const groups = {};
        logs.forEach(log => {
            const window = Math.floor(log.timestamp / windowMs) * windowMs;
            if (!groups[window]) groups[window] = [];
            groups[window].push(log);
        });
        return groups;
    }

    // 优先级标记
    markPriority(logs) {
        return logs.map(log => {
            if (log.message.includes('crash') || log.message.includes('不可用')) {
                return { ...log, priority: 'P0' };
            }
            if (log.message.includes('fail') || log.message.includes('timeout')) {
                return { ...log, priority: 'P1' };
            }
            if (log.message.includes('warn') || log.message.includes('slow')) {
                return { ...log, priority: 'P2' };
            }
            return { ...log, priority: 'P3' };
        });
    }
}
```

---

*此架构将用于 StarClaw 的自我诊断和评测验证*
