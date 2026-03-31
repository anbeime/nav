"""
小易 TTS 服务 - 简化版
使用 edge-tts (微软在线TTS)，无需本地模型
"""
import asyncio
import os
import time
import tempfile
import sys

# 安装 edge-tts: pip install edge-tts

try:
    import edge_tts
except ImportError:
    print("请先安装 edge-tts: pip install edge-tts")
    sys.exit(1)

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

AUDIO_DIR = os.path.join(tempfile.gettempdir(), 'xiaoyi_tts')
os.makedirs(AUDIO_DIR, exist_ok=True)

# 可用音色
VOICES = {
    '晓晓': 'zh-CN-XiaoxiaoNeural',      # 女声，自然
    '晓伊': 'zh-CN-XiaoyiNeural',        # 女声，温柔
    '云希': 'zh-CN-YunxiNeural',         # 男声，年轻
    '云扬': 'zh-CN-YunyangNeural',       # 男声，新闻
    '晓辰': 'zh-CN-XiaochenNeural',      # 男声，成熟
}

async def generate_tts(text, voice_key='晓晓'):
    """生成TTS音频"""
    voice = VOICES.get(voice_key, 'zh-CN-XiaoxiaoNeural')
    filename = f'tts_{int(time.time()*1000)}.mp3'
    filepath = os.path.join(AUDIO_DIR, filename)
    
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(filepath)
    
    return filepath, filename

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'edge-tts',
        'voices': list(VOICES.keys())
    })

@app.route('/tts', methods=['POST'])
def tts():
    data = request.json
    text = data.get('text', '')
    voice = data.get('voice', '晓晓')
    
    if not text:
        return jsonify({'success': False, 'error': '文本为空'})
    
    try:
        start = time.time()
        
        # 清理文本
        clean_text = text.replace('🍵', '').replace('✨', '').replace('😊', '')[:500]
        
        # 异步生成
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        filepath, filename = loop.run_until_complete(generate_tts(clean_text, voice))
        loop.close()
        
        elapsed = time.time() - start
        print(f'[TTS] {voice} | {len(clean_text)}字 | {elapsed:.2f}s')
        
        return jsonify({
            'success': True,
            'audioUrl': f'/audio/{filename}',
            'duration': elapsed,
            'voice': voice
        })
    except Exception as e:
        print(f'[TTS] Error: {e}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/audio/<filename>', methods=['GET'])
def serve_audio(filename):
    filepath = os.path.join(AUDIO_DIR, filename)
    if os.path.exists(filepath):
        return send_file(filepath, mimetype='audio/mp3')
    return jsonify({'error': 'not found'}), 404

if __name__ == '__main__':
    print('=' * 50)
    print('🎤 小易 TTS 服务 (Edge-TTS)')
    print('=' * 50)
    print('音色:', list(VOICES.keys()))
    print('端口: 5050')
    print('=' * 50)
    app.run(host='0.0.0.0', port=5050, debug=False)
