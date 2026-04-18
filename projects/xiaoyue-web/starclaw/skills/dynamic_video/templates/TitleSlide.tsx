import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { fadeIn, scaleIn, slideInFromTop, bounceSlideIn } from '../config/animations';
import { starclawColors, styleColors } from '../config/colors';

// ============ 类型定义 ============

export interface TitleSlideProps {
  /** 主标题 */
  title: string;
  /** 副标题 */
  subtitle?: string;
  /** 章节标识 */
  chapter?: string;
  /** 动画风格 */
  animationStyle?: 'fade' | 'slide' | 'bounce' | 'scale';
  /** 视觉风格 */
  visualStyle?: 'minimal' | 'vibrant' | 'tech' | 'warm' | 'guofeng';
  /** 自定义配色 */
  colors?: {
    background?: string;
    primary?: string;
    secondary?: string;
    text?: string;
  };
  /** Logo URL */
  logoUrl?: string;
  /** 背景图片 URL */
  backgroundImage?: string;
}

// ============ 组件实现 ============

export const TitleSlide: React.FC<TitleSlideProps> = ({
  title,
  subtitle,
  chapter,
  animationStyle = 'fade',
  visualStyle = 'vibrant',
  colors: customColors,
  logoUrl,
  backgroundImage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 获取配色方案
  const styleColorSet = styleColors[visualStyle];
  const colors = {
    background: customColors?.background ?? styleColorSet.background,
    primary: customColors?.primary ?? styleColorSet.primary,
    secondary: customColors?.secondary ?? styleColorSet.secondary,
    text: customColors?.text ?? styleColorSet.text,
  };

  // 动画计算
  const getAnimationValues = () => {
    switch (animationStyle) {
      case 'bounce':
        return bounceSlideIn(frame, fps, 'bottom', {
          damping: 15,
          stiffness: 100,
          mass: 0.5,
        });
      case 'slide':
        return slideInFromTop(frame, { duration: 30, distance: 50 });
      case 'scale':
        return scaleIn(frame, { duration: 30, fromScale: 0.8 });
      case 'fade':
      default:
        return { opacity: fadeIn(frame, { duration: 30 }) };
    }
  };

  const animationValues = getAnimationValues();

  // 标题动画
  const titleOpacity = fadeIn(frame, { duration: 30, delay: 10 });
  const titleY = interpolate(
    frame,
    [0, 30],
    [30, 0],
    { extrapolateRight: 'clamp' }
  );

  // 副标题动画（延迟入场）
  const subtitleOpacity = fadeIn(frame, { duration: 30 });
  const subtitleFrame = Math.max(0, frame - 20);

  // 章节标识动画
  const chapterOpacity = fadeIn(frame, { duration: 20 });
  const chapterFrame = Math.max(0, frame - 10);

  // Logo动画
  const logoScale = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 200, stiffness: 100 },
  });

  // 背景渐变动画
  const gradientAngle = interpolate(frame, [0, 150], [135, 225]);

  // 背景样式
  const backgroundStyle: React.CSSProperties = backgroundImage
    ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: `linear-gradient(${gradientAngle}deg, ${colors.background} 0%, ${colors.primary}22 100%)`,
      };

  return (
    <AbsoluteFill
      style={{
        ...backgroundStyle,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 背景装饰 */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: 0.1,
          background: `radial-gradient(circle at 30% 50%, ${colors.primary} 0%, transparent 50%)`,
        }}
      />

      {/* Logo */}
      {logoUrl && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 60,
            transform: `scale(${logoScale})`,
            opacity: logoScale,
          }}
        >
          <img
            src={logoUrl}
            alt="Logo"
            style={{
              width: 80,
              height: 80,
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      {/* 章节标识 */}
      {chapter && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 60,
            backgroundColor: colors.primary,
            color: '#FFFFFF',
            padding: '8px 20px',
            borderRadius: 20,
            fontSize: 16,
            fontWeight: 500,
            opacity: chapterOpacity,
            transform: `translateX(${interpolate(chapterFrame, [0, 20], [50, 0])}px)`,
          }}
        >
          {chapter}
        </div>
      )}

      {/* 主标题容器 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `translateY(${animationValues?.y ?? titleY}px) translateX(${animationValues?.x ?? 0}px)`,
          opacity: animationValues?.opacity ?? titleOpacity,
        }}
      >
        {/* 主标题 */}
        <h1
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: colors.text,
            margin: 0,
            textAlign: 'center',
            letterSpacing: '-2px',
            textShadow: visualStyle === 'vibrant' ? `0 4px 20px ${colors.primary}44` : 'none',
            transform: `scale(${animationValues?.scale ?? 1})`,
          }}
        >
          {title}
        </h1>

        {/* 分隔线 */}
        <div
          style={{
            width: interpolate(frame, [20, 50], [0, 200]),
            height: 4,
            backgroundColor: colors.primary,
            marginTop: 30,
            marginBottom: subtitle ? 20 : 0,
            borderRadius: 2,
          }}
        />

        {/* 副标题 */}
        {subtitle && (
          <h2
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: colors.secondary,
              margin: 0,
              opacity: subtitleOpacity,
              transform: `translateY(${interpolate(subtitleFrame, [0, 20], [20, 0])}px)`,
            }}
          >
            {subtitle}
          </h2>
        )}
      </div>

      {/* 装饰元素 */}
      {visualStyle === 'tech' && (
        <>
          <div
            style={{
              position: 'absolute',
              bottom: 50,
              left: 50,
              width: 100,
              height: 2,
              backgroundColor: colors.primary,
              opacity: interpolate(frame, [30, 60], [0, 0.5]),
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 50,
              left: 50,
              width: 2,
              height: 50,
              backgroundColor: colors.primary,
              opacity: interpolate(frame, [30, 60], [0, 0.5]),
            }}
          />
        </>
      )}

      {/* 底部信息栏 */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: fadeIn(frame, { duration: 30 }),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: colors.secondary,
            fontSize: 14,
          }}
        >
          <span>StarClaw</span>
          <span>|</span>
          <span>Virtual Entertainment</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default TitleSlide;
