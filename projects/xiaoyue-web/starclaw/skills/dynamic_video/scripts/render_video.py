#!/usr/bin/env python3
"""
StarClaw 动态视频 - 视频渲染脚本
管理 Remotion 项目的渲染任务
"""

import os
import sys
import json
import subprocess
import argparse
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime


# ============ 配置 ============

DEFAULT_FPS = 30
DEFAULT_RESOLUTION = "1920x1080"
DEFAULT_QUALITY = "high"

QUALITY_PRESETS = {
    "draft": {"crf": 28, "preset": "ultrafast"},
    "low": {"crf": 25, "preset": "fast"},
    "medium": {"crf": 23, "preset": "medium"},
    "high": {"crf": 20, "preset": "slow"},
    "ultra": {"crf": 18, "preset": "veryslow"},
}


# ============ 数据结构 ============

@dataclass
class RenderConfig:
    """渲染配置"""
    composition: str
    output_path: str
    fps: int = DEFAULT_FPS
    resolution: str = DEFAULT_RESOLUTION
    quality: str = DEFAULT_QUALITY
    codec: str = "h264"
    audio_codec: str = "aac"
    props: Optional[Dict] = None
    frame_range: Optional[tuple] = None


# ============ Remotion 命令构建 ============

def build_render_command(config: RenderConfig, remotion_dir: str) -> List[str]:
    """构建 Remotion 渲染命令"""
    width, height = map(int, config.resolution.split('x'))

    cmd = [
        "npx", "remotion", "render",
        config.composition,
        config.output_path,
        "--fps", str(config.fps),
        "--width", str(width),
        "--height", str(height),
    ]

    # 质量设置
    if config.quality in QUALITY_PRESETS:
        preset = QUALITY_PRESETS[config.quality]
        cmd.extend(["--crf", str(preset["crf"])])

    # 编码设置
    cmd.extend(["--codec", config.codec])
    cmd.extend(["--audio-codec", config.audio_codec])

    # 属性文件
    if config.props:
        props_path = os.path.join(os.path.dirname(config.output_path), "props.json")
        with open(props_path, 'w', encoding='utf-8') as f:
            json.dump(config.props, f, ensure_ascii=False, indent=2)
        cmd.extend(["--props", props_path])

    # 帧范围
    if config.frame_range:
        start, end = config.frame_range
        cmd.extend(["--frames", f"{start}-{end}"])

    return cmd


def build_preview_command(composition: str, remotion_dir: str) -> List[str]:
    """构建 Remotion 预览命令"""
    return ["npm", "run", "dev"]


def build_compositions_command(remotion_dir: str) -> List[str]:
    """构建获取组合列表命令"""
    return ["npx", "remotion", "compositions", "--json"]


# ============ 渲染执行 ============

def run_command(cmd: List[str], cwd: str, capture_output: bool = False) -> subprocess.CompletedProcess:
    """执行命令"""
    print(f"执行: {' '.join(cmd)}")
    print(f"目录: {cwd}")

    return subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=capture_output,
        text=True
    )


def render_video(config: RenderConfig, remotion_dir: str) -> bool:
    """渲染单个视频"""
    print(f"\n{'='*60}")
    print(f"开始渲染: {config.composition}")
    print(f"输出: {config.output_path}")
    print(f"质量: {config.quality}")
    print(f"分辨率: {config.resolution}")
    print(f"帧率: {config.fps}")
    print(f"{'='*60}\n")

    # 确保输出目录存在
    os.makedirs(os.path.dirname(config.output_path), exist_ok=True)

    # 构建并执行命令
    cmd = build_render_command(config, remotion_dir)
    result = run_command(cmd, remotion_dir)

    if result.returncode == 0:
        print(f"\n渲染完成: {config.output_path}")
        return True
    else:
        print(f"\n渲染失败: {result.stderr}")
        return False


def render_batch(configs: List[RenderConfig], remotion_dir: str) -> Dict[str, bool]:
    """批量渲染视频"""
    results = {}
    total = len(configs)

    for i, config in enumerate(configs, 1):
        print(f"\n进度: {i}/{total}")
        success = render_video(config, remotion_dir)
        results[config.composition] = success

    return results


# ============ 音视频合并 ============

def merge_audio_video(
    video_path: str,
    audio_path: str,
    output_path: str,
    replace_audio: bool = True
) -> str:
    """合并音频和视频"""
    cmd = ["ffmpeg", "-y"]

    # 输入文件
    cmd.extend(["-i", video_path])
    cmd.extend(["-i", audio_path])

    # 映射流
    if replace_audio:
        cmd.extend(["-map", "0:v", "-map", "1:a"])
    else:
        cmd.extend(["-map", "0:v", "-map", "0:a", "-map", "1:a"])

    # 编码设置
    cmd.extend(["-c:v", "copy"])
    cmd.extend(["-c:a", "aac"])

    # 输出
    cmd.append(output_path)

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        print(f"音视频合并完成: {output_path}")
        return output_path
    else:
        print(f"合并失败: {result.stderr}")
        raise RuntimeError(f"音视频合并失败: {result.stderr}")


