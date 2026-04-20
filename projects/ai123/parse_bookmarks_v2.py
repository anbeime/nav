import re
import json
from datetime import datetime

# 读取收藏夹文件
with open('bookmarks_2026_4_18.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 分类映射
CATEGORY_MAP = {
    'AI智能体应用': 'agent',
    '智谱': 'chat',
    '讯飞': 'chat',
    '阿里': 'chat',
    'google': 'chat',
    '百度智能云千帆': 'chat',
    '文心': 'chat',
    'COZE智能体': 'agent',
    '扣子空间': 'agent',
    '豆包应用': 'chat',
    '腾讯元器': 'chat',
    'N8N': 'automation',
    '金融智能量化投研': 'finance',
    '智能研报': 'finance',
    'AI编程': 'code',
    'AI绘画': 'image',
    'AI视频': 'video',
    'AI音频': 'audio',
    'AI写作': 'writing',
    'AI搜索': 'search',
    'AI办公': 'office',
    'AI科研': 'research',
    'AI工具': 'tools',
}

def get_category(folder_name):
    """根据文件夹名称推断分类"""
    folder_lower = folder_name.lower()
    for key, cat in CATEGORY_MAP.items():
        if key.lower() in folder_lower:
            return cat
    return 'other'

def parse_bookmarks_recursive(content):
    """递归解析书签，保留层级结构"""
    tools = []
    current_folder = ''
    folder_stack = []
    
    # 按行解析
    lines = content.split('\n')
    
    for line in lines:
        # 检测文件夹开始
        folder_match = re.search(r'<DT><H3[^>]*>([^<]+)</H3>', line)
        if folder_match:
            folder_stack.append(folder_match.group(1))
            continue
        
        # 检测文件夹结束 (</DL>)
        if '</DL>' in line and folder_stack:
            folder_stack.pop()
            continue
        
        # 提取链接
        link_match = re.search(r'<A HREF="(https?://[^"]+)"[^>]*>([^<]+)</A>', line, re.I)
        if link_match:
            url = link_match.group(1)
            name = link_match.group(2).strip()
            
            # 过滤无效链接
            if 'javascript:' in url or 'chrome://' in url:
                continue
            
            # 获取当前所在的文件夹作为分类
            category = 'other'
            tags = []
            for folder in folder_stack:
                cat = get_category(folder)
                if cat != 'other':
                    category = cat
                tags.append(folder)
            
            # 限制名称长度
            if len(name) > 80:
                name = name[:80]
            
            # 生成唯一 ID
            tool_id = name.lower()
            tool_id = re.sub(r'[^\w\u4e00-\u9fff-]', '-', tool_id)
            tool_id = tool_id[:40]
            
            tools.append({
                'id': tool_id,
                'name': name,
                'url': url,
                'desc': name,
                'tags': tags[-3:] if tags else [],  # 保留最近3层文件夹作为标签
                'category': category,
                'rating': 4.5,
                'source': 'bookmark',
                'added_at': datetime.now().strftime('%Y-%m-%d')
            })
    
    return tools

# 解析书签
tools = parse_bookmarks_recursive(content)

# 统计分类
categories = {}
for t in tools:
    cat = t['category']
    categories[cat] = categories.get(cat, 0) + 1

print(f'总共解析: {len(tools)} 个工具')
print(f'\n分类统计:')
for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
    print(f'  {cat}: {count}')

# 保存完整数据
output = {
    'version': '1.0',
    'updated_at': datetime.now().isoformat(),
    'total': len(tools),
    'categories': categories,
    'tools': tools
}

with open('public/data/ai-tools-full.json', 'w', encoding='utf-8') as out:
    json.dump(output, out, ensure_ascii=False, indent=2)

print(f'\n已保存到 public/data/ai-tools-full.json')

# 同时生成一个简化版本用于嵌入 HTML
simple_tools = [{
    'id': t['id'],
    'name': t['name'],
    'url': t['url'],
    'desc': t['desc'],
    'tags': t['tags'],
    'category': t['category']
} for t in tools]

with open('public/data/ai-tools-simple.json', 'w', encoding='utf-8') as out:
    json.dump(simple_tools, out, ensure_ascii=False, indent=2)

print(f'简化版已保存到 public/data/ai-tools-simple.json')
