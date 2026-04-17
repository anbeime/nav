#!/usr/bin/env node
/**
 * TOPGO发现导航 - AI技能自动爬取与分类系统 v2.0
 * 
 * Usage:
 *   DEEPSEEK_API_KEY=xxx node scripts/ai-skill-crawler.js --source=github --mode=incremental
 *   node scripts/import-skills.js --dry-run
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG = {
  llm: { provider: process.env.LLM_PROVIDER || 'deepseek', apiKey: process.env.DEEPSEEK_API_KEY || '', baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1', model: process.env.LLM_MODEL || 'deepseek-chat', maxTokens: 2000 },
  dataDir: path.join(__dirname, '..', 'data'),
  dbPath: path.join(__dirname, '..', 'data', 'db.json'),
  outputPath: path.join(__dirname, '..', 'data', 'skill-pending.json'),
  businessScenarios: [
    { id: 'ai-agent', name: 'AI智能体应用中心', keywords: ['agent','bot','coze','dify','智能体'] },
    { id: 'smart-office', name: '智能办公与代码助手', keywords: ['office','coding','cursor','claude','chatgpt','编程'] },
    { id: 'quant-trading', name: '量化投研引擎', keywords: ['quant','trading','vnpy','量化','交易','回测'] },
    { id: 'content-growth', name: '运营与增长引擎', keywords: ['content','marketing','midjourney','运营','内容'] },
    { id: 'ecommerce', name: '电商与跨境实战', keywords: ['ecommerce','shopify','amazon','电商','跨境'] },
    { id: 'sales-crm', name: '销售与客户成功', keywords: ['sales','crm','lead','销售','客户'] },
    { id: 'admin-efficiency', name: '行政与效率工具', keywords: ['productivity','notion','zapier','效率'] },
    { id: 'personal-growth', name: '个人发展与学习', keywords: ['learning','education','course','学习','教程'] },
    { id: 'dev-resources', name: '开发者资源库', keywords: ['developer','github','api','framework','开发'] },
  ],
  regions: [
    { code: 'CN', name: '中国', indicators: ['中文','微信','支付宝','淘宝','国内'] },
    { code: 'US', name: '北美', indicators: ['English','Shopify','Stripe','global'] },
    { code: 'JP', name: '日本', indicators: ['日本語','Rakuten','LINE','楽天'] },
    { code: 'EU', name: '欧洲', indicators: ['GDPR','EUR','European'] },
    { code: 'SG', name: '东南亚', indicators: ['Shopee','Lazada','TikTok Shop','SEA'] },
  ],
};

class AIClassifier {
  async classify(rawSkill) {
    const prompt = `Classify this AI tool. Output JSON only: {"name":"CN name","desc":"50字描述","scenario":"id from [ai-agent,smart-office,quant-trading,content-growth,ecommerce,sales-crm,admin-efficiency,personal-growth,dev-resources]","regions":["CN","US"],"difficulty":1-4,"tags":["tag1"],"rating":0-5}
Tool: ${rawSkill.name || ''} | ${rawSkill.desc || ''} | URL: ${rawSkill.url || ''}`;
    try {
      if (!CONFIG.llm.apiKey) throw new Error('No API key');
      const body = JSON.stringify({ model: CONFIG.llm.model, messages: [{ role: 'user', content: prompt }], max_tokens: CONFIG.llm.maxTokens, temperature: 0.3 });
      const result = await new Promise((resolve, reject) => {
        const req = https.request({ hostname: new URL(CONFIG.llm.baseUrl).hostname, port: 443, path: new URL(CONFIG.llm.baseUrl).pathname + '/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CONFIG.llm.apiKey}` } }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d).choices[0].message.content); } catch(e) { reject(e); } }); });
        req.on('error', reject); req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
        req.write(body); req.end();
      });
      const cleaned = result.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
      return JSON.parse(cleaned.match(/\{[\s\S]*\}/)[0]);
    } catch(e) { return this.fallback(rawSkill); }
  }
  fallback(raw) {
    const t = ((raw.name||'')+' '+(raw.desc||'')).toLowerCase();
    let best = 'dev-resources', maxS = 0;
    for (const s of CONFIG.businessScenarios) { const sc = s.keywords.filter(k => t.includes(k)).length; if (sc > maxS) { maxS = sc; best = s.id; } }
    return { name: raw.name||'未命名', desc: (raw.desc||'').slice(0,100), scenario: best, regions: ['CN','US'], difficulty: 1, tags: [], rating: 0 };
  }
}

class SkillCrawler {
  constructor(classifier) { this.classifier = classifier; this.results = []; }
  async crawlGitHub(query) {
    console.log(`[crawl] GitHub: ${query}`);
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+stars:>=5&per_page=10&sort=stars`;
      const data = await new Promise((res, rej) => { https.get(url, { headers: { 'User-Agent': 'TOPGO-Crawler' } }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>{try{res(JSON.parse(d))}catch(e){rej(e)}}); }).on('error',rej); });
      if (data.items) for (const r of data.items) this.results.push({ source:'github', name:r.name, desc:r.description||'', url:r.html_url, icon:`https://github.com/${r.owner?.login}.png`, stars:r.stargazers_count });
    } catch(e) { console.error(`[err] GitHub ${query}:`, e.message); }
  }
  async crawlAll() {
    for (const q of ['openclaw skill','coze bot workflow','n8n automation','AI agent framework','quant trading python']) { await this.crawlGitHub(q); await new Promise(r=>setTimeout(r,1500)); }
    return this.results;
  }
  async classifyAll() {
    const out = [];
    for (let i = 0; i < this.results.length; i++) {
      process.stdout.write(`\r[classify] ${i+1}/${this.results.length}`);
      out.push({ ...this.results[i], ...(await this.classifier.classify(this.results[i])), classifiedAt: new Date().toISOString() });
      await new Promise(r=>setTimeout(r,500));
    }
    console.log('');
    return out;
  }
  save(data) {
    fs.writeFileSync(CONFIG.outputPath, JSON.stringify({ generatedAt:new Date().toISOString(), total:data.length, skills:data }, null, 2));
    console.log(`[save] ${data.length} skills -> ${CONFIG.outputPath}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.find(a => a.includes('mode='))?.split('=')[1] || 'incremental';
  console.log('=== TOPGO AI Skill Crawler v2.0 ===');
  const crawler = new SkillCrawler(new AIClassifier());
  const raw = await crawler.crawlAll();
  if (!raw.length) { console.log('No new skills found.'); return; }
  const classified = await crawler.classifyAll();
  crawler.save(classified);
  console.log('[done] Run import-skills.js to import to db.json');
}
module.exports = { CONFIG, AIClassifier, SkillCrawler };
if (require.main === module) main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
