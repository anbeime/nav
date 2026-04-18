/**
 * AI工具自动同步脚本 - 支持浏览器抓取
 *
 * 使用 Playwright 从 aibase.com 抓取最新AI工具数据
 *
 * 安装依赖: npm install playwright axios
 * 运行: node scripts/sync-ai-tools-puppeteer.js
 */

const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");

// 配置
const CONFIG = {
  outputFile: path.join(__dirname, "../data/db.json"),
  dataSources: [
    {
      name: "aibase",
      baseUrl: "https://app.aibase.com",
      toolsUrl: "https://app.aibase.com/tools",
      categories: [
        { id: "chatbot", name: "AI聊天", keywords: ["LLM", "Chat", "AI助手"] },
        {
          id: "image",
          name: "AI图像",
          keywords: ["绘画", "设计", "图像", "Midjourney"],
        },
        { id: "video", name: "AI视频", keywords: ["视频", "剪辑", "数字人"] },
        { id: "code", name: "AI编程", keywords: ["编程", "代码", "IDE"] },
        { id: "writing", name: "AI写作", keywords: ["写作", "文案", "内容"] },
      ],
    },
  ],
};

/**
 * 简单的HTTP抓取 - 适合静态页面
 */
async function fetchWithAxios(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });
    return response.data;
  } catch (e) {
    console.error(`[Fetch] ${url} 失败:`, e.message);
    return null;
  }
}

/**
 * 从 sitemap 获取所有工具页面
 */
async function fetchSitemapTools() {
  console.log("[Sync] 正在获取sitemap...");

  // aibase 的 sitemap
  const sitemapUrl = "https://app.aibase.com/xml/sitemap.xml";
  const html = await fetchWithAxios(sitemapUrl);

  if (!html) return [];

  // 解析sitemap（简化版）
  const toolUrls = [];
  const urlMatches = html.match(
    /<loc>(https:\/\/app\.aibase\.com\/details\/[^<]+)<\/loc>/g,
  );

  if (urlMatches) {
    urlMatches.slice(0, 200).forEach((match) => {
      const url = match.replace(/<loc>|<\/loc>/g, "");
      const id = url.match(/\/details\/(\d+)/)?.[1];
      if (id) {
        toolUrls.push({ url, id });
      }
    });
  }

  console.log(`[Sync] 找到 ${toolUrls.length} 个工具页面`);
  return toolUrls;
}

/**
 * 获取单个工具详情（模拟）
 */
async function fetchToolDetail(toolId) {
  // 实际应该请求 API 或页面
  // 这里返回模拟数据

  // 尝试获取 aibase 的 API
  const apiUrl = `https://app.aibase.com/api/tool/detail?id=${toolId}`;
  const data = await fetchWithAxios(apiUrl);

  if (data) {
    try {
      const json = JSON.parse(data);
      if (json.code === 200 && json.data) {
        return {
          name: json.data.name,
          url: json.data.url,
          description: json.data.description,
          tags: json.data.tags?.split(",") || [],
          free: json.data.price === "free",
          region: json.data.region === "cn" ? ["cn"] : ["global"],
        };
      }
    } catch (e) {}
  }

  return null;
}

/**
 * 主同步函数
 */
