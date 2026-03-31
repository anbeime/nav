import re

def clean_text_for_tts(text):
    """清理文本，只移除表情符号和特殊字符，保留中文和英文"""
    if not text:
        return ""
    
    # 先移除无效的代理对字符（必须先处理，否则后续编码会报错）
    text = re.sub(r'[\ud800-\udfff]', '', text)
    
    # 只移除常见 emoji，避免误删中文
    text = re.sub(r'[\U0001F600-\U0001F64F]', '', text)  # 表情
    text = re.sub(r'[\U0001F300-\U0001F5FF]', '', text)  # 符号
    text = re.sub(r'[\U0001F680-\U0001F6FF]', '', text)  # 交通
    text = re.sub(r'[\U0001F1E0-\U0001F1FF]', '', text)  # 旗帜
    text = re.sub(r'[\U00002702-\U000027B0]', '', text)  # 装饰符号
    text = re.sub(r'[\U0001F900-\U0001F9FF]', '', text)  # 补充符号
    
    # 移除控制字符
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    
    # 移除零宽字符
    text = re.sub(r'[\u200b-\u200f\u2028-\u202f\u205f-\u206f\ufeff]', '', text)
    
    # 确保是有效的 UTF-8 字符串
    try:
        text = text.encode('utf-8', errors='ignore').decode('utf-8')
    except:
        text = text.encode('ascii', errors='ignore').decode('ascii')
    
    # 限制长度
    text = text[:500]
    
    return text.strip()

# 测试普通中文
test1 = "您好，我是人工智能助手，专门设计来帮助您解答问题。"
result1 = clean_text_for_tts(test1)
print(f"测试1: {result1}")

# 测试带 emoji
test2 = "你好 ✨ 世界 🍵"
result2 = clean_text_for_tts(test2)
print(f"测试2: {result2}")

# 确保可以正常编码
try:
    encoded = result1.encode('utf-8')
    print(f"UTF-8 编码成功")
except Exception as e:
    print(f"编码失败: {e}")
