---
name: dynamic_video
description: 动态视频制作技能，基于Remotion框架创建教学动画、营销视频、品牌宣传片、知识科普等动态内容。支持标题动画、数据可视化、分子模型、图表动画、字幕同步等特效。当需要制作教育课件、产品演示、品牌动画、知识科普视频时使用。
metadata:
  tags: video, animation, remotion, education, marketing, motion-graphics, tutorial
  version: 1.0.0
  author: StarClaw Creative Team
  reference: 初三高一化学课件系统
---

# 动态视频制作 (dynamic_video)

基于 Remotion 框架的专业动态视频制作技能，为 StarClaw 虚拟娱乐公司提供高质量动画视频生产能力。

## 适用 Agent

| Agent | 适用场景 |
|-------|---------|
| 张谋谋 (production_visual) | 视觉设计指导、动画创意把控 |
| 周星星 (creative_comedy) | 喜剧短视频、搞笑动画 |
| 胡哥哥 (creative_drama) | 深度内容、人文纪录片 |
| 任伦伦 (creative_idol) | 偶像内容、粉丝向视频 |
| 周伦伦 (music_director) | 音乐可视化、MV动画 |
| 刘华华 (production_management) | 项目排期、资源协调 |

## 核心能力

### 1. 视频类型支持

| 类型 | 描述 | 典型时长 |
|------|------|----------|
| 教育课件 | 知识点讲解、动画演示 | 3-15分钟 |
| 品牌宣传 | Logo动画、品牌故事 | 30秒-3分钟 |
| 产品演示 | 功能展示、使用教程 | 1-5分钟 |
| 知识科普 | 科学原理、历史故事 | 2-10分钟 |
| 短视频 | 社交媒体内容 | 15-60秒 |
| 音乐可视化 | 歌词动画、节奏同步 | 3-5分钟 |

### 2. 动画效果库

#### 标题动画
- 淡入淡出 (Fade)
- 滑动进入 (Slide)
- 缩放动画 (Scale)
- 弹跳效果 (Bounce)
- 打字机效果 (Typewriter)
- 手写效果 (Handwriting)

#### 数据可视化
- 柱状图动画 (Bar Chart)
- 折线图动画 (Line Chart)
- 饼图动画 (Pie Chart)
- 数据表格动画 (Data Table)
- 数字滚动 (Number Counter)

#### 特效动画
- 粒子效果 (Particles)
- 光效动画 (Light Effects)
- 转场效果 (Transitions)
- 模糊/清晰 (Blur/Focus)
- 变形动画 (Morphing)

#### 3D模型
- 分子结构 (Molecule)
- 原子模型 (Atom)
- 几何图形 (Geometry)
- 产品模型 (Product)

### 3. 多媒体集成

- 语音合成 (Edge-TTS)
- 字幕同步 (SRT/VTT)
- 背景音乐 (BGM)
- 音效系统 (SFX)
- 音画同步 (Audio-Video Sync)

## 工作流程

### 阶段1: 需求分析

```json
{
  "project": "项目名称",
  "type": "education|brand|product|science|social|music",
  "duration": "目标时长(秒)",
  "style": {
    "color_scheme": "配色方案",
    "font": "字体选择",
    "animation_style": "动画风格"
  },
  "content": {
    "scenes": ["场景列表"],
    "narration": "配音文案",
    "background_music": "背景音乐"
  },
  "output": {
    "resolution": "1920x1080",
    "fps": 30,
    "format": "mp4"
  }
}
```

### 阶段2: 脚本设计

```markdown
# 视频脚本

## 元数据
- 标题: ...
- 时长: ...
- 配音: ...

## 场景列表

### 场景1: 标题页
- 时长: 5秒
- 类型: TitleSlide
- 动画: fadeIn
- 配音: "欢迎来到..."

### 场景2: 内容页
- 时长: 15秒
- 类型: ContentSlide
- 动画: slideUp
- 元素: [标题, 正文, 图片]

### 场景3: 数据展示
- 时长: 10秒
- 类型: ChartAnimation
- 数据: {labels: [...], values: [...]}
```

