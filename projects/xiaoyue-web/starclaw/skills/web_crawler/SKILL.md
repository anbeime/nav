# Skill: 网页爬取 (web_crawler)

## 适用 Agent
CTO (OpenClaw创始人)、CMO (市场分析)、战略分析师

## 功能描述
专业的网页内容爬取技能，能够智能抓取网页内容、提取结构化信息、处理 JavaScript 渲染页面，并支持多种数据格式导出。适用于市场调研、竞品分析、内容采集等场景。

## 核心功能

### 1. 基础网页抓取
- HTML 内容提取
- 文本内容清洗
- 图片链接提取
- 元信息获取 (标题、描述、关键词)

### 2. 智能内容提取
- 正文内容识别
- 标题层级分析
- 代码块提取
- 表格数据解析

### 3. 动态页面处理
- JavaScript 渲染支持
- 等待页面加载
- 交互式元素点击
- 滚动加载内容

### 4. 数据导出格式
- Markdown
- JSON
- CSV
- HTML (清理后)
- 纯文本

## 输入格式
```json
{
  "url": "要爬取的网页地址",
  "mode": "html|markdown|json",
  "options": {
    "extractText": true,
    "includeImages": false,
    "includeLinks": true,
    "waitForSelector": ".content",
    "scrollToBottom": false,
    "timeout": 30000,
    "userAgent": "Mozilla/5.0..."
  }
}
```

## 输出格式

### Markdown 格式输出
```markdown
# [网页标题]

## 基本信息
- URL: [原始链接]
- 抓取时间: [时间戳]
- 状态码: [HTTP 状态码]

## 正文内容

[提取的正文内容...]

### 关键信息
- 文字数: [统计]
- 图片数: [统计]
- 链接数: [统计]

## 相关链接
1. [链接1标题](链接1URL)
2. [链接2标题](链接2URL)

## 元数据
```json
{
  "title": "网页标题",
  "description": "网页描述",
  "keywords": ["关键词1", "关键词2"],
  "author": "作者",
  "publishedTime": "发布时间"
}
```

### JSON 格式输出
```json
{
  "success": true,
  "url": "https://example.com",
  "title": "网页标题",
  "content": {
    "text": "提取的正文内容...",
    "html": "清理后的HTML",
    "markdown": "Markdown格式内容"
  },
  "metadata": {
    "description": "网页描述",
    "keywords": ["关键词"],
    "author": "作者"
  },
  "images": [
    {
      "src": "https://example.com/image.jpg",
      "alt": "图片描述"
    }
  ],
  "links": [
    {
      "href": "https://example.com/link",
      "text": "链接文本"
    }
  ],
  "stats": {
    "textLength": 1500,
    "imageCount": 3,
    "linkCount": 10
  }
}
```

## 使用示例

### 基础爬取
```javascript
// 简单网页抓取
web_crawler({
  url: "https://example.com/article",
  mode: "markdown"
})
```

### 动态页面抓取
```javascript
// 需要等待页面加载的网站
web_crawler({
  url: "https://react-app.com",
  mode: "html",
  options: {
    waitForSelector: ".app-loaded",
    timeout: 60000,
    extractText: true
  }
})
```

### 滚动加载内容
```javascript
// 无限滚动页面
web_crawler({
  url: "https://social-media.com/feed",
  mode: "json",
  options: {
    scrollToBottom: true,
    extractText: true,
    maxScrolls: 5  // 最多滚动5次
  }
})
```

### 提取特定内容
```javascript
// 只提取特定区域
web_crawler({
  url: "https://news-site.com",
  mode: "markdown",
  options: {
    waitForSelector: ".article-content",
    extractText: true,
    includeImages: true
  }
})
```

## 高级功能

### 1. 网站反爬虫绕过
- 自定义 User-Agent
- 请求延迟设置
- 代理支持
- Referer 和 Cookie 管理

### 2. 内容类型识别
- 新闻文章
- 博客文章
- 产品页面
- 技术文档
- 社交媒体

### 3. 多语言支持
- 自动检测页面语言
- 中文、英文、日文、韩文等
- 编码自动转换

### 4. 智能去噪
- 去除广告内容
- 去除导航菜单
- 去除页脚信息
- 保留核心正文

## 使用场景

### 市场调研
```javascript
// 竞品网站分析
web_crawler({
  url: "https://competitor.com/products",
  mode: "json",
  options: {
    extractText: true,
    includeLinks: true,
    timeout: 60000
  }
})
```

### 内容采集
```javascript
// 博客文章采集
web_crawler({
  url: "https://tech-blog.com/article",
  mode: "markdown",
  options: {
    includeImages: true,
    extractText: true,
    cleanHTML: true
  }
})
```

### 价格监控
```javascript
// 电商价格抓取
web_crawler({
  url: "https://ecommerce.com/product",
  mode: "json",
  options: {
    waitForSelector: ".price-section",
    extractText: true,
    timeout: 45000
  }
})
```

### 学术研究
```javascript
// 论文信息提取
web_crawler({
  url: "https://arxiv.org/abs/2305.xxxxx",
  mode: "markdown",
  options: {
    includeLinks: true,
    extractText: true,
    userAgent: "AcademicBot/1.0"
  }
})
```

## 最佳实践

### 1. 频率控制
- 避免高频请求
- 设置合理延迟
- 遵守 robots.txt
- 尊重网站使用条款

### 2. 错误处理
```javascript
try {
  const result = await web_crawler({
    url: "https://example.com",
    mode: "markdown"
  });
  
  if (result.success) {
    // 处理成功结果
    console.log(`抓取成功: ${result.title}`);
    console.log(`内容长度: ${result.content.text.length} 字符`);
  } else {
    // 处理错误
    console.error(`抓取失败: ${result.error}`);
  }
} catch (error) {
  console.error(`系统错误: ${error.message}`);
}
```

### 3. 性能优化
- 使用缓存避免重复抓取
- 并发请求控制
- 内容去重
- 增量更新

### 4. 数据存储
```javascript
// 建议的存储结构
const crawlResult = {
  url: result.url,
  title: result.title,
  content: result.content.text,
  metadata: result.metadata,
  images: result.images,
  crawledAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
```

## 注意事项

### 合法性
- 遵守目标网站的 robots.txt
- 尊重版权和内容所有权
- 避免侵犯隐私
- 遵守数据保护法规

### 技术限制
- 部分网站需要 JavaScript 渲染
- 动态内容可能需要等待
- 反爬虫机制可能阻止访问
- 网站结构变化可能导致提取失败

### 性能考虑
- 大页面可能消耗较多内存
- 动态页面加载时间较长
- 图片下载可能消耗带宽
- 并发请求需要控制频率

## 故障排除

### 常见问题
1. **超时错误**: 增加 timeout 参数
2. **内容提取失败**: 检查 waitForSelector 是否正确
3. **编码问题**: 指定正确的页面编码
4. **JavaScript 错误**: 使用 headless browser 模式

### 调试建议
```javascript
// 启用调试模式
web_crawler({
  url: "https://example.com",
  mode: "html",
  options: {
    debug: true,
    logLevel: "verbose",
    screenshotOnError: true
  }
})
```

## 版本历史

- v1.0.0 (2024-01-01): 初始版本
  - 基础网页抓取
  - Markdown/JSON/HTML 导出
  - 内容清洗和格式化
