import re
import json

# 读取收藏夹文件
with open('bookmarks_2026_4_18.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 提取所有链接
links = re.findall(r'<A HREF="(https?://[^"]+)"[^>]*>([^<]+)</A>', content, re.I)
print(f'总链接数: {len(links)}')

# 提取文件夹结构 (分类)
folder_pattern = r'<DT><H3[^>]*>([^<]+)</H3>'
folders = re.findall(folder_pattern, content)
print(f'文件夹数: {len(folders)}')
print('前20个文件夹:', folders[:20])

# 转换为工具格式
tools = []
for url, name in links:
    name = name.strip()
    if len(name) > 60:
        name = name[:60]
    
    # 过滤掉无效链接
    if 'javascript:' in url or 'chrome://' in url:
        continue
        
    tools.append({
        'id': name.lower().replace(' ', '-').replace('/', '-').replace('.', '-')[:30],
        'name': name,
        'url': url,
        'desc': name,
        'tags': [],
        'category': 'other',
        'rating': 4.0
    })

# 保存到文件
with open('public/data/bookmarks_tools.json', 'w', encoding='utf-8') as out:
    json.dump(tools, out, ensure_ascii=False, indent=2)

print(f'\n已转换 {len(tools)} 个工具到 public/data/bookmarks_tools.json')
print('\n前15个工具:')
for t in tools[:15]:
    print(f"  {t['name'][:40]} -> {t['url'][:50]}")
