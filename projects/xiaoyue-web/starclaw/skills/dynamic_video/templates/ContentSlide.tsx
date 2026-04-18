import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { fadeIn, slideInFromLeft, slideInFromRight, typewriter } from '../config/animations';
import { styleColors } from '../config/colors';

// ============ 类型定义 ============

export interface ContentItem {
  /** 文本内容 */
  text: string;
  /** 是否高亮 */
  highlight?: boolean;
  /** 图标/符号 */
  icon?: string;
}

export interface ContentSlideProps {
  /** 标题 */
  title: string;
  /** 内容列表 */
  content: ContentItem[];
  /** 布局方式 */
  layout?: 'list' | 'grid' | 'single';
  /** 视觉风格 */
  visualStyle?: 'minimal' | 'vibrant' | 'tech' | 'warm' | 'guofeng';
  /** 自定义配色 */
  colors?: {
    background?: string;
    primary?: string;
    secondary?: string;
    text?: string;
  };
  /** 是否显示编号 */
  showNumbers?: boolean;
  /** 图片URL */
  imageUrl?: string;
  /** 图片位置 */
  imagePosition?: 'left' | 'right' | 'background';
  /** 背景图片 URL */
  backgroundImage?: string;
}

// ============ 组件实现 ============

export const ContentSlide: React.FC<ContentSlideProps> = ({
  title,
  content,
  layout = 'list',
  visualStyle = 'vibrant',
  colors: customColors,
  showNumbers = false,
  imageUrl,
  imagePosition = 'right',
  backgroundImage,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 获取配色方案
  const styleColorSet = styleColors[visualStyle];
  const colors = {
    background: customColors?.background ?? styleColorSet.background,
    primary: customColors?.primary ?? styleColorSet.primary,
    secondary: customColors?.secondary ?? styleColorSet.secondary,
    text: customColors?.text ?? styleColorSet.text,
  };

  // 标题动画
  const titleOpacity = fadeIn(frame, { duration: 20 });
  const titleX = interpolate(frame, [0, 20], [-30, 0], { extrapolateRight: 'clamp' });

  // 内容项动画
  const getListItemAnimation = (index: number) => {
    const delay = 20 + index * 10;
    const itemFrame = Math.max(0, frame - delay);
    return {
      opacity: fadeIn(itemFrame, { duration: 15 }),
      x: interpolate(itemFrame, [0, 15], [30, 0], { extrapolateRight: 'clamp' }),
    };
  };

  // 装饰线动画
  const lineWidth = interpolate(frame, [10, 40], [0, 80], { extrapolateRight: 'clamp' });

  // 内容项渲染
  const renderContentItem = (item: ContentItem, index: number) => {
    const animation = getListItemAnimation(index);

    return (
      <div
        key={index}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 15,
          opacity: animation.opacity,
          transform: `translateX(${animation.x}px)`,
        }}
      >
        {/* 编号或图标 */}
        {showNumbers && (
          <div
            style={{
              minWidth: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: item.highlight ? colors.primary : colors.primary + '22',
              color: item.highlight ? '#FFFFFF' : colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {item.icon ?? index + 1}
          </div>
        )}

        {/* 文本内容 */}
        <div
          style={{
            flex: 1,
            paddingTop: showNumbers ? 6 : 0,
          }}
        >
          <p
            style={{
              fontSize: 28,
              fontWeight: item.highlight ? 600 : 400,
              color: item.highlight ? colors.primary : colors.text,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {item.text}
          </p>
        </div>
      </div>
    );
  };

  // 网格布局
  const renderGridLayout = () => {
    const columns = 2;
    const rows = Math.ceil(content.length / columns);

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 30,
        }}
      >
        {content.map((item, index) => {
          const animation = getListItemAnimation(index);
          return (
            <div
              key={index}
              style={{
                backgroundColor: colors.primary + '11',
                borderRadius: 16,
                padding: 25,
                opacity: animation.opacity,
                transform: `translateY(${animation.x}px)`,
              }}
            >
              {item.icon && (
                <div
                  style={{
                    fontSize: 40,
                    marginBottom: 10,
                  }}
                >
                  {item.icon}
                </div>
              )}
              <p
                style={{
                  fontSize: 24,
                  fontWeight: item.highlight ? 600 : 400,
                  color: colors.text,
                  margin: 0,
                }}
              >
                {item.text}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  // 主要内容区域
  const contentWidth = imageUrl ? '55%' : '100%';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: 80,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 标题区域 */}
      <div
        style={{
          marginBottom: 50,
        }}
      >
        {/* 装饰线 */}
        <div
          style={{
            width: lineWidth,
            height: 4,
            backgroundColor: colors.primary,
            borderRadius: 2,
            marginBottom: 20,
          }}
        />

        {/* 标题 */}
        <h2
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: colors.text,
            margin: 0,
            opacity: titleOpacity,
            transform: `translateX(${titleX}px)`,
          }}
        >
          {title}
        </h2>
      </div>

      {/* 主内容区域 */}
      <div
        style={{
          display: 'flex',
          gap: 60,
          flex: 1,
        }}
      >
        {/* 内容列表 */}
        <div
          style={{
            width: imagePosition === 'left' ? contentWidth : (imageUrl ? contentWidth : '100%'),
            display: 'flex',
            flexDirection: 'column',
            gap: 25,
          }}
        >
          {layout === 'grid' ? renderGridLayout() : content.map(renderContentItem)}
        </div>

        {/* 图片区域 */}
        {imageUrl && (
          <div
            style={{
              width: '40%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              order: imagePosition === 'left' ? -1 : 1,
            }}
          >
            <div
              style={{
                width: '100%',
                height: 400,
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: `0 20px 60px ${colors.primary}22`,
                opacity: fadeIn(frame, { duration: 30 }),
                transform: `scale(${spring({
                  frame: Math.max(0, frame - 30),
                  fps,
                  config: { damping: 200, stiffness: 100 },
                })})`,
              }}
            >
              <img
                src={imageUrl}
                alt="Content"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 页码指示器 */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          opacity: fadeIn(frame, { duration: 20 }),
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            backgroundColor: colors.primary,
            borderRadius: 2,
          }}
        />
        <span
          style={{
            fontSize: 14,
            color: colors.secondary,
          }}
        >
          StarClaw
        </span>
      </div>
    </AbsoluteFill>
  );
};

export default ContentSlide;
