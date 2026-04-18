/**
 * AI工具自动同步脚本
 * 从 aibase.com 等网站抓取最新AI工具数据并同步到 db.json
 *
 * 运行方式: node scripts/sync-ai-tools.js
 */

const fs = require("fs").promises;
const path = require("path");

const CONFIG = {
  // 数据源配置
  sources: [
    {
      name: "aibase",
      url: "https://app.aibase.com/tools",
      apiUrl: "https://app.aibase.com/api/tools", // 需确认实际API
      sitemap: "https://app.aibase.com/xml/sitemap.xml",
    },
  ],

  // 输出文件
  outputFile: path.join(__dirname, "../data/db.json"),

  // 同步间隔（毫秒）- 每天同步一次
  syncInterval: 24 * 60 * 60 * 1000,

  // 场景映射 - 将源分类映射到本地分类
  categoryMap: {
    chatbot: "smart-office",
    image: "content-creation",
    video: "video-production",
    code: "ai-programming",
    writing: "content-creation",
    design: "design-creative",
    marketing: "marketing-seo",
    productivity: "smart-office",
    data: "data-analysis",
    education: "education-learning",
    ecommerce: "ecommerce-operation",
    finance: "quant-research",
  },
};

class AISyncService {
  constructor() {
    this.tools = [];
    this.lastSync = null;
  }

  async init() {
    // 加载现有数据
    try {
      const existing = await fs.readFile(CONFIG.outputFile, "utf-8");
      const data = JSON.parse(existing);
      this.lastSync = data.lastSync;
      console.log(`[Sync] 已加载现有数据，共 ${data.totalTools || 0} 个工具`);
    } catch (e) {
      console.log("[Sync] 无现有数据，将创建新文件");
    }
  }

  // 从 aibase 抓取工具数据
  async fetchFromAibase() {
    console.log("[Sync] 正在从 aibase.com 获取数据...");

    // 模拟数据 - 实际需要抓取或调用API
    const newTools = [
      {
        name: "ChatGPT",
        url: "https://chat.openai.com",
        tags: ["LLM", "聊天"],
        free: true,
        region: ["global"],
      },
      {
        name: "Claude",
        url: "https://claude.ai",
        tags: ["LLM", "分析"],
        free: true,
        region: ["global"],
      },
      {
        name: "Gemini",
        url: "https://gemini.google.com",
        tags: ["LLM", "多模态"],
        free: true,
        region: ["global"],
      },
      {
        name: "DeepSeek",
        url: "https://deepseek.com",
        tags: ["LLM", "开源"],
        free: true,
        region: ["global"],
      },
      {
        name: "通义千问",
        url: "https://tongyi.aliyun.com",
        tags: ["LLM", "阿里"],
        free: true,
        region: ["cn"],
      },
      {
        name: "文心一言",
        url: "https://yiyan.baidu.com",
        tags: ["LLM", "百度"],
        free: true,
        region: ["cn"],
      },
      {
        name: "Kimi",
        url: "https://kimi.moonshot.cn",
        tags: ["LLM", "长文本"],
        free: true,
        region: ["cn"],
      },
      {
        name: "豆包",
        url: "https://www.doubao.com",
        tags: ["LLM", "字节"],
        free: true,
        region: ["cn"],
      },
      {
        name: "Midjourney",
        url: "https://midjourney.com",
        tags: ["AI绘画", "设计"],
        free: false,
        region: ["global"],
      },
      {
        name: "DALL-E",
        url: "https://openai.com/dall-e-3",
        tags: ["AI绘画", "图像"],
        free: false,
        region: ["global"],
      },
      {
        name: "Stable Diffusion",
        url: "https://stability.ai",
        tags: ["AI绘画", "开源"],
        free: true,
        region: ["global"],
      },
      {
        name: "通义万相",
        url: "https://tongyi.aliyun.com/wanxiang",
        tags: ["AI绘画", "阿里"],
        free: true,
        region: ["cn"],
      },
      {
        name: "文心一格",
        url: "https://yige.baidu.com",
        tags: ["AI绘画", "百度"],
        free: true,
        region: ["cn"],
      },
      {
        name: "可灵",
        url: "https://klingai.com",
        tags: ["视频生成", "快手"],
        free: true,
        region: ["cn"],
      },
      {
        name: "Runway",
        url: "https://runwayml.com",
        tags: ["视频生成", "AI"],
        free: true,
        region: ["global"],
      },
      {
        name: "Pika",
        url: "https://pika.art",
        tags: ["视频生成", "AI"],
        free: true,
        region: ["global"],
      },
      {
        name: "HeyGen",
        url: "https://heygen.com",
        tags: ["数字人", "视频"],
        free: true,
        region: ["global"],
      },
      {
        name: "GitHub Copilot",
        url: "https://github.com/features/copilot",
        tags: ["编程", "AI"],
        free: false,
        region: ["global"],
      },
      {
        name: "Cursor",
        url: "https://cursor.sh",
        tags: ["编程", "AI编辑器"],
        free: true,
        region: ["global"],
      },
      {
        name: "Codeium",
        url: "https://codeium.com",
        tags: ["编程", "补全"],
        free: true,
        region: ["global"],
      },
      {
        name: "Windsurf",
        url: "https://windsurf.ai",
        tags: ["编程", "AI IDE"],
        free: true,
        region: ["global"],
      },
      {
        name: "Perplexity",
        url: "https://perplexity.ai",
        tags: ["AI搜索", "研究"],
        free: true,
        region: ["global"],
      },
      {
        name: "Notion AI",
        url: "https://notion.so",
        tags: ["笔记", "AI"],
        free: true,
        region: ["global"],
      },
      {
        name: "Grammarly",
        url: "https://grammarly.com",
        tags: ["写作", "语法"],
        free: true,
        region: ["global"],
      },
      {
        name: "Jasper",
        url: "https://jasper.ai",
        tags: ["营销", "写作"],
        free: false,
        region: ["global"],
      },
      {
        name: "Zapier",
        url: "https://zapier.com",
        tags: ["自动化", "工作流"],
        free: true,
        region: ["global"],
      },
      {
        name: "Make",
        url: "https://make.com",
        tags: ["自动化", "无代码"],
        free: true,
        region: ["global"],
      },
      {
        name: "Canva AI",
        url: "https://canva.com",
        tags: ["设计", "AI"],
        free: true,
        region: ["global"],
      },
      {
        name: "Remove.bg",
        url: "https://remove.bg",
        tags: ["抠图", "AI"],
        free: true,
        region: ["global"],
      },
      {
        name: "ElevenLabs",
        url: "https://elevenlabs.io",
        tags: ["语音合成", "配音"],
        free: true,
        region: ["global"],
      },
    ];

    return newTools;
  }

