import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { fadeIn, numberCounter } from '../config/animations';
import { styleColors } from '../config/colors';

// ============ 类型定义 ============

export type ChartType = 'bar' | 'line' | 'pie' | 'donut';

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartAnimationProps {
  /** 图表类型 */
  type: ChartType;
  /** 数据点 */
  data: DataPoint[];
  /** 标题 */
  title?: string;
  /** 视觉风格 */
  visualStyle?: 'minimal' | 'vibrant' | 'tech' | 'warm';
  /** 自定义配色 */
  colors?: {
    background?: string;
    primary?: string;
    secondary?: string;
    text?: string;
  };
  /** 是否显示数值标签 */
  showValues?: boolean;
  /** 是否显示图例 */
  showLegend?: boolean;
  /** Y轴最大值 */
  yMax?: number;
  /** 动画持续时间(帧) */
  animationDuration?: number;
}

// ============ 柱状图组件 ============

const BarChart: React.FC<ChartAnimationProps> = ({
  data,
  colors,
  showValues = true,
  animationDuration = 60,
  yMax,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const maxValue = yMax ?? Math.max(...data.map(d => d.value)) * 1.2;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 350,
        padding: '0 40px',
      }}
    >
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * 300;
        const delay = index * 10;

        const animatedHeight = interpolate(
          frame,
          [delay, delay + animationDuration],
          [0, barHeight],
          { extrapolateRight: 'clamp' }
        );

        const bounceHeight = spring({
          frame: Math.max(0, frame - delay - animationDuration),
          fps,
          config: { damping: 15, stiffness: 100 },
        });

        const overshoot = bounceHeight > 1 ? (bounceHeight - 1) * 10 : 0;

        return (
          <div
            key={index}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {/* 数值标签 */}
            {showValues && (
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: colors?.primary ?? '#FF6B6B',
                  opacity: fadeIn(frame, { duration: 20, delay: delay + animationDuration }),
                }}
              >
                {numberCounter(
                  Math.max(0, frame - delay),
                  0,
                  item.value,
                  { duration: animationDuration }
                ).toFixed(0)}
              </div>
            )}

            {/* 柱子 */}
            <div
              style={{
                width: 60,
                height: animatedHeight + overshoot,
                backgroundColor: item.color ?? colors?.primary ?? '#FF6B6B',
                borderRadius: '8px 8px 0 0',
                boxShadow: `0 4px 20px ${(item.color ?? colors?.primary ?? '#FF6B6B')}44`,
              }}
            />

            {/* 标签 */}
            <div
              style={{
                fontSize: 16,
                color: colors?.secondary ?? '#4ECDC4',
                textAlign: 'center',
                maxWidth: 80,
              }}
            >
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============ 折线图组件 ============

