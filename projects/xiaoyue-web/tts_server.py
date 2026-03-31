"""小易 TTS/ASR 微服务 - 支持音色克隆"""
import sys, os, time, json, tempfile, traceback
sys.path.insert(0, r'C:\E\Fun-CosyVoice3-0.5B')

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

cosyvoice_model = None
AUDIO_DIR = os.path.join(tempfile.gettempdir(), 'xiaoyi_audio')
VOICE_DIR = r'C:\D\StepFun\voices'
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(VOICE_DIR, exist_ok=True)

def get_model():
    global cosyvoice_model
    if cosyvoice_model is None:
        from cosyvoice.cli.cosyvoice import CosyVoice3 as CosyVoice
        print("[TTS] 加载 CosyVoice3 模型...")
        cosyvoice_model = CosyVoice(r'C:\E\Fun-CosyVoice3-0.5B\pretrained_models\Fun-CosyVoice3-0.5B')
        print("[TTS] ✅ 加载完成")
    return cosyvoice_model

@app.route('/health', methods=['GET'])
def health():
    voices = [f.replace('.wav','') for f in os.listdir(VOICE_DIR) if f.endswith('.wav')]
    return jsonify({
        'status': 'ok',
        'tts_loaded': cosyvoice_model is not None,
        'cloned_voices': voices
    })

@app.route('/tts', methods=['POST'])
def tts():
    data = request.json
    text = data.get('text', '')
    speaker = data.get('speaker', '中文女')
    voice = data.get('voice', '')  # 克隆音色名称
    
    if not text:
        return jsonify({'success': False, 'error': '文本为空'})
    
    try:
        model = get_model()
        import soundfile as sf
        import torchaudio
        start = time.time()
        
        filename = f'tts_{int(time.time()*1000)}.wav'
        filepath = os.path.join(AUDIO_DIR, filename)
        
        # 如果指定了克隆音色
        voice_file = os.path.join(VOICE_DIR, f'{voice}.wav') if voice else ''
        voice_txt = os.path.join(VOICE_DIR, f'{voice}.txt') if voice else ''
        
        if voice and os.path.exists(voice_file) and os.path.exists(voice_txt):
            # 零样本克隆模式
            with open(voice_txt, 'r', encoding='utf-8') as f:
                prompt_text = f.read().strip()
            
            prompt_wav, sr = torchaudio.load(voice_file)
            # 重采样到模型采样率
            if sr != model.sample_rate:
                prompt_wav = torchaudio.functional.resample(prompt_wav, sr, model.sample_rate)
            
            print(f"[TTS] 克隆模式: voice={voice}, prompt={prompt_text[:30]}...")
            for result in model.inference_zero_shot(text, prompt_text, prompt_wav):
                audio = result['tts_speech'].numpy().flatten()
                sf.write(filepath, audio, model.sample_rate)
        else:
            # 预训练说话人模式
            for result in model.inference_sft(text, speaker):
                audio = result['tts_speech'].numpy().flatten()
                sf.write(filepath, audio, model.sample_rate)
        
        elapsed = time.time() - start
        print(f"[TTS] {len(text)}字 -> {elapsed:.1f}s {'(克隆:'+voice+')' if voice else ''}")
        return jsonify({'success': True, 'audioUrl': f'/audio/{filename}', 'duration': elapsed})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)})

@app.route('/clone', methods=['POST'])
def clone_voice():
    """上传参考音频进行音色克隆注册"""
    if 'audio' not in request.files:
        return jsonify({'success': False, 'error': '请上传音频文件'})
    
    name = request.form.get('name', f'voice_{int(time.time())}')
    prompt_text = request.form.get('text', '')
    
    if not prompt_text:
        return jsonify({'success': False, 'error': '请提供参考音频对应的文字内容'})
    
    try:
        audio_file = request.files['audio']
        wav_path = os.path.join(VOICE_DIR, f'{name}.wav')
        txt_path = os.path.join(VOICE_DIR, f'{name}.txt')
        
        audio_file.save(wav_path)
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(prompt_text)
        
        print(f"[Clone] ✅ 音色已注册: {name}")
        return jsonify({
            'success': True,
            'voice': name,
            'message': f'音色 "{name}" 已注册，合成时使用 voice="{name}" 即可'
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)})

@app.route('/voices', methods=['GET'])
def list_voices():
    """列出所有已注册的克隆音色"""
    voices = []
    for f in os.listdir(VOICE_DIR):
        if f.endswith('.wav'):
            name = f.replace('.wav', '')
            txt_path = os.path.join(VOICE_DIR, f'{name}.txt')
            prompt_text = ''
            if os.path.exists(txt_path):
                with open(txt_path, 'r', encoding='utf-8') as tf:
                    prompt_text = tf.read().strip()
            voices.append({'name': name, 'prompt_text': prompt_text})
    return jsonify({'success': True, 'voices': voices})

@app.route('/audio/<filename>', methods=['GET'])
def serve_audio(filename):
    filepath = os.path.join(AUDIO_DIR, filename)
    if os.path.exists(filepath):
        return send_file(filepath, mimetype='audio/wav')
    return jsonify({'error': 'not found'}), 404

if __name__ == '__main__':
    print("=" * 50)
    print("🎵 小易 TTS 微服务 (支持音色克隆)")
    print("=" * 50)
    print(f"端口: 5050")
    print(f"音色目录: {VOICE_DIR}")
    print(f"克隆方法: POST /clone (上传音频+文字)")
    print(f"合成方法: POST /tts (text + voice)")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5050, debug=False)
