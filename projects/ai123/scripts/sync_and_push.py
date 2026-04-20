#!/usr/bin/env python3
"""
AI123 一键同步脚本
功能：解析书签 → 更新数据 → 推送 GitHub
使用：python scripts/sync_and_push.py
"""

import os
import re
import json
import subprocess
from datetime import datetime
from pathlib import Path

# ==================== 配置 ====================
# 书签文件路径（自动检测或手动设置）
BOOKMARKS_PATH = os.environ.get('AI123_BOOKMARKS', '')

# Chrome 默认书签路径
CHROME_BOOKMARKS_PATHS = [
    os.path.expanduser('~/.config/google-chrome/Default/Bookmarks'),  # Linux
    os.path.expanduser('~/Library/Application Support/Google/Chrome/Default/Bookmarks'),  # macOS
    os.path.join(os.environ.get('LOCALAPPDATA', ''), r'Google\Chrome\User Data\Default\Bookmarks'),  # Windows
]

# 分类关键词
CATEGORY_KEYWORDS = {
    'agent': ['智能体', 'agent', 'coze', '扣子', 'dify', 'bot', '元器', '百炼', 'botcenter'],
    'chat': ['chatgpt', 'claude', 'gemini', 'gpt', 'chat', 'kimi', '豆包', '通义', '智谱', '文心', 'deepseek', 'llm', '大模型', '助手'],
    'code': ['编程', '代码', 'code', 'copilot', 'cursor', 'ide', '开发', 'qoder', 'github', 'git'],
    'image': ['绘画', '图像', '图片', '设计', 'midjourney', 'stable', '生图', 'ai绘画', 'liblib', '即梦'],
    'video': ['视频', 'video', 'sora', 'runway', '可灵', 'ai视频', '数字人', 'heygen'],
    'audio': ['音频', '语音', '音乐', 'audio', 'music', 'suno', 'tts', '配音', '克隆'],
    'writing': ['写作', '文案', '内容创作', '文章', 'ai写作', '小说'],
    'search': ['搜索', 'search', 'perplexity', 'ai搜索'],
    'finance': ['金融', '投资', '量化', 'finance', 'quant', '股票', '交易', '研报', '投研', '期货'],
    'automation': ['自动化', 'n8n', 'workflow', '工作流', 'zapier'],
    'research': ['科研', '论文', '学术', 'research', '文献', 'arxiv'],
    'productivity': ['效率', '笔记', '办公', 'notion', '飞书', '文档', '协作', 'ppt'],
    'learning': ['教程', '学习', '课程', 'learning', '培训', '教育'],
    'marketing': ['营销', '推广', '广告', '投放', '流量', '电商', '带货'],
    'data': ['数据', '分析', 'bi', '报表', '可视化', '数据库', 'api'],
}

def find_bookmarks_file():
    """自动查找书签文件"""
    if BOOKMARKS_PATH and os.path.exists(BOOKMARKS_PATH):
        return BOOKMARKS_PATH
    
    for path in CHROME_BOOKMARKS_PATHS:
        if os.path.exists(path):
            return path
    
    return None

def parse_chrome_bookmarks(file_path):
    """解析 Chrome JSON 格式书签"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    tools = []
    
    def extract_bookmarks(node, folder_stack=[]):
        """递归提取书签"""
        if node.get('type') == 'url':
            url = node.get('url', '')
            name = node.get('name', '')
            
            if not url.startswith(('http://', 'https://')):
                return
            
            # 推断分类
            text = ' '.join(folder_stack) + ' ' + name
            category = infer_category(text)
            
            tools.append({
                'id': re.sub(r'[^\w\u4e00-\u9fff-]', '-', name.lower())[:40],
                'name': name[:80],
                'url': url,
                'desc': name[:80],
                'tags': folder_stack[-3:],
                'category': category,
                'rating': 4.5
            })
        
        elif node.get('type') == 'folder':
            new_stack = folder_stack + [node.get('name', '')]
            for child in node.get('children', []):
                extract_bookmarks(child, new_stack)
    
    # 从根节点开始
    roots = data.get('roots', {})
    for root_name, root_node in roots.items():
        extract_bookmarks(root_node, [])
    
    return tools

def parse_html_bookmarks(file_path):
    """解析 HTML 格式书签"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    tools = []
    folder_stack = []
    
    for line in content.split('\n'):
        # 检测文件夹
        folder_match = re.search(r'<DT><H3[^>]*>([^<]+)</H3>', line, re.I)
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
            
            text = ' '.join(folder_stack) + ' ' + name
            category = infer_category(text)
            
            tools.append({
                'id': re.sub(r'[^\w\u4e00-\u9fff-]', '-', name.lower())[:40],
                'name': name[:80],
                'url': url,
                'desc': name[:80],
                'tags': folder_stack[-3:],
                'category': category,
                'rating': 4.5
            })
    
    return tools

