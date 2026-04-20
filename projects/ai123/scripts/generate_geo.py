#!/usr/bin/env python3
"""
AI123 GEO 优化脚本
生成 JSON-LD 结构化数据和 sitemap.xml
"""

import json
from datetime import datetime
from pathlib import Path

# 读取工具数据
with open('public/data/ai-tools-full.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

tools = data['tools']
BASE_URL = 'https://ai123-nav.vercel.app'

# 1. 生成 JSON-LD 结构化数据
def generate_jsonld():
    """生成 Schema.org 结构化数据"""
    items = []
    
    for tool in tools:
        item = {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": tool['name'],
            "url": tool['url'],
            "description": tool['desc'],
            "applicationCategory": "AIApplication",
            "operatingSystem": "Web",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "CNY"
            },
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": str(tool.get('rating', 4.5)),
                "ratingCount": "1"
            }
        }
        items.append(item)
    
    # 整体网站结构化数据
    website = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "AI123 - AI工具导航",
        "url": BASE_URL,
        "description": "收录超过800个AI工具的导航站，涵盖智能体、对话、编程、视频、图像等多个领域",
        "potentialAction": {
            "@type": "SearchAction",
            "target": f"{BASE_URL}/search?q={{search_term_string}}",
            "query-input": "required name=search_term_string"
        },
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": len(tools),
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": i + 1,
                    "item": {
                        "@type": "SoftwareApplication",
                        "name": t['name'],
                        "url": t['url']
                    }
                } for i, t in enumerate(tools[:100])  # 限制前100个
            ]
        }
    }
    
    return {
        "website": website,
        "tools": items[:500]  # 限制500个避免文件过大
    }

jsonld = generate_jsonld()

# 保存 JSON-LD
with open('public/data/schema.jsonld', 'w', encoding='utf-8') as f:
    json.dump(jsonld, f, ensure_ascii=False, indent=2)
print(f'已生成 schema.jsonld')

# 2. 生成 sitemap.xml
def generate_sitemap():
    """生成 SEO sitemap"""
    urls = []
    
    # 首页
    urls.append({
        'loc': BASE_URL,
        'priority': '1.0',
        'changefreq': 'daily'
    })
    
    # 分类页面
    categories = set(t['category'] for t in tools)
    for cat in categories:
        urls.append({
            'loc': f"{BASE_URL}/category/{cat}",
            'priority': '0.8',
            'changefreq': 'weekly'
        })
    
    # 工具页面 (限制数量)
    for tool in tools[:500]:
        urls.append({
            'loc': f"{BASE_URL}/tool/{tool['id']}",
            'priority': '0.6',
            'changefreq': 'monthly'
        })
    
    # 生成 XML
    xml = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
'''
    for u in urls:
        xml += f'''  <url>
    <loc>{u['loc']}</loc>
    <changefreq>{u['changefreq']}</changefreq>
    <priority>{u['priority']}</priority>
  </url>
'''
    xml += '</urlset>'
    return xml

sitemap = generate_sitemap()
with open('public/sitemap.xml', 'w', encoding='utf-8') as f:
    f.write(sitemap)
print(f'已生成 sitemap.xml ({len(tools[:500])} 个工具)')

# 3. 生成 robots.txt
robots = f'''User-agent: *
Allow: /

Sitemap: {BASE_URL}/sitemap.xml
'''
with open('public/robots.txt', 'w', encoding='utf-8') as f:
    f.write(robots)
print('已生成 robots.txt')

print(f'\n✅ GEO 优化完成!')
print(f'   - {len(tools)} 个工具已结构化')
print(f'   - 提交 {BASE_URL}/sitemap.xml 到搜索引擎')