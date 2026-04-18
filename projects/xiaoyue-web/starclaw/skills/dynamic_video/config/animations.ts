/**
 * StarClaw 动态视频动画配置
 * 涵盖入场、出场、转场、特效等动画预设
 */

import { spring, interpolate, Easing } from 'remotion';

// ============ 动画配置类型 ============

export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

export interface SpringConfig {
  damping: number;
  stiffness: number;
  mass: number;
}

// ============ Spring 预设 ============

/** 常用 Spring 配置 */
export const springConfigs: Record<string, SpringConfig> = {
  // 弹性效果
  bouncy: {
    damping: 10,
    stiffness: 100,
    mass: 0.5,
  },
  // 平滑效果
  smooth: {
    damping: 200,
    stiffness: 100,
    mass: 1,
  },
  // 快速响应
  snappy: {
    damping: 100,
    stiffness: 200,
    mass: 0.5,
  },
  // 缓慢优雅
  gentle: {
    damping: 300,
    stiffness: 50,
    mass: 1,
  },
  // 弹跳效果
  elastic: {
    damping: 5,
    stiffness: 150,
    mass: 0.3,
  },
  // 无弹性
  stiff: {
    damping: 1000,
    stiffness: 1000,
    mass: 0.1,
  },
};

// ============ 缓动函数 ============

/** 缓动函数预设 */
export const easingFunctions = {
  linear: Easing.linear,
  easeInQuad: Easing.in(Easing.quad),
  easeOutQuad: Easing.out(Easing.quad),
  easeInOutQuad: Easing.inOut(Easing.quad),
  easeInCubic: Easing.in(Easing.cubic),
  easeOutCubic: Easing.out(Easing.cubic),
  easeInOutCubic: Easing.inOut(Easing.cubic),
  easeInQuart: Easing.in(Easing.quart),
  easeOutQuart: Easing.out(Easing.quart),
  easeInOutQuart: Easing.inOut(Easing.quart),
  easeInExpo: Easing.in(Easing.exp),
  easeOutExpo: Easing.out(Easing.exp),
  easeInOutExpo: Easing.inOut(Easing.exp),
  easeInBack: Easing.in(Easing.back),
  easeOutBack: Easing.out(Easing.back),
  easeInOutBack: Easing.inOut(Easing.back),
};

// ============ 入场动画 ============

/** 淡入动画 */
export const fadeIn = (
  frame: number,
  config: AnimationConfig = { duration: 30, easing: 'easeOutQuad' }
): number => {
  return interpolate(
    frame,
    [0, config.duration],
    [0, 1],
    {
      easing: easingFunctions[config.easing as keyof typeof easingFunctions],
      extrapolateRight: 'clamp',
    }
  );
};

/** 淡出动画 */
export const fadeOut = (
  frame: number,
  durationInFrames: number,
  config: AnimationConfig = { duration: 30, easing: 'easeInQuad' }
): number => {
  return interpolate(
    frame,
    [durationInFrames - config.duration, durationInFrames],
    [1, 0],
    {
      easing: easingFunctions[config.easing as keyof typeof easingFunctions],
      extrapolateLeft: 'clamp',
    }
  );
};

/** 从上滑入 */
export const slideInFromTop = (
  frame: number,
  config: AnimationConfig & { distance?: number } = { duration: 30, easing: 'easeOutQuad', distance: 100 }
): { y: number; opacity: number } => {
  return {
    y: interpolate(
      frame,
      [0, config.duration],
      [-config.distance!, 0],
      { extrapolateRight: 'clamp' }
    ),
    opacity: fadeIn(frame, config),
  };
};

/** 从下滑入 */
export const slideInFromBottom = (
  frame: number,
  config: AnimationConfig & { distance?: number } = { duration: 30, easing: 'easeOutQuad', distance: 100 }
): { y: number; opacity: number } => {
  return {
    y: interpolate(
      frame,
      [0, config.duration],
      [config.distance!, 0],
      { extrapolateRight: 'clamp' }
    ),
    opacity: fadeIn(frame, config),
  };
};

/** 从左滑入 */
export const slideInFromLeft = (
  frame: number,
  config: AnimationConfig & { distance?: number } = { duration: 30, easing: 'easeOutQuad', distance: 200 }
): { x: number; opacity: number } => {
  return {
    x: interpolate(
      frame,
      [0, config.duration],
      [-config.distance!, 0],
      { extrapolateRight: 'clamp' }
    ),
    opacity: fadeIn(frame, config),
  };
};

/** 从右滑入 */
export const slideInFromRight = (
  frame: number,
  config: AnimationConfig & { distance?: number } = { duration: 30, easing: 'easeOutQuad', distance: 200 }
): { x: number; opacity: number } => {
  return {
    x: interpolate(
      frame,
      [0, config.duration],
      [config.distance!, 0],
      { extrapolateRight: 'clamp' }
    ),
    opacity: fadeIn(frame, config),
  };
};

