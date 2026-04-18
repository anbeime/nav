/**
 * StarClaw 动态视频配色方案
 * 涵盖品牌色、社交媒体色、教育主题色等
 */

// ============ 品牌色系 ============

/** StarClaw 主品牌色 */
export const starclawColors = {
  primary: '#FF6B6B',      // 活力红
  secondary: '#4ECDC4',    // 清新青
  accent: '#FFE66D',       // 暖阳黄
  dark: '#2C3E50',         // 深邃蓝
  light: '#FFFFFF',        // 纯净白
  gradient: {
    primary: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)',
    warm: 'linear-gradient(135deg, #FFE66D 0%, #FF6B6B 100%)',
    cool: 'linear-gradient(135deg, #4ECDC4 0%, #2C3E50 100%)',
  },
};

/** 通用品牌配色 */
export const brandColors = {
  professional: {
    primary: '#2563EB',
    secondary: '#1E40AF',
    accent: '#3B82F6',
    background: '#F8FAFC',
    text: '#1E293B',
  },
  creative: {
    primary: '#8B5CF6',
    secondary: '#7C3AED',
    accent: '#A78BFA',
    background: '#FAFAFA',
    text: '#1F2937',
  },
  tech: {
    primary: '#06B6D4',
    secondary: '#0891B2',
    accent: '#22D3EE',
    background: '#0F172A',
    text: '#E2E8F0',
  },
};

// ============ 社交媒体色系 ============

/** 社交平台品牌色 */
export const socialColors = {
  douyin: {
    primary: '#000000',
    accent: '#FE2C55',
    secondary: '#25F4EE',
  },
  xiaohongshu: {
    primary: '#FF2442',
    secondary: '#FE2C55',
    accent: '#FFD700',
  },
  bilibili: {
    primary: '#00A1D6',
    secondary: '#FB7299',
    accent: '#444444',
  },
  weibo: {
    primary: '#E6162D',
    secondary: '#FF8200',
    accent: '#FFD700',
  },
  wechat: {
    primary: '#07C160',
    secondary: '#1AAD19',
    accent: '#07C160',
  },
  kuaishou: {
    primary: '#FF4906',
    secondary: '#FF6600',
    accent: '#FFCC00',
  },
};

// ============ 教育主题色系 ============

/** 学科配色 */
export const educationColors = {
  math: {
    primary: '#3498DB',
    secondary: '#2980B9',
    accent: '#5DADE2',
    background: '#EBF5FB',
  },
  physics: {
    primary: '#E74C3C',
    secondary: '#C0392B',
    accent: '#EC7063',
    background: '#FDEDEC',
  },
  chemistry: {
    primary: '#9B59B6',
    secondary: '#8E44AD',
    accent: '#AF7AC5',
    background: '#F5EEF8',
  },
  biology: {
    primary: '#27AE60',
    secondary: '#1E8449',
    accent: '#58D68D',
    background: '#E9F7EF',
  },
  history: {
    primary: '#F39C12',
    secondary: '#D68910',
    accent: '#F7DC6F',
    background: '#FEF9E7',
  },
  geography: {
    primary: '#16A085',
    secondary: '#138D75',
    accent: '#48C9B0',
    background: '#E8F6F3',
  },
  chinese: {
    primary: '#C0392B',
    secondary: '#922B21',
    accent: '#EC7063',
    background: '#FDEDEC',
  },
  english: {
    primary: '#2980B9',
    secondary: '#1F618D',
    accent: '#5DADE2',
    background: '#EBF5FB',
  },
};

// ============ 化学元素配色 (CPK着色) ============

/** 元素CPK配色 */
export const elementColors: Record<string, string> = {
  H: '#FFFFFF',   // 氢 - 白色
  C: '#909090',   // 碳 - 灰色
  N: '#3050F8',   // 氮 - 蓝色
  O: '#FF0D0D',   // 氧 - 红色
  F: '#90E050',   // 氟 - 淡绿色
  Cl: '#1FF01F',  // 氯 - 绿色
  Br: '#A62929',  // 溴 - 棕红色
  I: '#940094',   // 碘 - 紫色
  S: '#FFFF30',   // 硫 - 黄色
  P: '#FF8000',   // 磷 - 橙色
  Na: '#AB5CF2',  // 钠 - 紫色
  K: '#8F40D4',   // 钾 - 淡紫色
  Ca: '#3DFF00',  // 钙 - 黄绿色
  Mg: '#8AFF00',  // 镁 - 绿色
  Fe: '#E06633',  // 铁 - 橙色
  Cu: '#C88033',  // 铜 - 铜色
  Zn: '#7D80B0',  // 锌 - 蓝灰色
  Al: '#BFA6A6',  // 铝 - 灰色
};

