"""
语音识别服务 (ASR Service)
使用 Whisper 进行语音转文字
"""

import sys
import time
import torch
import numpy as np
from pathlib import Path
from typing import Optional, Tuple
import tempfile

# Whisper 模型路径
WHISPER_MODEL_PATH = r'C:\E\HD_HUMAN开源\HD_HUMAN\cosyvoice\models\whisper-large-v3'

class ASRService:
    """语音识别服务"""
    
    def __init__(self, model_name: str = 'whisper-large-v3'):
        self.model_name = model_name
        self.model = None
        self.processor = None
        self.is_loaded = False
        
    def load_model(self) -> bool:
        """加载 Whisper 模型"""
        try:
            print(f"正在加载 Whisper 模型: {WHISPER_MODEL_PATH}")
            
            from transformers import WhisperProcessor, WhisperForConditionalGeneration
            
            self.processor = WhisperProcessor.from_pretrained(WHISPER_MODEL_PATH)
            self.model = WhisperForConditionalGeneration.from_pretrained(WHISPER_MODEL_PATH)
            
            # 移动到 GPU（如果可用）
            if torch.cuda.is_available():
                self.model = self.model.cuda()
                print("✅ 使用 GPU 加速")
            else:
                print("ℹ️  使用 CPU 推理")
            
            self.is_loaded = True
            print("✅ Whisper 模型加载成功")
            return True
            
        except Exception as e:
            print(f"❌ Whisper 加载失败: {e}")
            return False
    
    def transcribe(
        self,
        audio_path: str,
        language: str = 'zh',
        task: str = 'transcribe'
    ) -> Tuple[str, float]:
        """
        语音识别
        
        Args:
            audio_path: 音频文件路径
            language: 语言代码 (zh, en, ja, etc.)
            task: 任务类型 ('transcribe' 或 'translate')
            
        Returns:
            (识别文本, 推理时间ms)
        """
        if not self.is_loaded:
            if not self.load_model():
                raise RuntimeError("模型未加载")
        
        start_time = time.time()
        
        try:
            import librosa
            
            # 加载音频
            audio, sr = librosa.load(audio_path, sr=16000)
            
            # 预处理
            input_features = self.processor(
                audio,
                sampling_rate=16000,
                return_tensors="pt"
            ).input_features
            
            if torch.cuda.is_available():
                input_features = input_features.cuda()
            
            # 推理
            forced_decoder_ids = self.processor.get_decoder_prompt_ids(
                language=language,
                task=task
            )
            
            predicted_ids = self.model.generate(
                input_features,
                forced_decoder_ids=forced_decoder_ids
            )
            
            # 解码
            transcription = self.processor.batch_decode(
                predicted_ids,
                skip_special_tokens=True
            )[0]
            
            inference_time = (time.time() - start_time) * 1000
            return transcription, inference_time
            
        except Exception as e:
            print(f"语音识别失败: {e}")
            raise


# ==================== 快速测试 ====================

if __name__ == '__main__':
    print("=" * 60)
    print("🎤 Whisper ASR 测试")
    print("=" * 60)
    
    asr = ASRService()
    
    if asr.load_model():
        print("\n✅ 模型加载成功，可以开始识别")
        print("\n💡 使用方法:")
        print("   text, time_ms = asr.transcribe('audio.wav', language='zh')")
    else:
        print("\n❌ 模型加载失败")
