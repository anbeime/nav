import json

# 读取工具数据
with open('public/data/ai-tools-simple.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 生成嵌入式JS
compact = json.dumps(data, ensure_ascii=False, separators=(',', ':'))

js_content = f'''// 嵌入工具数据 ({len(data)} 个工具) - 自动生成
const BOOKMARK_TOOLS = {compact};
'''

with open('public/data/tools_embedded.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f'已生成 tools_embedded.js ({len(data)} 个工具)')