/** 离子配色 */
export const ionColors = {
  'H+': '#FF4444',
  'OH-': '#4488FF',
  'Na+': '#AB5CF2',
  'Cl-': '#1FF01F',
  'Ca2+': '#3DFF00',
  'K+': '#8F40D4',
};

// ============ 动画风格配色 ============

/** 风格化配色方案 */
export const styleColors = {
  minimal: {
    background: '#FFFFFF',
    primary: '#1A1A1A',
    secondary: '#666666',
    accent: '#333333',
    text: '#1A1A1A',
  },
  vibrant: {
    background: '#0D0D0D',
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    accent: '#FFE66D',
    text: '#FFFFFF',
  },
  tech: {
    background: '#0F172A',
    primary: '#06B6D4',
    secondary: '#3B82F6',
    accent: '#8B5CF6',
    text: '#E2E8F0',
  },
  warm: {
    background: '#FFF8F0',
    primary: '#FF6B6B',
    secondary: '#FFE66D',
    accent: '#FF8E53',
    text: '#2C3E50',
  },
  guofeng: {
    background: '#F5F0E6',
    primary: '#C0392B',
    secondary: '#D4AC0D',
    accent: '#1A5276',
    text: '#2C3E50',
  },
  dark: {
    background: '#1A1A2E',
    primary: '#16213E',
    secondary: '#0F3460',
    accent: '#E94560',
    text: '#EAEAEA',
  },
};

// ============ pH值配色 ============

/** pH刻度配色 */
export const phColors: Record<number, string> = {
  0: '#FF0000',
  1: '#FF3300',
  2: '#FF6600',
  3: '#FF9900',
  4: '#FFCC00',
  5: '#FFFF00',
  6: '#CCFF00',
  7: '#00FF00',  // 中性
  8: '#00FFCC',
  9: '#00CCFF',
  10: '#0099FF',
  11: '#0066FF',
  12: '#0033FF',
  13: '#0000FF',
  14: '#0000CC',
};

/** 获取pH颜色 */
export const getPHColor = (ph: number): string => {
  const roundedPH = Math.round(Math.max(0, Math.min(14, ph)));
  return phColors[roundedPH];
};

// ============ 指示剂配色 ============

/** 指示剂颜色变化 */
export const indicatorColors = {
  litmus: {  // 石蕊
    acid: '#FF0000',    // 红色
    neutral: '#9B59B6', // 紫色
    base: '#0000FF',    // 蓝色
  },
  phenolphthalein: {  // 酚酞
    acid: 'transparent',
    neutral: 'transparent',
    base: '#FF69B4',   // 粉红色
  },
  methylOrange: {  // 甲基橙
    acid: '#FF4500',   // 红色
    neutral: '#FFA500', // 橙色
    base: '#FFD700',   // 黄色
  },
};

// ============ 辅助函数 ============

/** RGB转十六进制 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

/** 十六进制转RGB */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
};

/** 颜色混合 */
export const blendColors = (color1: string, color2: string, ratio: number): string => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return color1;

  const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
  const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
  const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);

  return rgbToHex(r, g, b);
};

/** 生成渐变色数组 */
export const generateGradient = (
  startColor: string,
  endColor: string,
  steps: number
): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    colors.push(blendColors(startColor, endColor, ratio));
  }
  return colors;
};

export default {
  starclawColors,
  brandColors,
  socialColors,
  educationColors,
  elementColors,
  ionColors,
  styleColors,
  phColors,
  indicatorColors,
  getPHColor,
  rgbToHex,
  hexToRgb,
  blendColors,
  generateGradient,
};
