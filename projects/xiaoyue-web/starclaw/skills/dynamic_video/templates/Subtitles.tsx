import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { fadeIn, fadeOut } from '../config/animations';

// ============ 类型定义 ============

export interface SubtitleLine {
  /** 开始时间(秒) */
  startTime: number;
  /** 结束时间(秒) */
  endTime: number;
  /** 字幕文本 */
  text: string;
}

export interface SubtitlesProps {
  /** 字幕数据 */
  subtitles: SubtitleLine[];
  /** 字幕位置 */
  position?: 'bottom' | 'top';
  /** 距离边缘的距离 */
  offset?: number;
  /** 字体大小 */
  fontSize?: number;
  /** 背景样式 */
  backgroundStyle?: 'solid' | 'gradient' | 'blur' | 'none';
  /** 背景颜色 */
  backgroundColor?: string;
  /** 文字颜色 */
  textColor?: string;
  /** 是否显示边框 */
  showBorder?: boolean;
  /** 最大宽度百分比 */
  maxWidth?: number;
  /** 是否居中 */
  centered?: boolean;
  /** 字体 */
  fontFamily?: string;
}

// ============ 组件实现 ============

export const Subtitles: React.FC<SubtitlesProps> = ({
  subtitles,
  position = 'bottom',
  offset = 100,
  fontSize = 32,
  backgroundStyle = 'gradient',
  backgroundColor = 'rgba(0, 0, 0, 0.7)',
  textColor = '#FFFFFF',
  showBorder = false,
  maxWidth = 80,
  centered = true,
  fontFamily = 'system-ui, -apple-system, sans-serif',
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // 当前时间(秒)
  const currentTime = frame / fps;

  // 查找当前应该显示的字幕
  const currentSubtitle = subtitles.find(
    (sub) => currentTime >= sub.startTime && currentTime <= sub.endTime
  );

  if (!currentSubtitle) {
    return null;
  }

  // 字幕进度
  const subtitleProgress = interpolate(
    currentTime,
    [currentSubtitle.startTime, currentSubtitle.endTime],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // 淡入淡出效果
  const fadeDuration = 0.3; // 秒
  const fadeInProgress = interpolate(
    currentTime,
    [currentSubtitle.startTime, currentSubtitle.startTime + fadeDuration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const fadeOutProgress = interpolate(
    currentTime,
    [currentSubtitle.endTime - fadeDuration, currentSubtitle.endTime],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const opacity = Math.min(fadeInProgress, fadeOutProgress);

  // 背景样式
  const getBackgroundStyle = (): React.CSSProperties => {
    switch (backgroundStyle) {
      case 'solid':
        return { backgroundColor };
      case 'gradient':
        return {
          background: `linear-gradient(180deg, transparent 0%, ${backgroundColor} 30%, ${backgroundColor} 70%, transparent 100%)`,
        };
      case 'blur':
        return {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
        };
      case 'none':
      default:
        return {};
    }
  };

  // 位置样式
  const positionStyle: React.CSSProperties = position === 'bottom'
    ? { bottom: offset }
    : { top: offset };

  return (
    <AbsoluteFill
      style={{
        justifyContent: centered ? 'center' : 'flex-start',
        alignItems: position === 'bottom' ? 'flex-end' : 'flex-start',
        padding: centered ? `0 ${(100 - maxWidth) / 2}%` : '0 60px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: centered ? '50%' : 60,
          transform: centered ? 'translateX(-50%)' : 'none',
          ...positionStyle,
          opacity,
          maxWidth: centered ? `${maxWidth}%` : `${width - 120}px`,
          padding: '15px 30px',
          borderRadius: 12,
          ...getBackgroundStyle(),
          border: showBorder ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
        }}
      >
        <p
          style={{
            fontSize,
            fontWeight: 500,
            color: textColor,
            fontFamily,
            margin: 0,
            textAlign: centered ? 'center' : 'left',
            lineHeight: 1.5,
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {currentSubtitle.text}
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ============ SRT 解析器 ============

/**
 * 解析 SRT 格式字幕
 * @param srtContent SRT 文件内容
 * @returns 字幕行数组
 */
export const parseSRT = (srtContent: string): SubtitleLine[] => {
  const lines = srtContent.trim().split('\n');
  const subtitles: SubtitleLine[] = [];

  let i = 0;
  while (i < lines.length) {
    // 跳过序号
    if (/^\d+$/.test(lines[i].trim())) {
      i++;
    }

    // 解析时间轴
    if (i < lines.length && lines[i].includes(' --> ')) {
      const [startStr, endStr] = lines[i].split(' --> ');
      const startTime = parseTime(startStr.trim());
      const endTime = parseTime(endStr.trim());
      i++;

      // 收集字幕文本
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim());
        i++;
      }

      subtitles.push({
        startTime,
        endTime,
        text: textLines.join('\n'),
      });
    }

    i++;
  }

  return subtitles;
};

/**
 * 解析时间字符串 (格式: 00:00:00,000)
 */
const parseTime = (timeStr: string): number => {
  const [time, ms] = timeStr.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(ms) / 1000;
};

// ============ VTT 解析器 ============

/**
 * 解析 VTT 格式字幕
 * @param vttContent VTT 文件内容
 * @returns 字幕行数组
 */
export const parseVTT = (vttContent: string): SubtitleLine[] => {
  const lines = vttContent.trim().split('\n');
  const subtitles: SubtitleLine[] = [];

  // 跳过 WEBVTT 头部
  let i = 0;
  while (i < lines.length && !lines[i].includes('-->')) {
    i++;
  }

  while (i < lines.length) {
    // 解析时间轴
    if (lines[i].includes(' --> ')) {
      const [startStr, endStr] = lines[i].split(' --> ');
      const startTime = parseVTTTime(startStr.trim());
      const endTime = parseVTTTime(endStr.trim());
      i++;

      // 收集字幕文本
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        // 跳过 NOTE 和其他元数据
        if (!lines[i].startsWith('NOTE') && !lines[i].startsWith('REGION')) {
          textLines.push(lines[i].trim());
        }
        i++;
      }

      if (textLines.length > 0) {
        subtitles.push({
          startTime,
          endTime,
          text: textLines.join('\n'),
        });
      }
    }

    i++;
  }

  return subtitles;
};

/**
 * 解析 VTT 时间字符串 (格式: 00:00:00.000 或 00:00.000)
 */
const parseVTTTime = (timeStr: string): number => {
  const parts = timeStr.split(':');
  let hours = 0, minutes = 0, seconds = 0;

  if (parts.length === 3) {
    [hours, minutes] = parts.slice(0, 2).map(Number);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    [minutes, seconds] = parts.map(Number);
  }

  return hours * 3600 + minutes * 60 + seconds;
};

// ============ 辅助函数 ============

/**
 * 生成 SRT 格式字幕
 */
export const generateSRT = (subtitles: SubtitleLine[]): string => {
  return subtitles
    .map((sub, index) => {
      const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.round((seconds % 1) * 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
      };

      return `${index + 1}
${formatTime(sub.startTime)} --> ${formatTime(sub.endTime)}
${sub.text}`;
    })
    .join('\n\n');
};

/**
 * 生成 VTT 格式字幕
 */
export const generateVTT = (subtitles: SubtitleLine[]): string => {
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const header = 'WEBVTT\n\n';
  const body = subtitles
    .map((sub) => {
      return `${formatTime(sub.startTime)} --> ${formatTime(sub.endTime)}
${sub.text}`;
    })
    .join('\n\n');

  return header + body;
};

export default Subtitles;
