# StarClaw 动态视频制作技能

基于 Remotion 框架的专业动态视频制作技能，为 StarClaw 虚拟娱乐公司提供高质量动画视频生产能力。

## 技能概述

本技能借鉴了"初三高一"化学动态课件系统的成功经验，将其扩展为面向娱乐内容创作的通用动态视频制作能力。

### 核心能力

| 能力 | 描述 |
|------|------|
| 视频类型 | 教育课件、品牌宣传、产品演示、知识科普、短视频、音乐可视化 |
| 动画效果 | 标题动画、数据可视化、分子模型、图表动画、字幕同步、转场效果 |
| 多媒体集成 | 语音合成(Edge-TTS)、字幕同步(SRT/VTT)、背景音乐、音画同步 |
| 渲染能力 | 1920x1080/3840x2160分辨率、30/60fps、MP4/WebM格式 |

## 适用 Agent

| Agent | 角色 | 适用场景 |
|-------|------|---------|
| 张谋谋 (production_visual) | 视觉总监 | 视觉设计指导、动画创意把控 |
| 周星星 (creative_comedy) | 喜剧创意总监 | 喜剧短视频、搞笑动画 |
| 胡哥哥 (creative_drama) | 戏剧创意总监 | 深度内容、人文纪录片 |
| 任伦伦 (creative_idol) | 偶像内容总监 | 偶像内容、粉丝向视频 |
| 周伦伦 (music_director) | 音乐总监 | 音乐可视化、MV动画 |
| 刘华华 (production_management) | 制片总监 | 项目排期、资源协调 |

## 目录结构

```
dynamic_video/
├── SKILL.md                      # 技能核心文档
├── README.md                     # 本文件
├── config/                       # 配置文件
│   ├── colors.ts                    # 配色方案
│   ├── animations.ts                # 动画配置
│   └── voices.json                  # 音色配置
├── templates/                    # 模板组件
│   ├── TitleSlide.tsx               # 标题页模板
│   ├── ContentSlide.tsx             # 内容页模板
│   ├── ChartAnimation.tsx           # 图表动画模板
│   ├── Subtitles.tsx                # 字幕组件
│   └── EndingSlide.tsx              # 结尾页模板
├── scripts/                      # 工具脚本
│   ├── generate_voiceover.py        # 配音生成
│   └── render_video.py              # 视频渲染
└── assets/                       # 资源文件
    ├── fonts/                       # 字体
    ├── images/                      # 图片
    └── audio/                       # 音频
```

## 快速开始

### 1. 创建配音脚本 (YAML)

```yaml
# voiceover.yaml
project: "品牌宣传视频"
voice_preset: "narrator_male"

scenes:
  - scene_id: 0
    text: "欢迎来到 StarClaw 虚拟娱乐公司"
    voice: "zh-CN-YunxiNeural"
    speed: 0.95

  - scene_id: 1
    text: "我们是一家专注于AI驱动的娱乐内容创作公司"
    speed: 0.9
```

### 2. 生成配音

```bash
python scripts/generate_voiceover.py --script voiceover.yaml --output ./output/audio --merge --subtitles
```

### 3. 开发 Remotion 组件

```tsx
import { TitleSlide, ContentSlide, EndingSlide } from './templates';

export const MyVideo = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}>
        <TitleSlide title="品牌宣传" subtitle="StarClaw" />
      </Sequence>
      {/* 更多场景... */}
    </AbsoluteFill>
  );
};
```

### 4. 渲染视频

```bash
# 本地预览
npm run dev

# 渲染视频
python scripts/render_video.py render --composition MyVideo --output ./out/video.mp4
```

## 组件库

### TitleSlide (标题页)

```tsx
<TitleSlide
  title="主标题"
  subtitle="副标题"
  chapter="第一章"
  animationStyle="bounce"
  visualStyle="vibrant"
/>
```

### ContentSlide (内容页)

```tsx
<ContentSlide
  title="内容标题"
  content={[
    { text: "第一项内容", highlight: true },
    { text: "第二项内容" },
    { text: "第三项内容" },
  ]}
  layout="list"
  showNumbers
/>
```

### ChartAnimation (图表动画)

```tsx
<ChartAnimation
  type="bar"
  title="数据可视化"
  data={[
    { label: "一月", value: 100 },
    { label: "二月", value: 150 },
    { label: "三月", value: 200 },
  ]}
/>
```

### Subtitles (字幕)

```tsx
<Subtitles
  subtitles={[
    { startTime: 0, endTime: 3, text: "第一句字幕" },
    { startTime: 3.5, endTime: 6, text: "第二句字幕" },
  ]}
  position="bottom"
/>
```

### EndingSlide (结尾页)

```tsx
<EndingSlide
  title="感谢观看"
  callToAction="关注我们"
  brandName="StarClaw"
  socialLinks={[
    { platform: "微博", handle: "@StarClaw" },
    { platform: "抖音", handle: "@StarClaw" },
  ]}
/>
```

## 配色方案

### 视觉风格预设

| 风格 | 背景 | 主色 | 适用场景 |
|------|------|------|---------|
| minimal | 白色 | 黑色 | 品牌、商务 |
| vibrant | 深色 | 彩色 | 社交、青年 |
| tech | 深蓝 | 青色 | 产品、技术 |
| warm | 暖白 | 暖色 | 教育、家庭 |
| guofeng | 米色 | 朱红 | 文化、传统 |

### 社交媒体配色

```typescript
import { socialColors } from './config/colors';

// 抖音
socialColors.douyin.primary    // #000000
socialColors.douyin.accent     // #FE2C55

// 小红书
socialColors.xiaohongshu.primary  // #FF2442

// B站
socialColors.bilibili.primary  // #00A1D6
```

## 技术栈

- **Remotion** - React 视频框架
- **TypeScript** - 类型支持
- **Edge-TTS** - 微软语音合成
- **FFmpeg** - 音视频处理
- **Python** - 脚本工具

## 参考资料

- [Remotion 官方文档](https://remotion.dev/docs)
- [初三高一化学课件系统](file:///c:/D/compet/dcic/已提交/初三高一/)
- [StarClaw 技能系统](../skills.json)

---

**版本**: 1.0.0
**创建日期**: 2026-04-04
**维护团队**: StarClaw 技术部
