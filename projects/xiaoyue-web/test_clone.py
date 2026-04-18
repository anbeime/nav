"""
测试 CosyVoice3 音色克隆功能
"""
import os
import sys
import time

# 添加路径
COSYVOICE_DIR = r'C:\E\Fun-CosyVoice3-0.5B'
sys.path.insert(0, COSYVOICE_DIR)
sys.path.insert(0, os.path.join(COSYVOICE_DIR, 'third_party', 'Matcha-TTS'))

print("=" * 60)
print("  CosyVoice3 音色克隆测试")
print("=" * 60)

# 1. 导入模型
print("\n[1/4] 导入 CosyVoice3...")
from cosyvoice.cli.cosyvoice import CosyVoice3
print("  导入成功!")

# 2. 加载模型
print("\n[2/4] 加载模型（可能需要1-2分钟）...")
model_path = os.path.join(COSYVOICE_DIR, 'pretrained_models', 'Fun-CosyVoice3-0.5B')
t_start = time.time()
model = CosyVoice3(model_path)
t_elapsed = time.time() - t_start
print(f"  模型加载成功! 耗时: {t_elapsed:.1f}s")

# 3. 检查可用音色
print("\n[3/4] 检查可用音色...")
spks = model.list_available_spks()
print(f"  预设音色: {spks}")

# 4. 测试 Zero-shot 克隆合成
print("\n[4/4] 测试 Zero-shot 克隆合成...")
prompt_audio = r'c:\D\工作流n8n-coze-dify\skill\skill-main\projects\xiaoyue-web\starclaw\data\voice-samples\clone_reference.wav'
prompt_text = "这是一段从B站下载的视频音频，用于音色克隆测试"
test_text = "你好，我是小易，这是使用B站视频音色进行的克隆测试。如果你能听到这段话，说明音色克隆功能已经成功启用了！"

print(f"  参考音频: {prompt_audio}")
print(f"  参考文本: {prompt_text[:30]}...")
print(f"  合成文本: {test_text[:30]}...")

if not os.path.exists(prompt_audio):
    print(f"  错误: 参考音频不存在!")
else:
    import numpy as np
    import soundfile as sf
    
    output_path = os.path.join(
        os.path.dirname(prompt_audio),
        f'clone_test_{int(time.time())}.wav'
    )
    
    t_start = time.time()
    result_count = 0
    for result in model.inference_zero_shot(test_text, prompt_text, prompt_audio):
        audio = result['tts_speech'].numpy().flatten()
        sf.write(output_path, audio, 22050)
        result_count += 1
        break
    
    t_elapsed = time.time() - t_start
    print(f"  合成完成! 耗时: {t_elapsed:.1f}s")
    print(f"  输出文件: {output_path}")
    print(f"  文件大小: {os.path.getsize(output_path) / 1024:.1f} KB")

print("\n" + "=" * 60)
print("  测试完成!")
print("=" * 60)
