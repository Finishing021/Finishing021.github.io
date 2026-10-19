import type { ReactNode } from 'react'
import styles from './DownloadButton.module.css'

interface DownloadButtonProps {
  /** 指向 public 下的 PDF，例如 /resume.pdf */
  href: string
  /** download 属性值：另存为时用的文件名 */
  download: string
  /** 主文案，如「下载简历」 */
  label: string
  /** 次要说明，如「PDF · 13 页」，纯装饰、对读屏隐藏 */
  meta?: ReactNode
  /** 读屏专用说明（作品集按钮用它），不传则读屏读文字内容 */
  ariaLabel?: string
  /** 测试锚点，如 resume-button / portfolio-download */
  testId?: string
}

/**
 * 统一的下载按钮。视觉取自一段 Uiverse 绿底下载按钮（左侧伪元素画出下载箭头、
 * 悬停时箭头循环下跳），这里把绿色换成站点浅蓝、尺寸收小、移动端可点。
 *
 * ⚠️ 关键：它永远渲染成 `<a download href>`，因为只有这样浏览器才会「另存为」
 * 而不是在页面里打开 PDF。样式再怎么换，这个行为不能丢。
 */
export default function DownloadButton({
  href,
  download,
  label,
  meta,
  ariaLabel,
  testId,
}: DownloadButtonProps) {
  return (
    <a
      className={styles.btn}
      href={href}
      download={download}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      <span className={styles.label}>{label}</span>
      {meta != null && (
        <span className={styles.meta} aria-hidden="true">
          {meta}
        </span>
      )}
    </a>
  )
}
