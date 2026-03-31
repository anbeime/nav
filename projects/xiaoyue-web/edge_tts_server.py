"""
小易 Edge-TTS 微服务
使用微软 Edge 浏览器的在线 TTS 服务
"""
import asyncio
import os
import time
import tempfile
import re
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

AUDIO_DIR = os.path.join(tempfile.gettempdir(), 'xiaoyi_edge_tts')
os.makedirs(AUDIO_DIR, exist_ok=True)

# 可用音色列表（中文别名 -> Edge TTS ID）
VOICE_MAP = {
    # 女声
    '晓晓': 'zh-CN-XiaoxiaoNeural',
    '晓伊': 'zh-CN-XiaoyiNeural', 
    '晓涵': 'zh-CN-XiaohanNeural',
    # 男声（Edge-TTS 只有这两个真正的男声）
    '云希': 'zh-CN-YunxiNeural',      # 青年男声（活泼）
    '云扬': 'zh-CN-YunyangNeural',    # 新闻男声（稳重）
    '晓辰': 'zh-CN-YunyangNeural',    # 晓辰实际是女声，这里用云扬替代
}

# 性别信息
VOICE_GENDER = {
    '晓晓': '女声', '晓伊': '女声', '晓涵': '女声',
    '云希': '男声', '云扬': '男声', '晓辰': '男声',
}

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
        # 编码再解码，自动过滤无效字符
        text = text.encode('utf-8', errors='ignore').decode('utf-8')
    except:
        text = text.encode('ascii', errors='ignore').decode('ascii')
    
    # 限制长度
    text = text[:500]
    
    return text.strip()

async def generate_edge_tts(text, voice_id, output_file=None):
    """使用 edge-tts 生成音频"""
    try:
        import edge_tts
        
        if output_file is None:
            output_file = os.path.join(AUDIO_DIR, f'tts_{int(time.time()*1000)}.mp3')
        
        communicate = edge_tts.Communicate(text, voice_id)
        await communicate.save(output_file)
        
        return output_file
    except ImportError:
        raise Exception("edge-tts 未安装，请运行: pip install edge-tts")
    except Exception as e:
        raise Exception(f"TTS 生成失败: {e}")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'edge-tts',
        'voices': list(VOICE_MAP.keys()),
        'default_voice': '晓晓'
    })

@app.route('/voices', methods=['GET'])
def list_voices():
    return jsonify({
        'success': True,
        'voices': [
            {'name': name, 'id': vid, 'gender': VOICE_GENDER.get(name, '未知')}
            for name, vid in VOICE_MAP.items()
        ]
    })

@app.route('/tts', methods=['POST'])
def tts():
    """文本转语音"""
    data = request.json
    text = data.get('text', '')
    voice_name = data.get('voice', '晓晓')
    
    if not text:
        return jsonify({'success': False, 'error': '文本为空'})
    
    # 获取音色 ID
    voice_id = VOICE_MAP.get(voice_name, 'zh-CN-XiaoxiaoNeural')
    print(f"[Edge-TTS] 请求音色: {voice_name} -> {voice_id}")
    
    # 清理文本
    clean_text_str = clean_text_for_tts(text)
    
    # 安全打印（避免 Unicode 编码错误）
    try:
        safe_original = text[:50].encode('utf-8', errors='replace').decode('utf-8')
        safe_cleaned = clean_text_str[:50].encode('utf-8', errors='replace').decode('utf-8')
        print(f"[Edge-TTS] 原文: {safe_original}... -> 清理后: {safe_cleaned}...")
    except:
        print(f"[Edge-TTS] 文本处理完成")
    
    if not clean_text_str.strip():
        print(f"[Edge-TTS] 警告: 清理后文本为空，使用原文")
        clean_text_str = text[:200]  # 直接使用原文
    
    if not clean_text_str.strip():
        return jsonify({'success': False, 'error': '清理后文本为空'})
    
    try:
        start = time.time()
        
        # 生成音频（添加超时保护）
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            output_file = loop.run_until_complete(
                asyncio.wait_for(
                    generate_edge_tts(clean_text_str, voice_id),
                    timeout=30  # 30秒超时
                )
            )
        except asyncio.TimeoutError:
            print(f"[Edge-TTS] 超时: 生成音频超过30秒")
            return jsonify({'success': False, 'error': '生成超时，请稍后重试'})
        finally:
            loop.close()
        
        filename = os.path.basename(output_file)
        elapsed = time.time() - start
        
        print(f"[Edge-TTS] 成功: {voice_name} | {len(clean_text_str)}字 | {elapsed:.2f}s")
        
        return jsonify({
            'success': True,
            'audioUrl': f'/audio/{filename}',
            'duration': elapsed,
            'voice': voice_name,
            'text': clean_text_str[:50]
        })
    except Exception as e:
        print(f"[Edge-TTS] 失败: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/audio/<filename>', methods=['GET'])
def serve_audio(filename):
    """提供音频文件"""
    filepath = os.path.join(AUDIO_DIR, filename)
    if os.path.exists(filepath):
        return send_file(filepath, mimetype='audio/mpeg')
    return jsonify({'error': 'not found'}), 404

if __name__ == '__main__':
    print("=" * 50)
    print("Edge-TTS Service")
    print("=" * 50)
    print("Voices:")
    for name, vid in VOICE_MAP.items():
        print(f"  - {name} ({VOICE_GENDER.get(name, '?')}): {vid}")
    print("=" * 50)
    print("Port: 5051")
    print("=" * 50)
    
    # threaded=True 允许并发请求
    app.run(host='0.0.0.0', port=5051, debug=False, threaded=True)
