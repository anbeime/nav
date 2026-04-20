#!/usr/bin/env python3
"""
改进版书签解析 - 智能分类
"""

import re
import json
from datetime import datetime

# 读取收藏夹文件
with open('bookmarks_2026_4_18.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 分类关键词映射 - 根据文件夹名称推断
CATEGORY_KEYWORDS = {
    # AI对话
    'chat': ['chatgpt', 'claude', 'gemini', 'gpt', '对话', '聊天', 'ai助手', 'chat', 'kimi', '豆包', '通义', '智谱', '文心', 'deepseek', 'ai聊天', 'llm', '大模型'],
    
    # 智能体
    'agent': ['智能体', 'agent', 'coze', '扣子', 'dify', 'bot', '智能体平台', '元器', '百炼', '智能体应用'],
    
    # AI编程
    'code': ['编程', '代码', 'code', 'copilot', 'cursor', 'ide', '开发', '编程工具', 'qoder', 'ai编程', '代码生成', 'dev'],
    
    # AI绘画
    'image': ['绘画', '图像', '图片', '设计', 'midjourney', 'stable', '生图', 'ai绘画', 'ai图像', 'ai设计', '绘图', '设计工具', '视觉', 'liblib', '即梦', '万相'],
    
    # AI视频
    'video': ['视频', 'video', 'sora', 'runway', '可灵', 'ai视频', '视频生成', '数字人', 'heygen', '视频工具'],
    
    # AI音频
    'audio': ['音频', '语音', '音乐', 'audio', 'music', 'suno', 'tts', '配音', 'ai音乐', '语音合成', 'ai音频', '克隆'],
    
    # AI写作
    'writing': ['写作', '文案', '写作', 'writing', '内容创作', '文章', 'ai写作', '文案生成'],
    
    # AI搜索
    'search': ['搜索', 'search', 'perplexity', 'ai搜索', '搜索引擎', '检索'],
    
    # 金融量化
    'finance': ['金融', '投资', '量化', 'finance', 'quant', '股票', '交易', '研报', '投研', '量化交易', '证券'],
    
    # 自动化
    'automation': ['自动化', 'n8n', 'workflow', '工作流', 'automation', '集成', 'zapier'],
    
    # 学术研究
    'research': ['科研', '论文', '学术', 'research', '文献', '研究', 'arxiv'],
    
    # 效率工具
    'productivity': ['效率', '笔记', '办公', 'notion', '飞书', '文档', '协作', 'ppt', 'ppt', '效率工具'],
    
    # AI教程
    'learning': ['教程', '学习', '课程', 'learning', '培训', '教程'],
}

def infer_category_from_tags(tags):
    """根据标签推断分类"""
    tags_str = ' '.join(tags).lower()
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in tags_str:
                return category
    
    return 'other'

def parse_bookmarks_improved(content):
    """改进版书签解析"""
    tools = []
    folder_stack = []
    
    lines = content.split('\n')
    
    for line in lines:
        # 检测文件夹
        folder_match = re.search(r'<DT><H3[^>]*>([^<]+)</H3>', line)
        if folder_match:
            folder_stack.append(folder_match.group(1))
            continue
        
        if '</DL>' in line and folder_stack:
            folder_stack.pop()
            continue
        
        # 提取链接
        link_match = re.search(r'<A HREF="(https?://[^"]+)"[^>]*>([^<]+)</A>', line, re.I)
        if link_match:
            url = link_match.group(1)
            name = link_match.group(2).strip()
            
            if 'javascript:' in url or 'chrome://' in url:
                continue
            
            # 智能分类
            category = infer_category_from_tags(folder_stack)
            
            # 限制名称长度
            if len(name) > 80:
                name = name[:80]
            
            # 生成唯一 ID
            tool_id = re.sub(r'[^\w\u4e00-\u9fff-]', '-', name.lower())[:40]
            
            tools.append({
                'id': tool_id,
                'name': name,
                'url': url,
                'desc': name,
                'tags': folder_stack[-3:] if folder_stack else [],
                'category': category,
                'rating': 4.5
            })
    
    return tools

# 解析书签
tools = parse_bookmarks_improved(content)

# 统计分类
categories = {}
for t in tools:
    cat = t['category']
    categories[cat] = categories.get(cat, 0) + 1

print(f'总共解析: {len(tools)} 个工具')
print(f'\n分类统计:')
for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
    print(f'  {cat}: {count}')

# 保存
output = {
    'version': '2.0',
    'updated_at': datetime.now().isoformat(),
    'total': len(tools),
    'tools': tools
}

with open('public/data/ai-tools-simple.json', 'w', encoding='utf-8') as f:
    json.dump(tools, f, ensure_ascii=False, indent=2)

print(f'\n已保存到 public/data/ai-tools-simple.json')