/** 缩放进入 */
export const scaleIn = (
  frame: number,
  config: AnimationConfig & { fromScale?: number } = { duration: 30, easing: 'easeOutBack', fromScale: 0 }
): { scale: number; opacity: number } => {
  return {
    scale: interpolate(
      frame,
      [0, config.duration],
      [config.fromScale!, 1],
      { extrapolateRight: 'clamp' }
    ),
    opacity: fadeIn(frame, config),
  };
};

/** 旋转进入 */
export const rotateIn = (
  frame: number,
  config: AnimationConfig & { fromRotation?: number } = { duration: 30, easing: 'easeOutQuad', fromRotation: -180 }
): { rotation: number; opacity: number } => {
  return {
    rotation: interpolate(
      frame,
      [0, config.duration],
      [config.fromRotation!, 0],
      { extrapolateRight: 'clamp' }
    ),
    opacity: fadeIn(frame, config),
  };
};

// ============ 组合入场动画 ============

/** 弹跳入场 */
export const bounceIn = (
  frame: number,
  fps: number,
  config: SpringConfig = springConfigs.bouncy
): { scale: number; opacity: number } => {
  const progress = spring({
    frame,
    fps,
    config,
  });

  return {
    scale: progress,
    opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }),
  };
};

/** 弹跳滑入 */
export const bounceSlideIn = (
  frame: number,
  fps: number,
  direction: 'top' | 'bottom' | 'left' | 'right' = 'bottom',
  config: SpringConfig = springConfigs.bouncy
): { x: number; y: number; scale: number } => {
  const progress = spring({
    frame,
    fps,
    config,
  });

  const distance = 100;
  let x = 0, y = 0;

  switch (direction) {
    case 'top':
      y = interpolate(progress, [0, 1], [-distance, 0]);
      break;
    case 'bottom':
      y = interpolate(progress, [0, 1], [distance, 0]);
      break;
    case 'left':
      x = interpolate(progress, [0, 1], [-distance, 0]);
      break;
    case 'right':
      x = interpolate(progress, [0, 1], [distance, 0]);
      break;
  }

  return { x, y, scale: progress };
};

// ============ 文字动画 ============

/** 打字机效果 */
export const typewriter = (
  frame: number,
  text: string,
  config: { charDuration?: number; startFrame?: number } = {}
): { visibleText: string; cursorVisible: boolean } => {
  const charDuration = config.charDuration ?? 3;
  const startFrame = config.startFrame ?? 0;

  const charsToShow = Math.floor((frame - startFrame) / charDuration);
  const visibleText = text.slice(0, Math.max(0, Math.min(charsToShow, text.length)));
  const cursorVisible = (frame % 20) < 10 && charsToShow < text.length;

  return { visibleText, cursorVisible };
};

/** 文字逐词显示 */
export const wordReveal = (
  frame: number,
  words: string[],
  config: { wordDuration?: number; startFrame?: number } = {}
): number => {
  const wordDuration = config.wordDuration ?? 10;
  const startFrame = config.startFrame ?? 0;

  return Math.floor((frame - startFrame) / wordDuration);
};

/** 数字滚动效果 */
export const numberCounter = (
  frame: number,
  from: number,
  to: number,
  config: AnimationConfig = { duration: 60, easing: 'easeOutExpo' }
): number => {
  return interpolate(
    frame,
    [0, config.duration],
    [from, to],
    {
      easing: easingFunctions[config.easing as keyof typeof easingFunctions],
      extrapolateRight: 'clamp',
    }
  );
};

// ============ 转场动画 ============