def infer_category(text):
    """根据文本推断分类"""
    text_lower = text.lower()
    scores = {}
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw.lower() in text_lower)
        if score > 0:
            scores[category] = score
    
    if scores:
        return max(scores, key=scores.get)
    return 'other'

def generate_embedded_js(tools):
    """生成嵌入式 JS 文件"""
    compact = json.dumps(tools, ensure_ascii=False, separators=(',', ':'))
    js_content = f'''// 嵌入工具数据 ({len(tools)} 个工具) - 自动生成于 {datetime.now().strftime('%Y-%m-%d %H:%M')}
const BOOKMARK_TOOLS = {compact};
'''
    
    output_path = Path('public/data/tools_embedded.js')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    return output_path

def git_push():
    """推送到 GitHub"""
    try:
        # 检查是否有变更
        result = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True)
        if not result.stdout.strip():
            print('  没有变更需要提交')
            return True
        
        # 添加文件
        subprocess.run(['git', 'add', 'public/data/'], check=True)
        
        # 提交
        commit_msg = f"auto: 同步书签数据 {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        subprocess.run(['git', 'commit', '-m', commit_msg], check=True)
        
        # 推送
        subprocess.run(['git', 'push', 'origin', 'main'], check=True)
        
        print('  ✓ 已推送到 GitHub')
        return True
    except subprocess.CalledProcessError as e:
        print(f'  ✗ Git 操作失败: {e}')
        return False

def main():
    print('=' * 50)
    print('AI123 书签同步工具')
    print('=' * 50)
    
    # 1. 查找书签文件
    bookmarks_file = find_bookmarks_file()
    if not bookmarks_file:
        print('✗ 未找到书签文件，请设置 AI123_BOOKMARKS 环境变量')
        return
    
    print(f'📖 书签文件: {bookmarks_file}')
    
    # 2. 解析书签
    print('\n⏳ 解析书签...')
    
    if bookmarks_file.endswith('.json') or 'Bookmarks' in bookmarks_file:
        tools = parse_chrome_bookmarks(bookmarks_file)
    else:
        tools = parse_html_bookmarks(bookmarks_file)
    
    print(f'  ✓ 解析到 {len(tools)} 个工具')
    
    # 3. 统计分类
    categories = {}
    for t in tools:
        cat = t['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print('\n📊 分类统计:')
    for cat, count in sorted(categories.items(), key=lambda x: -x[1])[:10]:
        print(f'  {cat}: {count}')
    
    # 4. 保存数据
    print('\n💾 保存数据...')
    
    # 保存 JSON
    json_path = Path('public/data/ai-tools-simple.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(tools, f, ensure_ascii=False, indent=2)
    print(f'  ✓ {json_path}')
    
    # 生成嵌入式 JS
    js_path = generate_embedded_js(tools)
    print(f'  ✓ {js_path}')
    
    # 5. 推送到 GitHub
    print('\n🚀 推送到 GitHub...')
    git_push()
    
    print('\n' + '=' * 50)
    print('✅ 同步完成!')
    print('=' * 50)

if __name__ == '__main__':
    # 切换到项目目录
    script_dir = Path(__file__).parent.parent
    os.chdir(script_dir)
    main()
