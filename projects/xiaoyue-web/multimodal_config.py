"""
多模态模型配置 - 小易明星项目
整合所有可用的AI模型资源
"""

import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ==================== 模型路径配置 ====================

# 基础路径
BASE_PATHS = {
    'E_DRIVE': r'C:\E',
    'D_COMPET': r'C:\D\compet\intel\Intel-AIPC-Agent',
}

# 模型详细路径
MODEL_PATHS = {
    # 语音合成 (TTS)
    'cosyvoice': {
        'path': r'C:\E\Fun-CosyVoice3-0.5B\pretrained_models\Fun-CosyVoice3-0.5B',
        'type': 'tts',
        'size': '9.3GB',
        'priority': 1,  # 最高优先级
        'description': '轻量级语音合成，端侧友好',
    },
    'voxcpm': {
        'path': r'C:\E\VoxCPM\models',
        'type': 'tts',
        'size': '10.9GB',
        'priority': 2,
        'description': '高质量中文语音合成',
    },
    'vits_umamusume': {
        'path': r'C:\E\VITS-Umamusume-voice\pretrained_models',
        'type': 'tts',
        'size': '7.9GB',
        'priority': 3,
        'description': '特定音色语音合成',
    },
    
    # 语音识别 (ASR)
    'whisper_v3': {
        'path': r'C:\E\HD_HUMAN开源\HD_HUMAN\cosyvoice\models\whisper-large-v3',
        'type': 'asr',
        'size': '5.9GB',
        'priority': 1,
        'description': '语音识别',
    },
    
    # 视觉理解
    'florence_2': {
        'path': r'C:\E\Infinite_Talk\Florence-2-large',
        'type': 'vision',
        'size': '599MB',
        'priority': 1,
        'description': '图像描述、目标检测',
    },
    
    # OCR
    'pp_ocr': {
        'path': r'C:\D\compet\intel\Intel-AIPC-Agent\tools\ppocr',
        'type': 'ocr',
        'size': '34.5MB',
        'priority': 1,
        'description': '场景文字识别',
    },
    
    # 语义排序
    'bge_reranker': {
        'path': r'C:\D\compet\intel\Intel-AIPC-Agent\tools\bge-reranker-large',
        'type': 'rerank',
        'size': '4.3GB',
        'priority': 2,
        'description': '文本相关性排序',
    },
    
    # 数字人
    'hd_human': {
        'path': r'C:\E\HD_HUMAN开源\HD_HUMAN',
        'type': 'digital_human',
        'size': '5.0GB',
        'priority': 2,
        'description': '数字人+语音合成',
    },
    'infinite_talk': {
        'path': r'C:\E\Infinite_Talk',
        'type': 'digital_human',
        'size': '20.8GB',
        'priority': 3,
        'description': '完整数字人对话系统',
    },
}

# ==================== 模型管理器 ====================

class MultimodalModelManager:
    """多模态模型管理器"""
    
    def __init__(self):
        self.loaded_models: Dict[str, any] = {}
        self.model_status: Dict[str, bool] = {}
        
    def check_model_exists(self, model_name: str) -> bool:
        """检查模型文件是否存在"""
        if model_name not in MODEL_PATHS:
            return False
        path = MODEL_PATHS[model_name]['path']
        return os.path.exists(path)
    
    def get_available_models(self) -> List[str]:
        """获取所有可用的模型列表"""
        available = []
        for name, config in MODEL_PATHS.items():
            if self.check_model_exists(name):
                available.append(name)
        return available
    
    def get_models_by_type(self, model_type: str) -> List[str]:
        """按类型获取模型"""
        models = []
        for name, config in MODEL_PATHS.items():
            if config['type'] == model_type and self.check_model_exists(name):
                models.append(name)
        # 按优先级排序
        models.sort(key=lambda x: MODEL_PATHS[x]['priority'])
        return models
    
    def get_model_info(self, model_name: str) -> Optional[Dict]:
        """获取模型详细信息"""
        if model_name not in MODEL_PATHS:
            return None
        info = MODEL_PATHS[model_name].copy()
        info['exists'] = self.check_model_exists(model_name)
        info['name'] = model_name
        return info
    
    def print_model_status(self):
        """打印所有模型状态"""
        print("=" * 60)
        print("多模态模型资源状态")
        print("=" * 60)
        
        for model_type in ['tts', 'asr', 'vision', 'ocr', 'rerank', 'digital_human']:
            type_names = {
                'tts': '语音合成 (TTS)',
                'asr': '语音识别 (ASR)',
                'vision': '视觉理解',
                'ocr': '文字识别 (OCR)',
                'rerank': '语义排序',
                'digital_human': '数字人',
            }
            print(f"\n📦 {type_names.get(model_type, model_type)}")
            print("-" * 60)
            
            models = self.get_models_by_type(model_type)
            for name in models:
                info = self.get_model_info(name)
                status = "✅" if info['exists'] else "❌"
                print(f"  {status} {name:20} | {info['size']:>8} | P{info['priority']} | {info['description']}")

# ==================== 推荐配置 ====================

RECOMMENDED_CONFIGS = {
    'minimal': {
        'name': '最小化配置',
        'description': '基础语音对话',
        'models': ['cosyvoice', 'whisper_v3', 'florence_2'],
        'total_size': '约15GB',
        'features': ['语音输入', '语音输出', '看图说话'],
    },
    'standard': {
        'name': '标准配置',
        'description': '完整多模态体验',
        'models': ['cosyvoice', 'whisper_v3', 'florence_2', 'pp_ocr', 'bge_reranker'],
        'total_size': '约20GB',
        'features': ['语音对话', '视觉理解', 'OCR', '知识增强'],
    },
    'premium': {
        'name': '高级配置',
        'description': '数字人虚拟形象',
        'models': ['cosyvoice', 'whisper_v3', 'florence_2', 'pp_ocr', 'hd_human'],
        'total_size': '约25GB',
        'features': ['语音对话', '视觉理解', '数字人形象'],
    },
    'ultimate': {
        'name': '旗舰配置',
        'description': '完整商业方案',
        'models': ['cosyvoice', 'whisper_v3', 'florence_2', 'pp_ocr', 'bge_reranker', 'infinite_talk'],
        'total_size': '约40GB',
        'features': ['全部功能', '完整数字人系统'],
    },
}

# ==================== 快速测试 ====================

if __name__ == '__main__':
    manager = MultimodalModelManager()
    manager.print_model_status()
    
    print("\n" + "=" * 60)
    print("推荐配置方案")
    print("=" * 60)
    
    for key, config in RECOMMENDED_CONFIGS.items():
        print(f"\n🎯 {config['name']} ({key})")
        print(f"   描述: {config['description']}")
        print(f"   大小: {config['total_size']}")
        print(f"   模型: {', '.join(config['models'])}")
        print(f"   功能: {', '.join(config['features'])}")