/** 淡入淡出转场 */
export const crossFade = (
  frame: number,
  transitionDuration: number
): { currentOpacity: number; nextOpacity: number } => {
  return {
    currentOpacity: interpolate(frame, [0, transitionDuration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    nextOpacity: interpolate(frame, [0, transitionDuration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  };
};

/** 滑动转场 */
export const slideTransition = (
  frame: number,
  transitionDuration: number,
  direction: 'left' | 'right' | 'up' | 'down' = 'left'
): { currentOffset: number; nextOffset: number } => {
  const offset = 1920; // 默认全屏宽度

  const getOffset = (progress: number, isCurrent: boolean) => {
    const multiplier = isCurrent ? -1 : 1;
    switch (direction) {
      case 'left':
        return { x: interpolate(progress, [0, 1], [0, multiplier * offset]), y: 0 };
      case 'right':
        return { x: interpolate(progress, [0, 1], [0, -multiplier * offset]), y: 0 };
      case 'up':
        return { x: 0, y: interpolate(progress, [0, 1], [0, multiplier * offset]) };
      case 'down':
        return { x: 0, y: interpolate(progress, [0, 1], [0, -multiplier * offset]) };
    }
  };

  const progress = interpolate(frame, [0, transitionDuration], [0, 1], { extrapolateRight: 'clamp' });

  return {
    currentOffset: getOffset(progress, true).x || getOffset(progress, true).y,
    nextOffset: getOffset(progress, false).x || getOffset(progress, false).y,
  };
};

/** 缩放转场 */
export const scaleTransition = (
  frame: number,
  transitionDuration: number
): { currentScale: number; nextScale: number } => {
  const progress = interpolate(frame, [0, transitionDuration], [0, 1], { extrapolateRight: 'clamp' });

  return {
    currentScale: interpolate(progress, [0, 1], [1, 0.5]),
    nextScale: interpolate(progress, [0, 1], [1.5, 1]),
  };
};

// ============ 特效动画 ============

/** 脉冲效果 */
export const pulse = (
  frame: number,
  config: { minScale?: number; maxScale?: number; speed?: number } = {}
): number => {
  const minScale = config.minScale ?? 0.95;
  const maxScale = config.maxScale ?? 1.05;
  const speed = config.speed ?? 30;

  return interpolate(
    Math.sin(frame * (Math.PI * 2) / speed),
    [-1, 1],
    [minScale, maxScale]
  );
};

/** 摇晃效果 */
export const shake = (
  frame: number,
  config: { intensity?: number; speed?: number } = {}
): number => {
  const intensity = config.intensity ?? 5;
  const speed = config.speed ?? 20;

  return Math.sin(frame * speed / 10) * intensity;
};

/** 浮动效果 */
export const float = (
  frame: number,
  config: { amplitude?: number; speed?: number } = {}
): number => {
  const amplitude = config.amplitude ?? 10;
  const speed = config.speed ?? 60;

  return Math.sin(frame * (Math.PI * 2) / speed) * amplitude;
};

/** 闪烁效果 */
export const blink = (
  frame: number,
  config: { speed?: number } = {}
): number => {
  const speed = config.speed ?? 10;
  return (frame % speed) < speed / 2 ? 1 : 0;
};

/** 渐变移动 */
export const gradientMove = (
  frame: number,
  config: { duration?: number } = {}
): number => {
  const duration = config.duration ?? 100;
  return (frame % duration) / duration * 100;
};

// ============ 粒子效果 ============

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

/** 生成粒子 */
export const generateParticles = (
  count: number,
  config: { seed?: number } = {}
): Particle[] => {
  const seed = config.seed ?? 12345;
  const random = (i: number) => {
    const x = Math.sin(seed + i) * 10000;
    return x - Math.floor(x);
  };

  return Array.from({ length: count }, (_, i) => ({
    x: random(i) * 100,
    y: random(i + 1000) * 100,
    size: random(i + 2000) * 10 + 2,
    opacity: random(i + 3000) * 0.5 + 0.3,
    speed: random(i + 4000) * 0.5 + 0.5,
  }));
};

/** 粒子动画 */
export const animateParticles = (
  frame: number,
  particles: Particle[],
  config: { rise?: boolean } = {}
): Particle[] => {
  const rise = config.rise ?? true;

  return particles.map(p => ({
    ...p,
    y: rise
      ? (p.y - frame * p.speed) % 100
      : (p.y + frame * p.speed) % 100,
    opacity: p.opacity * (1 - Math.abs(50 - p.y) / 100),
  }));
};

// ============ 辅助函数 ============

/** 组合多个动画 */
export const combineAnimations = <T extends Record<string, any>>(
  ...animations: T[]
): T => {
  return animations.reduce((acc, anim) => ({
    ...acc,
    ...anim,
  }), {} as T);
};

/** 创建动画序列 */
export const createSequence = (
  animations: Array<{
    startFrame: number;
    duration: number;
    animation: (frame: number) => any;
  }>
): ((frame: number) => any) => {
  return (frame: number) => {
    for (const { startFrame, duration, animation } of animations) {
      if (frame >= startFrame && frame < startFrame + duration) {
        return animation(frame - startFrame);
      }
    }
    return null;
  };
};

export default {
  springConfigs,
  easingFunctions,
  fadeIn,
  fadeOut,
  slideInFromTop,
  slideInFromBottom,
  slideInFromLeft,
  slideInFromRight,
  scaleIn,
  rotateIn,
  bounceIn,
  bounceSlideIn,
  typewriter,
  wordReveal,
  numberCounter,
  crossFade,
  slideTransition,
  scaleTransition,
  pulse,
  shake,
  float,
  blink,
  gradientMove,
  generateParticles,
  animateParticles,
  combineAnimations,
  createSequence,
};
