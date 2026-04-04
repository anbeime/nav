# Skill: 搜索引擎 (search_engine)

## 适用 Agent
CTO (OpenClaw创始人)、CEO (战略决策者)、CMO (市场分析)

## 功能描述
多搜索引擎集成技能，整合17个搜索引擎（8个国内+9个国际），支持高级搜索操作符、时间过滤、站内搜索、隐私引擎和WolframAlpha知识查询。无需API密钥，直接通过web_fetch调用。

## 支持的搜索引擎

### 国内引擎 (8个)
| 引擎 | URL模板 | 特点 |
|------|---------|------|
| **百度** | `https://www.baidu.com/s?wd={keyword}` | 中文搜索首选 |
| **必应中国** | `https://cn.bing.com/search?q={keyword}&ensearch=0` | 中英双语 |
| **必应国际** | `https://cn.bing.com/search?q={keyword}&ensearch=1` | 英文搜索 |
| **搜狗** | `https://www.sogou.com/web?query={keyword}` | 微信内容搜索 |
| **360搜索** | `https://www.so.com/s?q={keyword}` | 安全搜索 |
| **神马** | `https://m.sm.cn/s?q={keyword}` | 移动端优化 |
| **头条搜索** | `https://www.toutiao.com/search/?keyword={keyword}` | 资讯内容 |
| **知乎搜索** | `https://www.zhihu.com/search?type=content&q={keyword}` | 知识问答 |

### 国际引擎 (9个)
| 引擎 | URL模板 | 特点 |
|------|---------|------|
| **Google** | `https://www.google.com/search?q={keyword}` | 全球最大 |
| **Bing** | `https://www.bing.com/search?q={keyword}` | 微软搜索 |
| **DuckDuckGo** | `https://duckduckgo.com/html/?q={keyword}` | 隐私保护 |
| **Brave** | `https://search.brave.com/search?q={keyword}` | 独立索引 |
| **Startpage** | `https://www.startpage.com/do/search?q={keyword}` | Google结果+隐私 |
| **Qwant** | `https://www.qwant.com/?q={keyword}` | 欧盟GDPR合规 |
| **Yandex** | `https://yandex.com/search/?text={keyword}` | 俄语区域首选 |
| **Naver** | `https://search.naver.com/search.naver?query={keyword}` | 韩语区域首选 |
| **WolframAlpha** | `https://www.wolframalpha.com/input?i={query}` | 知识计算引擎 |

## 输入格式
```json
{
  "query": "搜索关键词",
  "engines": ["baidu", "google"],
  "filters": {
    "site": "github.com",
    "filetype": "pdf",
    "time": "week",
    "exact": true
  },
  "options": {
    "maxResults": 10,
    "includeSnippets": true
  }
}
```

## 输出格式
```markdown
# 搜索结果: [查询词]

## 搜索概览
- 使用引擎: 百度、Google
- 结果数量: 20条
- 搜索耗时: 2.3秒

## 百度结果 (10条)

### 1. [标题]
- 链接: https://...
- 摘要: ...
- 时间: 2024-01-15

### 2. [标题]
...

## Google结果 (10条)

### 1. [标题]
...

## 搜索建议
- 相关搜索: ...
- 推荐扩展: ...
```

## 高级搜索操作符

### 站内搜索
```
site:github.com python async
site:zhihu.com 人工智能
```

### 文件类型
```
filetype:pdf 机器学习教程
filetype:ppt 产品设计
```

### 精确匹配
```
"machine learning"
"深度学习框架"
```

### 排除词
```
python -snake
苹果 -水果
```

### 组合搜索
```
(cat OR dog) training
(猫 OR 狗) 训练
```

## 时间过滤参数

| 参数 | 含义 | 示例 |
|------|------|------|
| `tbs=qdr:h` | 过去1小时 | 最新资讯 |
| `tbs=qdr:d` | 过去24小时 | 今日热点 |
| `tbs=qdr:w` | 过去1周 | 周度动态 |
| `tbs=qdr:m` | 过去1月 | 月度趋势 |
| `tbs=qdr:y` | 过去1年 | 年度回顾 |

## 使用示例

### 基础搜索
```javascript
// 百度搜索
web_fetch({"url": "https://www.baidu.com/s?wd=人工智能"})

// Google搜索
web_fetch({"url": "https://www.google.com/search?q=AI+trends"})
```

### 高级搜索
```javascript
// 站内搜索 + 时间过滤
web_fetch({"url": "https://www.google.com/search?q=site:github.com+react+hooks&tbs=qdr:w"})

// 隐私搜索
web_fetch({"url": "https://duckduckgo.com/html/?q=privacy+tools"})

// DuckDuckGo Bangs快捷搜索
web_fetch({"url": "https://duckduckgo.com/html/?q=!gh+tensorflow"})  // GitHub搜索
web_fetch({"url": "https://duckduckgo.com/html/?q=!so+python+error"}) // Stack Overflow
```

### 知识计算
```javascript
// WolframAlpha查询
web_fetch({"url": "https://www.wolframalpha.com/input?i=100+USD+to+CNY"})
web_fetch({"url": "https://www.wolframalpha.com/input?i=integrate+x^2+dx"})
web_fetch({"url": "https://www.wolframalpha.com/input?i=weather+in+Beijing"})
```

## DuckDuckGo Bangs 快捷方式

| Bang | 目标站点 | 用途 |
|------|----------|------|
| `!g` | Google | 快速切换Google |
| `!gh` | GitHub | 代码仓库搜索 |
| `!so` | Stack Overflow | 技术问答搜索 |
| `!w` | Wikipedia | 百科查询 |
| `!yt` | YouTube | 视频搜索 |
| `!r` | Reddit | 社区讨论 |
| `!mdn` | MDN | Web开发文档 |
| `!npm` | npm | Node包搜索 |

## 使用场景

### 1. 技术调研
```
用户: "调研一下2024年最流行的React状态管理库"
操作:
1. Google搜索 "React state management 2024" + 时间过滤
2. GitHub搜索 star数排序
3. Stack Overflow讨论热度
```

### 2. 竞品分析
```
用户: "分析竞品XXX的最新营销策略"
操作:
1. 百度搜索品牌名 + 时间过滤
2. 微信内容搜索(搜狗)
3. 社交媒体搜索
```

### 3. 学术研究
```
用户: "查找关于大语言模型的最新论文"
操作:
1. Google Scholar搜索
2. arXiv最新论文
3. filetype:pdf筛选
```

### 4. 实时热点
```
用户: "今天科技圈有什么大新闻"
操作:
1. Google News + tbs=qdr:d
2. 百度资讯搜索
3. 头条搜索
```

## 最佳实践

1. **引擎选择策略**
   - 中文内容: 百度 > 搜狗 > 360
   - 国际内容: Google > Bing > DuckDuckGo
   - 技术内容: Google + !gh + !so
   - 隐私需求: DuckDuckGo > Startpage > Brave

2. **搜索效率优化**
   - 使用精确匹配减少噪音
   - 组合site:限定可信来源
   - 时间过滤获取最新内容
   - Bangs快捷直达目标站点

3. **结果处理**
   - 交叉验证多个引擎结果
   - 注意区分广告和自然结果
   - 验证信息时效性和来源可信度

## 注意事项

- 部分搜索引擎可能需要代理访问
- 搜索结果可能因地域而异
- 高频搜索可能触发反爬机制
- 建议优先使用隐私引擎保护用户数据

## 版本历史

- v1.0.0 (2024-01-01): 初始版本，支持17个搜索引擎
