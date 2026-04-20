#!/usr/bin/env python3
"""
AI123 书签自动同步脚本
支持:
1. 监听书签文件变化
2. 定时同步
3. 手动触发同步
"""

import os
import sys
import json
import shutil
import argparse
import subprocess
from datetime import datetime
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# 配置
BOOKMARKS_FILE = os.environ.get('AI123_BOOKMARKS', '')
OUTPUT_DIR = Path('public/data')
REPO_DIR = Path(__file__).parent.parent

class BookmarkSyncHandler(FileSystemEventHandler):
    """监听书签文件变化"""
    
    def __init__(self, callback):
        self.callback = callback
    
    def on_modified(self, event):
        if event.src_path.endswith('.html'):
            print(f'📝 检测到书签变化: {event.src_path}')
            self.callback()

def parse_bookmarks(file_path):
    """解析书签文件"""
    import re
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
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
            
            tool_id = re.sub(r'[^\w\u4e00-\u9fff-]', '-', name.lower())[:40]
            
            tools.append({
                'id': tool_id,
                'name': name[:80],
                'url': url,
                'desc': name[:80],
                'tags': folder_stack[-3:] if folder_stack else [],
                'category': infer_category(folder_stack),
                'rating': 4.5,
                'source': 'bookmark',
                'updated_at': datetime.now().isoformat()
            })
    
    return tools

def infer_category(folders):
    """推断分类"""
    CATEGORY_KEYWORDS = {
        'chat': ['chatgpt', 'claude', 'gemini', '对话', '聊天'],
        'agent': ['智能体', 'agent', 'coze', 'dify'],
        'image': ['绘画', '图像', '图片', '设计', 'midjourney', 'stable'],
        'video': ['视频', 'video', 'sora', 'runway'],
        'audio': ['音频', '语音', '音乐', 'audio', 'music'],
        'code': ['编程', '代码', 'code', 'copilot', 'cursor'],
        'writing': ['写作', '文案', '写作', 'writing'],
        'research': ['科研', '论文', '学术', 'research'],
        'finance': ['金融', '投资', '量化', 'finance'],
        'automation': ['自动化', 'n8n', 'workflow'],
    }
    
    for folder in folders:
        folder_lower = folder.lower()
        for cat, keywords in CATEGORY_KEYWORDS.items():
            if any(kw in folder_lower for kw in keywords):
                return cat
    
    return 'other'

def sync_all(bookmarks_path):
    """执行完整同步"""
    print(f'\n🔄 开始同步: {bookmarks_path}')
    
    # 解析书签
    tools = parse_bookmarks(bookmarks_path)
    print(f'   解析到 {len(tools)} 个工具')
    
    # 保存数据
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    output = {
        'version': '2.0',
        'synced_at': datetime.now().isoformat(),
        'total': len(tools),
        'tools': tools
    }
    
    with open(OUTPUT_DIR / 'ai-tools-full.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f'   已保存到 {OUTPUT_DIR / "ai-tools-full.json"}')
    
    # 生成 GEO 文件
    generate_geo(tools)
    
    return tools

def generate_geo(tools):
    """生成 GEO 文件"""
    BASE_URL = 'https://ai123-nav.vercel.app'
    
    # sitemap
    sitemap = f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{BASE_URL}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
'''
    for t in tools[:500]:
        sitemap += f'''  <url>
    <loc>{BASE_URL}/tool/{t['id']}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
'''
    sitemap += '</urlset>'
    
    with open('public/sitemap.xml', 'w', encoding='utf-8') as f:
        f.write(sitemap)
    
    print(f'   已生成 sitemap.xml')

def git_push():
    """推送到 GitHub"""
    try:
        subprocess.run(['git', 'add', 'public/data', 'public/sitemap.xml'], check=True)
        subprocess.run(['git', 'commit', '-m', f'自动同步: {datetime.now().strftime("%Y-%m-%d %H:%M")}'], check=True)
        subprocess.run(['git', 'push'], check=True)
        print('✅ 已推送到 GitHub')
    except subprocess.CalledProcessError as e:
        print(f'⚠️ Git 操作失败: {e}')

def watch_mode(bookmarks_path):
    """监听模式"""
    if not os.path.exists(bookmarks_path):
        print(f'❌ 书签文件不存在: {bookmarks_path}')
        return
    
    print(f'👀 监听书签变化: {bookmarks_path}')
    
    handler = BookmarkSyncHandler(lambda: sync_all(bookmarks_path))
    observer = Observer()
    observer.schedule(handler, path=os.path.dirname(bookmarks_path), recursive=False)
    observer.start()
    
    try:
        print('按 Ctrl+C 停止监听...')
        while True:
            pass
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

def main():
    parser = argparse.ArgumentParser(description='AI123 书签同步工具')
    parser.add_argument('--watch', action='store_true', help='监听书签变化')
    parser.add_argument('--push', action='store_true', help='同步后推送到 GitHub')
    parser.add_argument('--file', type=str, default=BOOKMARKS_FILE, help='书签文件路径')
    
    args = parser.parse_args()
    
    if not args.file:
        print('❌ 请设置书签文件路径:')
        print('   export AI123_BOOKMARKS=/path/to/bookmarks.html')
        print('   或使用 --file 参数')
        sys.exit(1)
    
    if args.watch:
        watch_mode(args.file)
    else:
        sync_all(args.file)
        if args.push:
            git_push()

if __name__ == '__main__':
    main()