async function syncAItools() {
  console.log("[Sync] ========== AI工具同步开始 ==========\n");

  // 加载现有数据
  let existingTools = [];
  try {
    const data = JSON.parse(await fs.readFile(CONFIG.outputFile, "utf-8"));
    data.scenarios?.forEach((s) => {
      existingTools.push(...s.tools.map((t) => ({ ...t, scenario: s.name })));
    });
    console.log(`[Sync] 已加载 ${existingTools.length} 个现有工具\n`);
  } catch (e) {
    console.log("[Sync] 无现有数据，将创建新文件\n");
  }

  // 获取工具列表
  const toolUrls = await fetchSitemapTools();

  // 收集新工具（限制数量避免超时）
  const newTools = [];
  const limit = 50;

  for (let i = 0; i < Math.min(toolUrls.length, limit); i++) {
    const tool = toolUrls[i];

    process.stdout.write(
      `\r[Sync] 进度: ${i + 1}/${Math.min(toolUrls.length, limit)}`,
    );

    // 获取详情
    const detail = await fetchToolDetail(tool.id);
    if (detail) {
      newTools.push(detail);
    }

    // 避免请求过快
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n\n[Sync] 获取到 ${newTools.length} 个新工具`);

  // 合并去重
  const toolMap = new Map();
  existingTools.forEach((t) => toolMap.set(t.name.toLowerCase(), t));
  newTools.forEach((t) => {
    if (!toolMap.has(t.name.toLowerCase())) {
      toolMap.set(t.name.toLowerCase(), t);
    }
  });

  const mergedTools = Array.from(toolMap.values());
  console.log(`[Sync] 合并后共 ${mergedTools.length} 个工具\n`);

  // 按场景分类
  const scenarios = categorizeTools(mergedTools);

  // 保存
  const output = {
    version: new Date().toISOString().slice(0, 10),
    lastSync: new Date().toISOString(),
    totalTools: mergedTools.length,
    syncSource: "aibase.com",
    scenarios,
    regions: [
      { id: "global", name: "全球", icon: "🌍" },
      { id: "cn", name: "中国", icon: "🇨🇳" },
    ],
  };

  await fs.writeFile(
    CONFIG.outputFile,
    JSON.stringify(output, null, 2),
    "utf-8",
  );

  console.log("[Sync] ========== 同步完成 ==========");
  console.log(`✅ 共 ${mergedTools.length} 个工具已保存`);

  return output;
}

/**
 * 按场景分类工具
 */
function categorizeTools(tools) {
  const scenarios = [
    {
      id: "smart-office",
      name: "智能办公",
      icon: "💼",
      description: "AI赋能的高效办公体验",
      tools: [],
    },
    {
      id: "content-creation",
      name: "内容创作",
      icon: "✍️",
      description: "AI赋能的内容创作与营销",
      tools: [],
    },
    {
      id: "ai-programming",
      name: "AI编程",
      icon: "💻",
      description: "智能编程辅助与开发工具",
      tools: [],
    },
    {
      id: "video-production",
      name: "视频制作",
      icon: "🎬",
      description: "AI赋能的视频创作与处理",
      tools: [],
    },
    {
      id: "design-creative",
      name: "设计创意",
      icon: "🎨",
      description: "AI驱动的设计与创意工具",
      tools: [],
    },
    {
      id: "marketing-seo",
      name: "营销SEO",
      icon: "📈",
      description: "AI驱动的营销增长与SEO优化",
      tools: [],
    },
    {
      id: "education-learning",
      name: "教育学习",
      icon: "📚",
      description: "AI赋能的个性化学习与教育",
      tools: [],
    },
    {
      id: "ecommerce-operation",
      name: "电商运营",
      icon: "🛒",
      description: "AI驱动的电商运营与增长",
      tools: [],
    },
  ];

  tools.forEach((tool) => {
    const tags = (tool.tags || []).join(" ") + " " + (tool.description || "");
    const categoryMap = {
      "smart-office": ["聊天", "LLM", "助手", "搜索", "笔记", "办公"],
      "content-creation": ["写作", "文案", "内容", "营销", "博客"],
      "ai-programming": ["编程", "代码", "IDE", "开发"],
      "video-production": ["视频", "剪辑", "数字人", "动画"],
      "design-creative": ["设计", "绘画", "图像", "抠图"],
      "marketing-seo": ["营销", "SEO", "推广"],
      "education-learning": ["教育", "学习", "课程"],
      "ecommerce-operation": ["电商", "商城", " shop"],
    };

    let assigned = false;
    for (const [sid, keywords] of Object.entries(categoryMap)) {
      if (keywords.some((k) => tags.toLowerCase().includes(k))) {
        scenarios.find((s) => s.id === sid).tools.push(tool);
        assigned = true;
        break;
      }
    }
    if (!assigned) scenarios[0].tools.push(tool);
  });

  return scenarios.filter((s) => s.tools.length > 0);
}

// 运行
syncAItools().catch(console.error);