### 阶段3: Remotion开发

```tsx
// 示例: 品牌宣传片组件
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AbsoluteFill, Sequence } from 'remotion';

export const BrandVideo: React.FC<BrandVideoProps> = ({
  title,
  subtitle,
  logo,
  scenes
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {scenes.map((scene, index) => (
        <Sequence
          key={index}
          from={scene.startFrame}
          durationInFrames={scene.duration}
        >
          {/* 场景组件 */}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
```

### 阶段4: 渲染输出

```bash
# 本地预览
npm run dev

# 渲染视频
npx remotion render BrandVideo out/brand-video.mp4

# 批量渲染
npm run build:all
```

## 项目结构

```
dynamic_video/
├── projects/                    # Remotion项目
│   ├── brand-promo/                # 品牌宣传
│   │   ├── src/
│   │   │   ├── compositions/
│   │   │   ├── components/
│   │   │   └── utils/
│   │   └── package.json
│   ├── education-courseware/       # 教育课件
│   ├── product-demo/               # 产品演示
│   └── social-short/               # 短视频
├── templates/                    # 模板库
│   ├── TitleSlide.tsx               # 标题页模板
│   ├── ContentSlide.tsx             # 内容页模板
│   ├── ChartAnimation.tsx           # 图表动画模板
│   ├── EndingSlide.tsx              # 结尾页模板
│   └── Subtitles.tsx                # 字幕组件
├── assets/                       # 资源文件
│   ├── fonts/                       # 字体
│   ├── images/                      # 图片
│   └── audio/                       # 音频
├── scripts/                      # 工具脚本
│   ├── generate_voiceover.py        # 配音生成
│   ├── merge_audio.py               # 音频合并
│   └── render_all.py                # 批量渲染
├── config/                       # 配置文件
│   ├── colors.ts                    # 配色方案
│   ├── animations.ts                # 动画配置
│   └── voices.json                  # 音色配置
├── SKILL.md                      # 本文件
└── README.md                     # 使用说明
```

## 配色规范

### 品牌色系

```typescript
// 品牌配色
export const brandColors = {
  primary: '#FF6B6B',      // 活力红
  secondary: '#4ECDC4',    // 清新青
  accent: '#FFE66D',       // 暖阳黄
  dark: '#2C3E50',         // 深邃蓝
  light: '#FFFFFF',        // 纯净白
};

// 社交媒体配色
export const socialColors = {
  douyin: '#000000',       // 抖音黑
  xiaohongshu: '#FF2442',  // 小红书红
  bilibili: '#00A1D6',     // B站蓝
  weibo: '#E6162D',        // 微博红
};

// 教育配色
export const educationColors = {
  math: '#3498DB',         // 数学蓝
  physics: '#E74C3C',      // 物理红
  chemistry: '#9B59B6',    // 化学紫
  biology: '#27AE60',      // 生物绿
  history: '#F39C12',      // 历史金
};
```

### 动画风格

| 风格 | 适用场景 | 特点 |
|------|---------|------|
| 简约 | 品牌、商务 | 线条简洁、留白多 |
| 活力 | 社交、青年 | 色彩鲜艳、节奏快 |
| 科技 | 产品、技术 | 蓝色调、粒子效果 |
| 温馨 | 教育、家庭 | 暖色调、柔和动画 |
| 国风 | 文化、传统 | 水墨效果、传统色 |

## Remotion 核心规则

### 1. 帧驱动动画

```tsx
// 正确: 使用 useCurrentFrame
const frame = useCurrentFrame();
const opacity = interpolate(frame, [0, 30], [0, 1]);

// 错误: 使用 CSS 动画 (不会正确渲染)
// opacity: 0; animation: fadeIn 1s;
```

### 2. Spring 动画

```tsx
import { spring } from 'remotion';

const scale = spring({
  frame,
  fps,
  config: {
    damping: 200,    // 阻尼
    stiffness: 100,  // 刚度
    mass: 0.5,       // 质量
  },
});
```

