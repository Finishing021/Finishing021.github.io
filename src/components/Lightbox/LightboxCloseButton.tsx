import { forwardRef, type ButtonHTMLAttributes } from 'react'
import styles from './LightboxCloseButton.module.css'

/**
 * 灯箱统一的关闭按钮（叉号）。
 *
 * 全局所有弹大图的灯箱 —— 光影（PhotoLightbox）、作品集（复用 PhotoLightbox）、
 * 成长档案（DiaryLightbox）—— 都复用这一枚，保证叉号的视觉与交互只有一份定义、
 * 不会在几个灯箱之间漂移。
 *
 * 圆形磨砂按钮：半透明深色闲置、悬停变主色（accent）、按下回缩、键盘可见聚焦环。
 * 用 forwardRef 透传 ref，方便各灯箱把初始焦点压到关闭按钮上。
 */
export interface LightboxCloseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 无障碍名称，按各灯箱文案区分（关闭大图 / 关闭原图） */
  label: string
}

const LightboxCloseButton = forwardRef<HTMLButtonElement, LightboxCloseButtonProps>(
  ({ label, ...rest }, ref) => (
    <button type="button" className={styles.close} ref={ref} aria-label={label} {...rest}>
      <span className={styles.closeIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M24 20.188l-8.315-8.209 8.2-8.282-3.697-3.697-8.212 8.318-8.31-8.203-3.666 3.666 8.321 8.24-8.206 8.313 3.666 3.666 8.237-8.318 8.285 8.203z" />
        </svg>
      </span>
    </button>
  ),
)

LightboxCloseButton.displayName = 'LightboxCloseButton'

export default LightboxCloseButton
