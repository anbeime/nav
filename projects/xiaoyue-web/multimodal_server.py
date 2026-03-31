"""
小易 TTS/ASR 微服务
提供 HTTP API 给 Node.js 小易服务器调用
"""
import sys, os, time, json, tempfile
sys.path.insert(0, r'C:\E\Fun-CosyVoice3-0.5B')

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 全局模型实例
cosyvoice_model = None
whisper_model = None
whisper_processor = None

AUDIO_DIR = os.path.join(tempfile.gettempdir(), 'xiaoyi_audio')
os.makedirs(AUDIO_DIR, exist_ok=True)

def load_cosyvoice():
    global cosyvoice_model
    if cosyvoice_model is None:
        print("[TTS] 正在加载 CosyVoice...")
        from cosyvoice.cli.cosyvoice import CosyVoice
        cosyvoice_model = CosyVoice(r'C:\E\Fun-CosyVoice3-0.5B\pretrained_models\Fun-CosyVoice3-0.5B')
        print("[TTS] ✅ CosyVoice 加载完成")
    return cosyvoice_model

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'tts_loaded': cosyvoice_model is not None,
        'asr_loaded': whisper_model is not None,
    })

@app.route('/tts', methods=['POST'])
def tts():
    data = request.json
    text = data.get('text', '')
    speaker = data.get('speaker', '中文女')
    
    if not text:
        return jsonify({'success': False, 'error': '文本为空'})
    
    try:
        model = load_cosyvoice()
        start = time.time()
        
        filename = f'tts_{int(time.time()*1000)}.wav'
        filepath = os.path.join(AUDIO_DIR, filename)
        
        import soundfile as sf
        for result in model.inference_sft(text, speaker):
            audio = result['tts_speech'].numpy().flatten()
            sf.write(filepath, audio, 22050)
        
        elapsed = time.time() - start
        print(f"[TTS] 合成完成: {len(text)}字, {elapsed:.2f}s -> {filename}")
        
        return jsonify({
            'success': True,
            'audioUrl': f'/audio/{filename}',
            'duration': elapsed,
            'text': text
        })
    except Exception as e:
        print(f"[TTS] 错误: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/asr', methods=['POST'])
def asr():
    if 'audio' not in request.files:
        return jsonify({'success': False, 'error': '没有音频文件'})
    
    try:
        audio_file = request.files['audio']
        filepath = os.path.join(AUDIO_DIR, f'asr_{int(time.time()*1000)}.wav')
        audio_file.save(filepath)
        
        # 使用 SenseVoice（CosyVoice 自带的 ASR）
        global whisper_model, whisper_processor
        if whisper_model is None:
            print("[ASR] 正在加载 SenseVoice...")
            from funasr import AutoModel
            whisper_model = AutoModel(
                model=r'C:\E\Fun-CosyVoice3-0.5B\pretrained_models\SenseVoiceSmall',
                trust_remote_code=True,
            )
            print("[ASR] ✅ SenseVoice 加载完成")
        
        start = time.time()
        result = whisper_model.generate(input=filepath, language='zh')
        text = result[0]['text'] if result else ''
        elapsed = time.time() - start
        
        print(f"[ASR] 识别完成: {text[:50]}... ({elapsed:.2f}s)")
        
        return jsonify({
            'success': True,
            'text': text,
            'duration': elapsed
        })
    except Exception as e:
        print(f"[ASR] 错误: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/audio/<filename>', methods=['GET'])
def serve_audio(filename):
    filepath = os.path.join(AUDIO_DIR, filename)
    if os.path.exists(filepath):
        return send_file(filepath, mimetype='audio/wav')
    return jsonify({'error': 'not found'}), 404

if __name__ == '__main__':
    print("=" * 50)
    print("🎵 小易多模态微服务")
    print("=" * 50)
    print(f"TTS: CosyVoice (C:\\E\\Fun-CosyVoice3-0.5B)")
    print(f"ASR: SenseVoice (C:\\E\\Fun-CosyVoice3-0.5B)")
    print(f"端口: 5050")
    print("=" * 50)
    
    # 预加载 TTS
    load_cosyvoice()
    
    app.run(host='0.0.0.0', port=5050, debug=False)
