#!/usr/bin/env python3
"""
StarClaw 动态视频 - 配音生成脚本
基于 Edge-TTS 生成高质量语音合成
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass
import yaml
import edge_tts


# ============ 数据结构 ============

@dataclass
class VoiceConfig:
    """音色配置"""
    name: str
    description: str = ""
    gender: str = "neutral"
    suitable: List[str] = None

    def __post_init__(self):
        if self.suitable is None:
            self.suitable = []


@dataclass
class SceneNarration:
    """场景配音"""
    scene_id: int
    text: str
    voice: str = "zh-CN-XiaoxiaoNeural"
    speed: float = 0.95
    pitch: str = "default"
    volume: int = 100
    break_before: int = 0
    break_after: int = 0


# ============ 配置加载 ============

def load_voice_config(config_path: str) -> Dict[str, VoiceConfig]:
    """加载音色配置"""
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    voices = {}
    for voice_id, voice_data in config.get('voices', {}).items():
        voices[voice_id] = VoiceConfig(
            name=voice_data['name'],
            description=voice_data.get('description', ''),
            gender=voice_data.get('gender', 'neutral'),
            suitable=voice_data.get('suitable', [])
        )

    return voices


def load_narration_script(script_path: str) -> List[SceneNarration]:
    """加载配音脚本"""
    ext = Path(script_path).suffix.lower()

    if ext in ['.yaml', '.yml']:
        with open(script_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
    elif ext == '.json':
        with open(script_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        raise ValueError(f"Unsupported script format: {ext}")

    narrations = []
    for scene in data.get('scenes', []):
        narrations.append(SceneNarration(
            scene_id=scene.get('scene_id', 0),
            text=scene.get('text', ''),
            voice=scene.get('voice', 'zh-CN-XiaoxiaoNeural'),
            speed=scene.get('speed', 0.95),
            pitch=scene.get('pitch', 'default'),
            volume=scene.get('volume', 100),
            break_before=scene.get('break_before', 0),
            break_after=scene.get('break_after', 0)
        ))

    return narrations


# ============ SSML 生成 ============

def generate_ssml(narration: SceneNarration) -> str:
    """生成 SSML 标记"""
    ssml_parts = ['<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">']

    # 前置停顿
    if narration.break_before > 0:
        ssml_parts.append(f'<break time="{narration.break_before}ms"/>')

    # 语速和音调包装
    prosody_attrs = []
    if narration.speed != 1.0:
        prosody_attrs.append(f'rate="{narration.speed}"')
    if narration.pitch != "default":
        prosody_attrs.append(f'pitch="{narration.pitch}"')
    if narration.volume != 100:
        prosody_attrs.append(f'volume="{narration.volume}%"')

    if prosody_attrs:
        ssml_parts.append(f'<prosody {" ".join(prosody_attrs)}>')
        ssml_parts.append(narration.text)
        ssml_parts.append('</prosody>')
    else:
        ssml_parts.append(narration.text)

    # 后置停顿
    if narration.break_after > 0:
        ssml_parts.append(f'<break time="{narration.break_after}ms"/>')

    ssml_parts.append('</speak>')

    return ''.join(ssml_parts)


def text_with_breaks(narration: SceneNarration) -> str:
    """生成带停顿标记的纯文本（Edge-TTS 不完全支持 SSML）"""
    text_parts = []

    # 添加静音标记（通过逗号模拟）
    if narration.break_before > 0:
        pause_count = narration.break_before // 200
        text_parts.append('，' * pause_count)

    text_parts.append(narration.text)

    if narration.break_after > 0:
        pause_count = narration.break_after // 200
        text_parts.append('，' * pause_count)

    return ''.join(text_parts)


# ============ 语音合成 ============

async def synthesize_scene(
    narration: SceneNarration,
    output_path: str,
    voice_config: Optional[Dict[str, VoiceConfig]] = None
) -> str:
    """合成单个场景的语音"""
    print(f"  合成场景 {narration.scene_id}: {narration.text[:30]}...")

    # 准备文本
    text = text_with_breaks(narration)

    # 创建通信对象
    communicate = edge_tts.Communicate(
        text=text,
        voice=narration.voice,
        rate=f"{'+' if narration.speed > 1 else ''}{int((narration.speed - 1) * 100)}%"
    )

    # 保存音频
    await communicate.save(output_path)

    return output_path


async def synthesize_all(
    narrations: List[SceneNarration],
    output_dir: str,
    voice_config: Optional[Dict[str, VoiceConfig]] = None
) -> List[str]:
    """合成所有场景的语音"""
    os.makedirs(output_dir, exist_ok=True)

    output_files = []
    for narration in narrations:
        output_path = os.path.join(output_dir, f"scene_{narration.scene_id:02d}.mp3")
        await synthesize_scene(narration, output_path, voice_config)
        output_files.append(output_path)

    return output_files


# ============ 音频合并 ============

def merge_audio_files(audio_files: List[str], output_path: str, gap_ms: int = 500):
    """合并多个音频文件"""
    import subprocess

    # 创建文件列表
    list_file = os.path.join(os.path.dirname(output_path), 'concat_list.txt')
    with open(list_file, 'w', encoding='utf-8') as f:
        for audio_file in audio_files:
            # FFmpeg 需要 Unix 风格路径
            file_path = audio_file.replace('\\', '/')
            f.write(f"file '{file_path}'\n")
            # 添加间隔静音
            if gap_ms > 0:
                f.write(f"file 'silence_{gap_ms}ms.mp3'\n")

    # 生成静音文件
    silence_file = os.path.join(os.path.dirname(output_path), f'silence_{gap_ms}ms.mp3')
    if gap_ms > 0 and not os.path.exists(silence_file):
        subprocess.run([
            'ffmpeg', '-y', '-f', 'lavfi',
            '-i', f'anullsrc=r=24000:cl=mono',
            '-t', str(gap_ms / 1000),
            '-q:a', '9', silence_file
        ], check=True, capture_output=True)

    # 合并音频
    subprocess.run([
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
        '-i', list_file,
        '-c', 'copy', output_path
    ], check=True, capture_output=True)

    print(f"音频合并完成: {output_path}")
    return output_path


def get_audio_duration(audio_path: str) -> float:
    """获取音频时长"""
    import subprocess
    result = subprocess.run([
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        audio_path
    ], capture_output=True, text=True)

    return float(result.stdout.strip())


# ============ 字幕生成 ============

def generate_subtitles(
    narrations: List[SceneNarration],
    audio_dir: str,
    output_path: str,
    format: str = 'srt'
):
    """根据音频文件时长生成字幕"""
    subtitles = []
    current_time = 0.0

    for narration in narrations:
        audio_file = os.path.join(audio_dir, f"scene_{narration.scene_id:02d}.mp3")

        if os.path.exists(audio_file):
            duration = get_audio_duration(audio_file)
        else:
            # 估算时长（每个字符约0.3秒）
            duration = len(narration.text) * 0.3

        subtitles.append({
            'startTime': current_time,
            'endTime': current_time + duration,
            'text': narration.text
        })

        current_time += duration + 0.5  # 添加场景间隔

    # 保存字幕文件
    if format == 'srt':
        content = generate_srt_content(subtitles)
    else:
        content = generate_vtt_content(subtitles)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"字幕生成完成: {output_path}")
    return output_path


def generate_srt_content(subtitles: List[dict]) -> str:
    """生成 SRT 格式字幕"""
    lines = []

    for i, sub in enumerate(subtitles, 1):
        start_time = format_time_srt(sub['startTime'])
        end_time = format_time_srt(sub['endTime'])

        lines.append(str(i))
        lines.append(f"{start_time} --> {end_time}")
        lines.append(sub['text'])
        lines.append('')

    return '\n'.join(lines)


def generate_vtt_content(subtitles: List[dict]) -> str:
    """生成 VTT 格式字幕"""
    lines = ['WEBVTT', '']

    for sub in subtitles:
        start_time = format_time_vtt(sub['startTime'])
        end_time = format_time_vtt(sub['endTime'])

        lines.append(f"{start_time} --> {end_time}")
        lines.append(sub['text'])
        lines.append('')

    return '\n'.join(lines)


def format_time_srt(seconds: float) -> str:
    """格式化 SRT 时间"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)

    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def format_time_vtt(seconds: float) -> str:
    """格式化 VTT 时间"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)

    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


# ============ YAML 脚本示例 ============

EXAMPLE_SCRIPT = """
# 配音脚本示例
project: "品牌宣传视频"
voice_preset: "narrator_male"

