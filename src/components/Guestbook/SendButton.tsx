import type { CSSProperties } from 'react'
import styles from './SendButton.module.css'

interface SendButtonProps {
  /** 默认态文字（如「发送」/「Send」） */
  label: string
  /** 发送成功后的短标签（如「已发送」/「Sent」） */
  sentLabel: string
  /** 发送中态文字（如「发送中...」/「Sending...」） */
  sendingLabel: string
  /** 当前发送状态，驱动按钮视觉：idle 常态 / sending 发送中（禁用）/ sent 已发送 */
  status?: 'idle' | 'sending' | 'sent'
}

/**
 * 留言板「发送」按钮 —— 改编自 Uiverse 的 Send Message 按钮（纯 CSS Module，不引第三方库）。
 *
 * 视觉：浅色渐变胶囊 + 渐变描边，左侧纸飞机图标，悬停时字母轻微波动、飞机转向 45°。
 * 粉红主色已换成站点浅蓝（--accent）。
 *
 * 功能：它就是留言板 `<form>` 的 `type="submit"` 按钮。具体「把留言 POST 到 Web3Forms」
 * 这步逻辑来自父组件的 onSubmit，这里只根据 `status` 切换 idle / sending / sent 三态外观：
 * - idle：纸飞机 + label
 * - sending：禁用按钮，纸飞机 + sendingLabel（如「发送中...」）
 * - sent：勾选图标 + sentLabel（如「已发送」）
 */
export default function SendButton({
  label,
  sentLabel,
  sendingLabel,
  status = 'idle',
}: SendButtonProps) {
  const letters = (text: string) =>
    text.split('').map((ch, i) => (
      <span key={i} style={{ ['--i']: i } as CSSProperties}>
        {ch}
      </span>
    ))

  const isSending = status === 'sending'

  return (
    <button
      type="submit"
      className={styles.button}
      data-status={status}
      disabled={isSending}
      aria-label={isSending ? sendingLabel : label}
      aria-busy={isSending || undefined}
    >
      <span className={styles.outline} aria-hidden="true" />

      <div className={`${styles.state} ${styles.stateDefault}`} aria-hidden="true">
        <span className={styles.icon}>
          <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g style={{ filter: 'url(#gbShadowA)' }}>
              <path
                d="M14.2199 21.63C13.0399 21.63 11.3699 20.8 10.0499 16.83L9.32988 14.67L7.16988 13.95C3.20988 12.63 2.37988 10.96 2.37988 9.78001C2.37988 8.61001 3.20988 6.93001 7.16988 5.60001L15.6599 2.77001C17.7799 2.06001 19.5499 2.27001 20.6399 3.35001C21.7299 4.43001 21.9399 6.21001 21.2299 8.33001L18.3999 16.82C17.0699 20.8 15.3999 21.63 14.2199 21.63ZM7.63988 7.03001C4.85988 7.96001 3.86988 9.06001 3.86988 9.78001C3.86988 10.5 4.85988 11.6 7.63988 12.52L10.1599 13.36C10.3799 13.43 10.5599 13.61 10.6299 13.83L11.4699 16.35C12.3899 19.13 13.4999 20.12 14.2199 20.12C14.9399 20.12 16.0399 19.13 16.9699 16.35L19.7999 7.86001C20.3099 6.32001 20.2199 5.06001 19.5699 4.41001C18.9199 3.76001 17.6599 3.68001 16.1299 4.19001L7.63988 7.03001Z"
                fill="currentColor"
              />
              <path
                d="M10.11 14.4C9.92005 14.4 9.73005 14.33 9.58005 14.18C9.29005 13.89 9.29005 13.41 9.58005 13.12L13.16 9.53C13.45 9.24 13.93 9.24 14.22 9.53C14.51 9.82 14.51 10.3 14.22 10.59L10.64 14.18C10.5 14.33 10.3 14.4 10.11 14.4Z"
                fill="currentColor"
              />
            </g>
            <defs>
              <filter id="gbShadowA" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={0} dy={1} stdDeviation="0.6" floodOpacity="0.5" />
              </filter>
            </defs>
          </svg>
        </span>
        <p>{letters(isSending ? sendingLabel : label)}</p>
      </div>

      <div className={`${styles.state} ${styles.stateSent}`} aria-hidden="true">
        <span className={styles.icon}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            height="1em"
            width="1em"
            strokeWidth="0.5px"
            stroke="black"
          >
            <g style={{ filter: 'url(#gbShadowB)' }}>
              <path
                fill="currentColor"
                d="M12 22.75C6.07 22.75 1.25 17.93 1.25 12C1.25 6.07 6.07 1.25 12 1.25C17.93 1.25 22.75 6.07 22.75 12C22.75 17.93 17.93 22.75 12 22.75ZM12 2.75C6.9 2.75 2.75 6.9 2.75 12C2.75 17.1 6.9 21.25 12 21.25C17.1 21.25 21.25 17.1 21.25 12C21.25 6.9 17.1 2.75 12 2.75Z"
              />
              <path
                fill="currentColor"
                d="M10.5795 15.5801C10.3795 15.5801 10.1895 15.5001 10.0495 15.3601L7.21945 12.5301C6.92945 12.2401 6.92945 11.7601 7.21945 11.4701C7.50945 11.1801 7.98945 11.1801 8.27945 11.4701L10.5795 13.7701L15.7195 8.6301C16.0095 8.3401 16.4895 8.3401 16.7795 8.6301C17.0695 8.9201 17.0695 9.4001 16.7795 9.6901L11.1095 15.3601C10.9695 15.5001 10.7795 15.5801 10.5795 15.5801Z"
              />
            </g>
            <defs>
              <filter id="gbShadowB" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={0} dy={1} stdDeviation="0.6" floodOpacity="0.5" />
              </filter>
            </defs>
          </svg>
        </span>
        <p>{letters(sentLabel)}</p>
      </div>
    </button>
  )
}
