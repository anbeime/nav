#!/usr/bin/env node
/**
 * TOPGO发现导航 - 技能数据导入工具
 * Usage: node scripts/import-skills.js [--dry-run] [--scenario=ai-agent]
 */
const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const PENDING = path.join(__dirname, '..', 'data', 'skill-pending.json');
const BACKUP = path.join(__dirname, '..', 'data', 'backups');

function log(l, m) { console.log(`[${new Date().toISOString().split('T')[1].slice(0,8)}] [${l}] ${m}`); }

function loadDb() {
  const lz = require('lz-string');
  return JSON.parse(lz.decompressFromBase64(fs.readFileSync(DB_PATH, 'utf8').trim()));
}
function saveDb(d) {
  const lz = require('lz-string');
  fs.writeFileSync(DB_PATH, lz.compressToBase64(JSON.stringify(d)), 'utf8');
  log('info', `db.json saved`);
}

async function main() {
  if (!fs.existsSync(PENDING)) { log('error', 'No pending data. Run ai-skill-crawler.js first.'); return; }
  const pending = JSON.parse(fs.readFileSync(PENDING, 'utf8'));
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filter = args.find(a => a.includes('scenario='))?.split('=')[1];

  let db = loadDb();
  let imported = 0, skipped = 0;
  const skills = filter ? pending.skills.filter(s => s.scenario === filter) : pending.skills;

  for (const skill of skills) {
    let exists = false;
    function check(items) { for (const i of items) { if (i.url === skill.url) { exists = true; return; } if (i.nav) check(i.nav); } }
    check(db);
    if (exists) { skipped++; continue; }
    if (dryRun) { log('info', `[DRY] ${skill.name} -> ${skill.scenario}`); imported++; continue; }
    
    // Find or create category
    const scenarioNames = { 'ai-agent':'AI智能体应用中心','smart-office':'智能办公与代码助手','quant-trading':'量化投研引擎','content-growth':'运营与增长引擎','ecommerce':'电商与跨境实战','sales-crm':'销售与客户成功','admin-efficiency':'行政与效率工具','personal-growth':'个人发展与学习','dev-resources':'开发者资源库' };
    let cat = db.find(c => c.title === (scenarioNames[skill.scenario] || skill.scenario));
    if (!cat) { cat = { id: Math.max(0,...db.map(c=>c.id||0))+1, title: scenarioNames[skill.scenario]||skill.scenario, icon:'', nav:[] }; db.push(cat); }
    
    // Add to sub-category
    const subName = (skill.tags && skill.tags[0]) || '推荐工具';
    let sub = cat.nav.find(s => s.title === subName);
    if (!sub) { sub = { id: Math.max(0,...cat.nav.map(s=>s.id||0))+1, title: subName, icon:'', nav:[] }; cat.nav.push(sub); }
    
    sub.nav.push({ id: Math.max(0,...sub.nav.map(i=>i.id||0))+1, name: skill.name, desc: skill.desc||'', url: skill.url||'', icon: skill.icon||'', _geo_regions: skill.regions, _geo_difficulty: skill.difficulty });
    imported++;
  }

  if (!dryRun && imported > 0) { saveDb(db); }
  console.log(`\n=== SUMMARY ===\nImported: ${imported}\nSkipped: ${skipped}\nCategories: ${db.length}`);
}

if (require.main === module) main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