  // 合并新旧数据（去重）
  mergeTools(existingTools, newTools) {
    const toolMap = new Map();

    // 现有工具
    existingTools.forEach((t) => {
      toolMap.set(t.name.toLowerCase(), t);
    });

    // 新工具
    newTools.forEach((t) => {
      const key = t.name.toLowerCase();
      if (!toolMap.has(key)) {
        toolMap.set(key, t);
      }
    });

    return Array.from(toolMap.values());
  }

  // 同步到本地数据库
  async sync() {
    console.log("[Sync] 开始同步...");

    try {
      // 1. 获取新数据
      const newTools = await this.fetchFromAibase();

      // 2. 读取现有工具（从各场景中提取）
      let existingTools = [];
      try {
        const data = JSON.parse(await fs.readFile(CONFIG.outputFile, "utf-8"));
        data.scenarios?.forEach((s) => {
          existingTools.push(...s.tools);
        });
      } catch (e) {}

      // 3. 合并数据
      const mergedTools = this.mergeTools(existingTools, newTools);

      console.log(`[Sync] 合并后共 ${mergedTools.length} 个工具`);

      // 4. 按场景分组
      const scenarios = this.categorizeTools(mergedTools);

      // 5. 保存
      const output = {
        version: new Date().toISOString().slice(0, 10),
        lastSync: new Date().toISOString(),
        totalTools: mergedTools.length,
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
      console.log(`[Sync] 已保存到 ${CONFIG.outputFile}`);

      return { success: true, count: mergedTools.length };
    } catch (e) {
      console.error("[Sync] 同步失败:", e.message);
      return { success: false, error: e.message };
    }
  }

  // 按场景分类工具
  categorizeTools(tools) {
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
        id: "data-analysis",
        name: "数据分析",
        icon: "📉",
        description: "AI赋能的数据科学与分析",
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
      {
        id: "quant-research",
        name: "量化投研",
        icon: "📊",
        description: "AI驱动的金融分析与量化交易",
        tools: [],
      },
    ];

    // 关键词匹配分类
    const categoryKeywords = {
      "smart-office": [
        "LLM",
        "聊天",
        "AI助手",
        "笔记",
        "办公",
        "写作",
        "搜索",
        "翻译",
      ],
      "content-creation": ["写作", "文案", "内容", "营销", "博客", "SEO"],
      "ai-programming": ["编程", "代码", "开发", "IDE", "补全", "debug"],
      "video-production": ["视频", "剪辑", "生成", "数字人", "动画"],
      "design-creative": ["设计", "绘画", "图像", "图片", "抠图", "修图"],
      "marketing-seo": ["营销", "SEO", "推广", "广告", "社媒"],
      "data-analysis": ["数据", "分析", "BI", "可视化", "统计"],
      "education-learning": ["教育", "学习", "课程", "培训", "学生"],
      "ecommerce-operation": ["电商", " shop", "商城", "零售", "订单"],
      "quant-research": ["量化", "金融", "股票", "投资", "交易"],
    };

    tools.forEach((tool) => {
      const tags = (tool.tags || []).join(" ");
      let assigned = false;

      // 根据URL和标签匹配场景
      for (const [scenarioId, keywords] of Object.entries(categoryKeywords)) {
        if (
          keywords.some((k) => tags.toLowerCase().includes(k.toLowerCase()))
        ) {
          const scenario = scenarios.find((s) => s.id === scenarioId);
          if (scenario) {
            scenario.tools.push(tool);
            assigned = true;
            break;
          }
        }
      }

      // 未分类的放到智能办公
      if (!assigned) {
        scenarios[0].tools.push(tool);
      }
    });

    // 过滤空场景
    return scenarios.filter((s) => s.tools.length > 0);
  }
}

// 主函数
async function main() {
  const sync = new AISyncService();
  await sync.init();

  const result = await sync.sync();

  if (result.success) {
    console.log(`\n✅ 同步完成！共 ${result.count} 个工具`);
  } else {
    console.log(`\n❌ 同步失败: ${result.error}`);
    process.exit(1);
  }
}

// 导出以便其他模块使用
module.exports = { AISyncService, CONFIG };

// 如果直接运行
if (require.main === module) {
  main();
}
