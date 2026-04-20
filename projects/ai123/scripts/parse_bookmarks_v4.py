#!/usr/bin/env python3
"""
优化版书签解析 - 更精确的分类
"""

import re
import json
from datetime import datetime

# 读取收藏夹文件
with open('bookmarks_2026_4_18.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 扩展分类关键词 - 同时检查文件夹名和工具名
CATEGORY_KEYWORDS = {
    'chat': [
        'chatgpt', 'claude', 'gemini', 'gpt', 'chat', 'kimi', '豆包', '通义', '智谱', '文心', 
        'deepseek', 'llm', '大模型', '对话', '聊天', '助手', 'ai聊天', 'qwen', 'glm', 
        '星火', '讯飞', 'moonshot', 'z.ai', '灵光', 'poe', 'ollama'
    ],
    
    'agent': [
        '智能体', 'agent', 'coze', '扣子', 'dify', 'bot', '元器', '百炼', '智能体平台',
        'botcenter', 'agentbuilder', '智能体应用', 'ai智能体', 'bot平台'
    ],
    
    'code': [
        '编程', '代码', 'code', 'copilot', 'cursor', 'ide', '开发', 'qoder', 'ai编程', 
        '代码生成', 'dev', 'github', 'git', '编程工具', 'codeium', 'trae', 'replit',
        'stackblitz', 'codesandbox', '程序员', '软件开发'
    ],
    
    'image': [
        '绘画', '图像', '图片', '设计', 'midjourney', 'stable', '生图', 'ai绘画', '绘图',
        '视觉', 'liblib', '即梦', '万相', 'diffusion', '文生图', 'ai设计', 'photoshop',
        'canva', 'figma', '插画', '海报', 'logo', '图像生成', '画图', '美图', '修图'
    ],
    
    'video': [
        '视频', 'video', 'sora', 'runway', '可灵', 'ai视频', '视频生成', '数字人', 'heygen',
        '数字', '口播', '直播', '剪辑', 'pr', '剪辑工具', '短视频', '影视', '电影'
    ],
    
    'audio': [
        '音频', '语音', '音乐', 'audio', 'music', 'suno', 'tts', '配音', 'ai音乐', '语音合成',
        '克隆', '声音', '歌声', '播客', '录音', '语音识别', 'asr', '声纹'
    ],
    
    'writing': [
        '写作', '文案', '内容创作', '文章', 'ai写作', '文案生成', '写作助手', '小说', '剧本',
        '润色', '纠错', '排版', '编辑', '文档', 'markdown', 'notion'
    ],
    
    'search': [
        '搜索', 'search', 'perplexity', 'ai搜索', '搜索引擎', '检索', '问答', '知识库'
    ],
    
    'finance': [
        '金融', '投资', '量化', 'finance', 'quant', '股票', '交易', '研报', '投研', 
        '量化交易', '证券', '基金', '理财', '期货', '外汇', '加密', '币圈', 'btc',
        '基金', '财报', '估值', '选股'
    ],
    
    'automation': [
        '自动化', 'n8n', 'workflow', '工作流', 'automation', '集成', 'zapier', 'make',
        '低代码', '无代码', 'rpa', '机器人'
    ],
    
    'research': [
        '科研', '论文', '学术', 'research', '文献', 'arxiv', '研究', '学者', '期刊',
        '引用', 'sci', 'ei', '知网', '专利'
    ],
    
    'productivity': [
        '效率', '笔记', '办公', '飞书', '文档', '协作', 'ppt', 'excel', '表格', '演示',
        '日程', '任务', '待办', '日历', '会议', '邮件', '云盘', '存储', '同步'
    ],
    
    'learning': [
        '教程', '学习', '课程', 'learning', '培训', '教育', '学院', '教学', '知识',
        '入门', '指南', '文档', '手册'
    ],
    
    'marketing': [
        '营销', '推广', '广告', '投放', '流量', '转化', '增长', '运营', '电商', '带货',
        '直播', '私域', '社群', '裂变', '获客'
    ],
    
    'data': [
        '数据', '分析', 'bi', '报表', '可视化', '图表', '大数据', 'etl', '数据库',
        'mysql', 'mongodb', 'redis', 'api', '接口'
    ],
}

def infer_category(tags, name):
    """根据标签和名称推断分类"""
    # 合并所有文本
    text = ' '.join(tags) + ' ' + name
    text_lower = text.lower()
    
    # 按优先级匹配
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            if keyword.lower() in text_lower:
                score += 1
        if score > 0:
            scores[category] = score
    
    if scores:
        # 返回得分最高的分类
        return max(scores, key=scores.get)
    
    return 'other'

def parse_bookmarks_optimized(content):
    """优化版书签解析"""
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
            
            # 智能分类 - 同时使用标签和名称
            category = infer_category(folder_stack, name)
            
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
tools = parse_bookmarks_optimized(content)

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
with open('public/data/ai-tools-simple.json', 'w', encoding='utf-8') as f:
    json.dump(tools, f, ensure_ascii=False, indent=2)

print(f'\n已保存到 public/data/ai-tools-simple.json')

# 输出一些 other 分类的样本
other_tools = [t for t in tools if t['category'] == 'other']
print(f'\n"other"分类样本 (前10个):')
for t in other_tools[:10]:
    print(f'  {t["name"][:40]} | 标签: {t["tags"]}')
