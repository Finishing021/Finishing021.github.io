import styles from './CarouselArrow.module.css'

type Props = {
  /** 翻页方向：决定箭头朝向与语义 */
  direction: 'prev' | 'next'
  onClick: () => void
  disabled?: boolean
  /** 可访问名（读屏念出来的那句话），由调用方按语种传入 */
  label: string
  /** 测试定位用；轮播里是 carousel-prev / carousel-next */
  testId?: string
  /** 额外类名：网格定位（轮播）或绝对定位包裹（灯箱）都靠它接上 */
  className?: string
}

/**
 * 全站通用的 3D 立体切换按钮（左 / 右）。
 *
 * 视觉取自用户截图：蓝→深蓝渐变 + 立体边 + 圆角 + 投影。
 * 三层层叠（top 顶面 / bottom 侧边 / base 底板）做出立体按压感；
 * 按下去时顶面下沉、侧边收扁，像真的被按进去。
 *
 * 只做样式外壳，翻页逻辑（clamp / 键盘方向键 / 到头禁用）由调用方自己维护，
 * 所以换上它不会改变任何既有行为——测试也只认 aria-label 和 disabled。
 */
export default function CarouselArrow({
  direction,
  onClick,
  disabled = false,
  label,
  testId,
  className,
}: Props) {
  return (
    <button
      type="button"
      className={`${styles.arrow3d}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-testid={testId}
      data-dir={direction}
    >
      <span className={styles.top} aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          {direction === 'prev' ? (
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M9 5l7 7-7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </span>
      <span className={styles.bottom} aria-hidden="true" />
      <span className={styles.base} aria-hidden="true" />
    </button>
  )
}
