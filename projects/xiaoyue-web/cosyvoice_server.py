"""
CosyVoice TTS API 服务
端口: 5050
提供高质量的中文语音合成
"""

import os
import sys
import time
import tempfile
import threading
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# 添加 CosyVoice 路径
COSYVOICE_DIR = r'C:\E\Fun-CosyVoice3-0.5B'
sys.path.insert(0, COSYVOICE_DIR)
sys.path.insert(0, os.path.join(COSYVOICE_DIR, 'third_party', 'Matcha-TTS'))

app = Flask(__name__)
CORS(app)

# 音频输出目录
AUDIO_DIR = os.path.join(tempfile.gettempdir(), 'xiaoyi_cosyvoice')
os.makedirs(AUDIO_DIR, exist_ok=True)

# CosyVoice 模型实例
cosyvoice_model = None
model_lock = threading.Lock()

# 音色映射（Edge-TTS 音色名 -> CosyVoice 音色）
VOICE_MAP = {
    # 女声
    '晓晓': ('中文女', 'female'),
    '晓伊': ('中文女', 'female'),
    '晓涵': ('中文女', 'female'),
    # 男声
    '云希': ('中文男', 'male'),
    '云扬': ('中文男', 'male'),
    '晓辰': ('中文男', 'male'),
    # 默认
    'default': ('中文女', 'female')
}

def load_model():
    """加载 CosyVoice 模型"""
    global cosyvoice_model
    
    if cosyvoice_model is not None:
        return True
    
    try:
        print("[CosyVoice] 正在加载模型...")
        from cosyvoice.cli.cosyvoice import CosyVoice
        
        model_path = os.path.join(COSYVOICE_DIR, 'pretrained_models', 'Fun-CosyVoice3-0.5B')
        
        if not os.path.exists(model_path):
            print(f"[CosyVoice] 模型路径不存在: {model_path}")
            return False
        
        cosyvoice_model = CosyVoice(model_path)
        print("[CosyVoice] 模型加载成功!")
        return True
        
    except Exception as e:
        print(f"[CosyVoice] 模型加载失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def synthesize_speech(text, speaker='中文女'):
    """合成语音"""
    global cosyvoice_model, model_lock
    
    if cosyvoice_model is None:
        if not load_model():
            return None, "模型未加载"
    
    try:
        with model_lock:
            # 生成输出文件路径
            output_path = os.path.join(AUDIO_DIR, f'tts_{int(time.time() * 1000)}.wav')
            
            # 使用 CosyVoice 推理
            # CosyVoice 3.0 支持多种推理模式
            for result in cosyvoice_model.inference_sft(text, speaker):
                # 保存音频
                import numpy as np
                import soundfile as sf
                
                audio = result['tts_speech'].numpy().flatten()
                sf.write(output_path, audio, 22050)
                break  # 只取第一个结果
            
            return output_path, None
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None, str(e)


@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    model_loaded = cosyvoice_model is not None
    return jsonify({
        'status': 'ok' if model_loaded else 'loading',
        'service': 'cosyvoice',
        'model_loaded': model_loaded,
        'voices': list(VOICE_MAP.keys())
    })


@app.route('/voices', methods=['GET'])
def list_voices():
    """列出可用音色"""
    return jsonify({
        'success': True,
        'voices': [
            {'name': name, 'speaker': info[0], 'gender': info[1]}
            for name, info in VOICE_MAP.items()
        ]
    })


@app.route('/tts', methods=['POST'])
def tts():
    """文本转语音"""
    data = request.json or {}
    text = data.get('text', '')
    voice = data.get('voice', '晓晓')
    speaker = data.get('speaker', voice)
    
    if not text:
        return jsonify({'success': False, 'error': '文本为空'})
    
    # 清理文本
    import re
    text = re.sub(r'[\U0001F600-\U0001F64F]', '', text)  # 表情
    text = re.sub(r'[\U0001F300-\U0001F5FF]', '', text)  # 符号
    text = re.sub(r'[\U0001F680-\U0001F6FF]', '', text)  # 交通
    text = text.strip()[:300]    
    if not text:
        return jsonify({'success': False, 'error': '清理后文本为空'})
    
    # 获取 CosyVoice 音色
    cosy_speaker = VOICE_MAP.get(voice, VOICE_MAP.get(speaker, ('中文女', 'female')))[0]
    
    print(f"[CosyVoice] 合成请求: voice={voice}, speaker={cosy_speaker}, text={text[:30]}...")
    
    start_time = time.time()
    output_path, error = synthesize_speech(text, cosy_speaker)
    elapsed = time.time() - start_time
    
    if error:
        print(f"[CosyVoice] 合成失败: {error}")
        return jsonify({'success': False, 'error': error})
    
    filename = os.path.basename(output_path)
    print(f"[CosyVoice] 合成成功: {elapsed:.2f}s, {filename}")
    
    return jsonify({
        'success': True,
        'audioUrl': f'/audio/{filename}',
        'duration': elapsed,
        'voice': voice,
        'speaker': cosy_speaker
    })


@app.route('/audio/<filename>', methods=['GET'])
def serve_audio(filename):
    """提供音频文件"""
    filepath = os.path.join(AUDIO_DIR, filename)
    if os.path.exists(filepath):
        return send_file(filepath, mimetype='audio/wav')
    return jsonify({'error': 'not found'}), 404


@app.route('/load', methods=['POST'])
def trigger_load():
    """触发模型加载"""
    success = load_model()
    return jsonify({
        'success': success,
        'model_loaded': cosyvoice_model is not None
    })


if __name__ == '__main__':
    print("=" * 50)
    print("CosyVoice TTS API Service")
    print("=" * 50)
    print(f"Model Dir: {COSYVOICE_DIR}")
    print(f"Audio Dir: {AUDIO_DIR}")
    print(f"Port: 5050")
    print("=" * 50)
    print("Voices:")
    for name, (speaker, gender) in VOICE_MAP.items():
        print(f"  - {name}: {speaker} ({gender})")
    print("=" * 50)
    
    # 预加载模型（可选，启动时加载）
    # print("[CosyVoice] 预加载模型...")
    # load_model()
    
    app.run(host='0.0.0.0', port=5050, debug=False, threaded=True)