const LineChart: React.FC<ChartAnimationProps> = ({
  data,
  colors,
  showValues = true,
  animationDuration = 60,
  yMax,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  const maxValue = yMax ?? Math.max(...data.map(d => d.value)) * 1.2;
  const chartWidth = width - 200;
  const chartHeight = 300;

  const points = data.map((item, index) => {
    const x = 100 + (index / (data.length - 1)) * chartWidth;
    const y = chartHeight - (item.value / maxValue) * chartHeight + 50;
    return { x, y, ...item };
  });

  const progress = interpolate(frame, [0, animationDuration], [0, 1], { extrapolateRight: 'clamp' });

  const visiblePoints = Math.floor(progress * points.length);
  const currentProgress = (progress * points.length) % 1;

  const pathData = points.slice(0, visiblePoints + 1)
    .map((p, i) => {
      if (i === visiblePoints && i < points.length - 1) {
        const next = points[i + 1];
        const x = p.x + (next.x - p.x) * currentProgress;
        const y = p.y + (next.y - p.y) * currentProgress;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }
      return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
    })
    .join(' ');

  // 面积填充路径
  const areaPath = pathData + ` L ${points[Math.min(visiblePoints, points.length - 1)].x} ${chartHeight + 50} L 100 ${chartHeight + 50} Z`;

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={chartHeight + 100}>
        {/* 网格线 */}
        {[0, 1, 2, 3, 4].map(i => (
          <line
            key={i}
            x1={100}
            y1={50 + i * (chartHeight / 4)}
            x2={width - 100}
            y2={50 + i * (chartHeight / 4)}
            stroke={colors?.secondary ?? '#4ECDC4'}
            strokeWidth={1}
            strokeOpacity={0.2}
            strokeDasharray="5,5"
          />
        ))}

        {/* Y轴标签 */}
        {[0, 1, 2, 3, 4].map(i => (
          <text
            key={i}
            x={80}
            y={55 + i * (chartHeight / 4)}
            fontSize={14}
            fill={colors?.secondary ?? '#4ECDC4'}
            textAnchor="end"
          >
            {Math.round(maxValue * (1 - i / 4))}
          </text>
        ))}

        {/* 面积填充 */}
        <path
          d={areaPath}
          fill={colors?.primary ?? '#FF6B6B'}
          fillOpacity={0.1}
        />

        {/* 折线 */}
        <path
          d={pathData}
          stroke={colors?.primary ?? '#FF6B6B'}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 数据点 */}
        {points.slice(0, visiblePoints + 1).map((p, i) => {
          const pointDelay = i * (animationDuration / points.length);
          const pointOpacity = fadeIn(frame, { duration: 10, delay: pointDelay });

          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={8}
                fill={colors?.primary ?? '#FF6B6B'}
                opacity={pointOpacity}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={4}
                fill="#FFFFFF"
                opacity={pointOpacity}
              />

              {/* 数值标签 */}
              {showValues && (
                <text
                  x={p.x}
                  y={p.y - 20}
                  fontSize={18}
                  fontWeight={600}
                  fill={colors?.primary ?? '#FF6B6B'}
                  textAnchor="middle"
                  opacity={pointOpacity}
                >
                  {p.value}
                </text>
              )}

              {/* X轴标签 */}
              <text
                x={p.x}
                y={chartHeight + 80}
                fontSize={14}
                fill={colors?.secondary ?? '#4ECDC4'}
                textAnchor="middle"
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ============ 饼图/环形图组件 ============

const PieChart: React.FC<ChartAnimationProps & { innerRadius?: number }> = ({
  data,
  type,
  colors,
  showValues = true,
  showLegend = true,
  animationDuration = 60,
  innerRadius = type === 'donut' ? 60 : 0,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const centerX = width / 2 - (showLegend ? 150 : 0);
  const centerY = 220;
  const outerRadius = 150;

  const progress = interpolate(frame, [0, animationDuration], [0, 360], { extrapolateRight: 'clamp' });

  const slices = data.map((item, index) => {
    const angle = (item.value / total) * 360;
    const startAngle = data.slice(0, index).reduce((sum, d) => sum + (d.value / total) * 360, 0);
    const endAngle = startAngle + angle;

    return {
      ...item,
      startAngle,
      endAngle,
      percentage: ((item.value / total) * 100).toFixed(1),
    };
  });

  const polarToCartesian = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad),
    };
  };

  const createArcPath = (startAngle: number, endAngle: number, innerR: number, outerR: number) => {
    const start = polarToCartesian(startAngle, outerR);
    const end = polarToCartesian(endAngle, outerR);
    const innerStart = polarToCartesian(startAngle, innerR);
    const innerEnd = polarToCartesian(endAngle, innerR);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `
      M ${start.x} ${start.y}
      A ${outerR} ${outerR} 0 ${largeArc} 1 ${end.x} ${end.y}
      L ${innerEnd.x} ${innerEnd.y}
      A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}
      Z
    `;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 60,
      }}
    >
      <svg width={showLegend ? width - 300 : width} height={440}>
        {/* 饼图切片 */}
        {slices.map((slice, index) => {
          const visibleAngle = Math.min(progress, slice.endAngle) - slice.startAngle;
          if (visibleAngle <= 0) return null;

          const animatedEndAngle = slice.startAngle + Math.max(0, visibleAngle);
          const path = createArcPath(
            slice.startAngle,
            animatedEndAngle,
            innerRadius,
            outerRadius
          );

          return (
            <path
              key={index}
              d={path}
              fill={slice.color ?? colors?.primary ?? '#FF6B6B'}
              opacity={0.9}
              style={{
                filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.2))',
              }}
            />
          );
        })}

        {/* 中心文字 (环形图) */}
        {type === 'donut' && progress >= 360 && (
          <text
            x={centerX}
            y={centerY}
            fontSize={32}
            fontWeight={700}
            fill={colors?.text ?? '#2C3E50'}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {total}
          </text>
        )}
      </svg>

      {/* 图例 */}
      {showLegend && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 15,
          }}
        >
          {slices.map((slice, index) => {
            const legendDelay = index * 5;
            const legendOpacity = fadeIn(frame, { duration: 15, delay: legendDelay + animationDuration });

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  opacity: legendOpacity,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    backgroundColor: slice.color ?? colors?.primary ?? '#FF6B6B',
                  }}
                />
                <span
                  style={{
                    fontSize: 18,
                    color: colors?.text ?? '#2C3E50',
                  }}
                >
                  {slice.label}
                </span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: colors?.primary ?? '#FF6B6B',
                    marginLeft: 'auto',
                  }}
                >
                  {showValues ? `${slice.percentage}%` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============ 主组件 ============

export const ChartAnimation: React.FC<ChartAnimationProps> = (props) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const styleColorSet = styleColors[props.visualStyle ?? 'vibrant'];
  const colors = {
    background: props.colors?.background ?? styleColorSet.background,
    primary: props.colors?.primary ?? styleColorSet.primary,
    secondary: props.colors?.secondary ?? styleColorSet.secondary,
    text: props.colors?.text ?? styleColorSet.text,
  };

  const titleOpacity = fadeIn(frame, { duration: 20 });

  const renderChart = () => {
    switch (props.type) {
      case 'bar':
        return <BarChart {...props} colors={colors} />;
      case 'line':
        return <LineChart {...props} colors={colors} />;
      case 'pie':
      case 'donut':
        return <PieChart {...props} colors={colors} />;
      default:
        return <BarChart {...props} colors={colors} />;
    }
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        padding: 60,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 标题 */}
      {props.title && (
        <h2
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: colors.text,
            margin: '0 0 40px 0',
            opacity: titleOpacity,
          }}
        >
          {props.title}
        </h2>
      )}

      {/* 图表 */}
      {renderChart()}
    </AbsoluteFill>
  );
};

export default ChartAnimation;
