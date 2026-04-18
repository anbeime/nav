import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { fadeIn, scaleIn, pulse } from '../config/animations';
import { starclawColors, styleColors } from '../config/colors';

// ============ 类型定义 ============

export interface EndingSlideProps {
  /** 主标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 呼吁行动文案 */
  callToAction?: string;
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
  /** 品牌名称 */
  brandName?: string;
  /** 社交媒体链接 */
  socialLinks?: Array<{
    platform: string;
    handle: string;
  }>;
  /** 是否显示感谢语 */
  showThanks?: boolean;
  /** 动画类型 */
  animationType?: 'fade' | 'scale' | 'bounce';
}

// ============ 组件实现 ============

export const EndingSlide: React.FC<EndingSlideProps> = ({
  title = '感谢观看',
  subtitle,
  callToAction,
  visualStyle = 'vibrant',
  colors: customColors,
  logoUrl,
  brandName = 'StarClaw',
  socialLinks,
  showThanks = true,
  animationType = 'scale',
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

  // 主标题动画
  const titleDelay = 10;
  const titleFrame = Math.max(0, frame - titleDelay);
  const titleSpring = spring({
    frame: titleFrame,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.5 },
  });

  // 副标题动画
  const subtitleDelay = 25;
  const subtitleOpacity = fadeIn(frame, { duration: 20, delay: subtitleDelay });

  // Logo 动画
  const logoDelay = 15;
  const logoScale = spring({
    frame: Math.max(0, frame - logoDelay),
    fps,
    config: { damping: 200, stiffness: 100 },
  });

  // CTA 动画
  const ctaDelay = 40;
  const ctaOpacity = fadeIn(frame, { duration: 20, delay: ctaDelay });
  const ctaScale = spring({
    frame: Math.max(0, frame - ctaDelay),
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  // 社交链接动画
  const socialDelay = 50;
  const socialOpacity = fadeIn(frame, { duration: 20, delay: socialDelay });

  // 装饰动画
  const decorScale = spring({
    frame,
    fps,
    config: { damping: 100, stiffness: 50 },
  });

  // 脉冲效果
  const pulseScale = pulse(frame, { minScale: 0.98, maxScale: 1.02, speed: 60 });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.primary}22 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* 装饰圆环 */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          border: `2px solid ${colors.primary}22`,
          opacity: decorScale * 0.5,
          transform: `scale(${decorScale})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          border: `2px solid ${colors.primary}33`,
          opacity: decorScale * 0.7,
          transform: `scale(${decorScale})`,
        }}
      />

      {/* 主内容 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        {logoUrl && (
          <div
            style={{
              marginBottom: 30,
              transform: `scale(${logoScale})`,
              opacity: logoScale,
            }}
          >
            <img
              src={logoUrl}
              alt="Logo"
              style={{
                width: 100,
                height: 100,
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        {/* 主标题 */}
        <h1
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: colors.text,
            margin: 0,
            marginBottom: 20,
            transform: `scale(${titleSpring}) translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
            opacity: titleSpring,
            textShadow: visualStyle === 'vibrant' ? `0 4px 30px ${colors.primary}44` : 'none',
          }}
        >
          {title}
        </h1>

        {/* 副标题 */}
        {subtitle && (
          <h2
            style={{
              fontSize: 32,
              fontWeight: 400,
              color: colors.secondary,
              margin: 0,
              marginBottom: callToAction ? 40 : 30,
              opacity: subtitleOpacity,
            }}
          >
            {subtitle}
          </h2>
        )}

        {/* CTA 按钮 */}
        {callToAction && (
          <div
            style={{
              backgroundColor: colors.primary,
              color: '#FFFFFF',
              padding: '16px 40px',
              borderRadius: 50,
              fontSize: 24,
              fontWeight: 600,
              opacity: ctaOpacity,
              transform: `scale(${ctaScale})`,
              boxShadow: `0 10px 40px ${colors.primary}44`,
              cursor: 'pointer',
            }}
          >
            {callToAction}
          </div>
        )}

        {/* 社交媒体链接 */}
        {socialLinks && socialLinks.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 30,
              marginTop: 50,
              opacity: socialOpacity,
            }}
          >
            {socialLinks.map((link, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    color: colors.secondary,
                  }}
                >
                  {link.platform}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: colors.text,
                  }}
                >
                  {link.handle}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部品牌信息 */}
      <div
        style={{
          position: 'absolute',
          bottom: 50,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
          opacity: fadeIn(frame, { duration: 20, delay: 60 }),
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          S
        </div>
        <span
          style={{
            fontSize: 16,
            color: colors.secondary,
          }}
        >
          {brandName} | Virtual Entertainment
        </span>
      </div>

      {/* 粒子效果 (可选) */}
      {visualStyle === 'vibrant' && (
        <>
          {[...Array(20)].map((_, i) => {
            const angle = (i / 20) * Math.PI * 2;
            const distance = 300 + Math.sin(frame * 0.02 + i) * 50;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const size = 4 + Math.sin(frame * 0.05 + i) * 2;

            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  backgroundColor: colors.primary,
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  opacity: 0.3 + Math.sin(frame * 0.03 + i) * 0.2,
                }}
              />
            );
          })}
        </>
      )}
    </AbsoluteFill>
  );
};

export default EndingSlide;