def add_subtitles(
    video_path: str,
    subtitle_path: str,
    output_path: str,
    font_name: str = "SimHei",
    font_size: int = 24
) -> str:
    """添加字幕到视频"""
    # 烧录字幕
    vf_filter = f"subtitles={subtitle_path.replace(':', '\\\\:').replace('\\', '/')}:force_style='FontName={font_name},FontSize={font_size}'"

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", vf_filter,
        "-c:a", "copy",
        output_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        print(f"字幕添加完成: {output_path}")
        return output_path
    else:
        print(f"字幕添加失败: {result.stderr}")
        raise RuntimeError(f"字幕添加失败: {result.stderr}")


def add_background_music(
    video_path: str,
    music_path: str,
    output_path: str,
    music_volume: float = 0.3,
    voice_volume: float = 1.0
) -> str:
    """添加背景音乐"""
    # 音频混合滤镜
    filter_complex = f"[0:a]volume={voice_volume}[voice];[1:a]volume={music_volume}[music];[voice][music]amix=inputs=2:duration=first[aout]"

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-i", music_path,
        "-filter_complex", filter_complex,
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        output_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        print(f"背景音乐添加完成: {output_path}")
        return output_path
    else:
        print(f"背景音乐添加失败: {result.stderr}")
        raise RuntimeError(f"背景音乐添加失败: {result.stderr}")


# ============ 视频信息 ============

def get_video_info(video_path: str) -> Dict:
    """获取视频信息"""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format", "-show_streams",
        video_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        return json.loads(result.stdout)
    else:
        raise RuntimeError(f"获取视频信息失败: {result.stderr}")


def get_video_duration(video_path: str) -> float:
    """获取视频时长"""
    info = get_video_info(video_path)
    return float(info['format']['duration'])


# ============ 项目管理 ============

def create_remotion_project(
    project_name: str,
    template: str = "blank",
    output_dir: str = "."
) -> str:
    """创建新的 Remotion 项目"""
    cmd = [
        "npm", "create", "video@latest",
        project_name,
        "--", "--template", template
    ]

    result = subprocess.run(cmd, cwd=output_dir)

    if result.returncode == 0:
        project_path = os.path.join(output_dir, project_name)
        print(f"项目创建成功: {project_path}")
        return project_path
    else:
        raise RuntimeError("项目创建失败")


def init_remotion_project(project_path: str):
    """初始化 Remotion 项目依赖"""
    cmd = ["npm", "install"]
    result = subprocess.run(cmd, cwd=project_path)

    if result.returncode == 0:
        print(f"依赖安装完成: {project_path}")
    else:
        raise RuntimeError("依赖安装失败")


# ============ 配置文件生成 ============

def generate_project_config(
    project_name: str,
    compositions: List[str],
    output_path: str
):
    """生成项目配置文件"""
    config = {
        "project": project_name,
        "created": datetime.now().isoformat(),
        "fps": DEFAULT_FPS,
        "resolution": DEFAULT_RESOLUTION,
        "compositions": [
            {
                "name": comp,
                "output": f"out/{comp}.mp4"
            }
            for comp in compositions
        ]
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

    print(f"配置文件已生成: {output_path}")


# ============ 主函数 ============

def main():
    parser = argparse.ArgumentParser(description='StarClaw 动态视频渲染工具')
    parser.add_argument('command', choices=['render', 'preview', 'batch', 'merge', 'info'],
                        help='执行命令')
    parser.add_argument('--composition', '-c', help='组合名称')
    parser.add_argument('--output', '-o', default='./out/video.mp4', help='输出文件')
    parser.add_argument('--audio', '-a', help='音频文件')
    parser.add_argument('--subtitles', '-s', help='字幕文件')
    parser.add_argument('--quality', '-q', default='high', help='渲染质量')
    parser.add_argument('--fps', type=int, default=DEFAULT_FPS, help='帧率')
    parser.add_argument('--resolution', '-r', default=DEFAULT_RESOLUTION, help='分辨率')
    parser.add_argument('--config', help='项目配置文件')
    parser.add_argument('--remotion-dir', default='.', help='Remotion 项目目录')

    args = parser.parse_args()

    if args.command == 'render':
        if not args.composition:
            print("错误: 需要指定组合名称")
            return

        config = RenderConfig(
            composition=args.composition,
            output_path=args.output,
            fps=args.fps,
            resolution=args.resolution,
            quality=args.quality
        )

        render_video(config, args.remotion_dir)

    elif args.command == 'preview':
        cmd = build_preview_command(args.composition or "", args.remotion_dir)
        run_command(cmd, args.remotion_dir)

    elif args.command == 'batch':
        if not args.config:
            print("错误: 需要指定配置文件")
            return

        with open(args.config, 'r', encoding='utf-8') as f:
            project_config = json.load(f)

        configs = [
            RenderConfig(
                composition=comp['name'],
                output_path=comp['output'],
                fps=project_config.get('fps', DEFAULT_FPS),
                resolution=project_config.get('resolution', DEFAULT_RESOLUTION),
                quality=args.quality
            )
            for comp in project_config.get('compositions', [])
        ]

        results = render_batch(configs, args.remotion_dir)

        print("\n渲染结果:")
        for comp, success in results.items():
            status = "成功" if success else "失败"
            print(f"  {comp}: {status}")

    elif args.command == 'merge':
        if not args.audio:
            print("错误: 需要指定音频文件")
            return

        merge_audio_video(args.output, args.audio, args.output.replace('.mp4', '_final.mp4'))

    elif args.command == 'info':
        info = get_video_info(args.output)
        print(json.dumps(info, indent=2))


if __name__ == '__main__':
    main()