### 3. 时间计算

```tsx
const fps = 30;
const seconds = 5;
const frames = seconds * fps;  // 150帧

// 场景时间轴
const timeline = {
  intro: { start: 0, duration: 30 },      // 0-1秒
  content: { start: 30, duration: 120 },  // 1-5秒
  outro: { start: 150, duration: 30 },    // 5-6秒
};
```

## 语音合成配置

```json
{
  "voices": {
    "narrator_male": "zh-CN-YunxiNeural",
    "narrator_female": "zh-CN-XiaoxiaoNeural",
    "teacher_male": "zh-CN-YunyangNeural",
    "teacher_female": "zh-CN-XiaoyiNeural"
  },
  "prosody": {
    "speed": 0.95,
    "pitch": "default",
    "volume": 100
  },
  "breaks": {
    "comma": 200,
    "period": 500,
    "paragraph": 1000
  }
}
```

## 质量标准

### 视频规格

| 参数 | 标准值 | 高清值 |
|------|--------|--------|
| 分辨率 | 1920x1080 | 3840x2160 |
| 帧率 | 30fps | 60fps |
| 码率 | 5Mbps | 15Mbps |
| 格式 | MP4 (H.264) | MP4 (H.265) |

### 质量检查清单

- [ ] 内容准确性: 文字/数据无误
- [ ] 动画流畅度: 无卡顿/跳帧
- [ ] 音画同步: 误差<100ms
- [ ] 字幕完整: 时间轴对齐
- [ ] 色彩一致: 符合品牌规范
- [ ] 转场自然: 无突兀切换

## 快速命令

```bash
# 初始化项目
npm create video@latest my-video -- --template blank

# 安装依赖
cd my-video && npm install

# 本地预览
npm run dev

# 渲染视频
npx remotion render MyComposition out/video.mp4

# 批量渲染
npm run build:all

# 生成配音
python scripts/generate_voiceover.py --script voiceover.yaml

# 合并音视频
python scripts/merge_audio.py --video out/video.mp4 --audio out/voice.mp3
```

## 示例场景

### 1. 教育课件

```typescript
const lessonConfig = {
  type: 'education',
  subject: 'chemistry',
  title: '原子结构',
  duration: 180,  // 3分钟
  scenes: [
    { type: 'TitleSlide', duration: 5, content: { title: '原子结构' } },
    { type: 'AtomModel', duration: 30, content: { element: 'C' } },
    { type: 'ContentSlide', duration: 20, content: { text: '...' } },
  ],
  narration: {
    voice: 'zh-CN-XiaoyiNeural',
    speed: 0.9,
  },
};
```

### 2. 品牌宣传

```typescript
const brandConfig = {
  type: 'brand',
  brand: 'StarClaw',
  duration: 60,  // 1分钟
  scenes: [
    { type: 'LogoAnimation', duration: 3 },
    { type: 'TextAnimation', duration: 5, content: { text: '虚拟娱乐新纪元' } },
    { type: 'EndingSlide', duration: 5 },
  ],
  style: {
    colors: brandColors,
    animationStyle: 'modern',
  },
};
```

### 3. 产品演示

```typescript
const productConfig = {
  type: 'product',
  product: 'AI Agent Platform',
  duration: 120,  // 2分钟
  scenes: [
    { type: 'TitleSlide', duration: 5 },
    { type: 'FeatureHighlight', duration: 30, feature: '智能对话' },
    { type: 'FeatureHighlight', duration: 30, feature: '多模态能力' },
    { type: 'CallToAction', duration: 10 },
  ],
};
```

## 参考资料

- [Remotion 官方文档](https://remotion.dev/docs)
- [初三高一化学课件](file:///c:/D/compet/dcic/已提交/初三高一/chemistry-courseware)
- [动画设计指南](./docs/animation-guide.md)
- [配色规范](./config/colors.ts)

---

**技能版本**: 1.0.0
**最后更新**: 2026-04-04
**维护者**: StarClaw 技术团队