scenes:
  - scene_id: 0
    text: "欢迎来到 StarClaw 虚拟娱乐公司"
    voice: "zh-CN-YunxiNeural"
    speed: 0.95
    break_after: 500

  - scene_id: 1
    text: "我们是一家专注于AI驱动的娱乐内容创作公司"
    speed: 0.9

  - scene_id: 2
    text: "拥有16位明星级AI智能体，涵盖喜剧、音乐、戏剧等全领域"
    speed: 0.9

  - scene_id: 3
    text: "让我们一起，创造无限可能"
    voice: "zh-CN-XiaoxiaoNeural"
    speed: 0.85
    break_before: 300
"""


def create_example_script(output_path: str):
    """创建示例配音脚本"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(EXAMPLE_SCRIPT.strip())
    print(f"示例脚本已创建: {output_path}")


# ============ 主函数 ============

async def main():
    import argparse

    parser = argparse.ArgumentParser(description='StarClaw 动态视频配音生成')
    parser.add_argument('--script', '-s', help='配音脚本文件路径 (YAML/JSON)')
    parser.add_argument('--output', '-o', default='./output/audio', help='输出目录')
    parser.add_argument('--config', '-c', default='../config/voices.json', help='音色配置文件')
    parser.add_argument('--merge', '-m', action='store_true', help='合并所有场景音频')
    parser.add_argument('--subtitles', '-t', action='store_true', help='生成字幕文件')
    parser.add_argument('--example', '-e', action='store_true', help='创建示例脚本')

    args = parser.parse_args()

    # 创建示例脚本
    if args.example:
        create_example_script('voiceover.yaml')
        return

    # 检查必要参数
    if not args.script:
        parser.print_help()
        return

    # 加载配置
    voice_config = None
    if os.path.exists(args.config):
        voice_config = load_voice_config(args.config)

    # 加载脚本
    print(f"加载配音脚本: {args.script}")
    narrations = load_narration_script(args.script)
    print(f"共 {len(narrations)} 个场景")

    # 创建输出目录
    audio_dir = os.path.join(args.output, 'scenes')
    os.makedirs(audio_dir, exist_ok=True)

    # 合成语音
    print("\n开始语音合成...")
    audio_files = await synthesize_all(narrations, audio_dir, voice_config)

    # 合并音频
    if args.merge:
        print("\n合并音频文件...")
        merged_path = os.path.join(args.output, 'voiceover.mp3')
        merge_audio_files(audio_files, merged_path)

    # 生成字幕
    if args.subtitles:
        print("\n生成字幕文件...")
        srt_path = os.path.join(args.output, 'subtitles.srt')
        vtt_path = os.path.join(args.output, 'subtitles.vtt')
        generate_subtitles(narrations, audio_dir, srt_path, 'srt')
        generate_subtitles(narrations, audio_dir, vtt_path, 'vtt')

    print("\n配音生成完成!")


if __name__ == '__main__':
    asyncio.run(main())
