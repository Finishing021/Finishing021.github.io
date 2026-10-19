import { useEffect, useRef, useState } from 'react'
import { musicCopy } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import styles from './MusicPlayer.module.css'

/**
 * 全站背景音乐播放器 —— 现在待在**导航栏最右侧**，紧挨语言切换的小爱心。
 *
 * 原来是右下角一枚可拖动的大圆钮，站主反馈「太不显眼、经常找不到」，于是搬进导航栏：
 * - 尺寸收敛到和导航图标同量级的小圆钮（32px），并排不突兀；
 * - **拖拽功能已删除**：固定在导航栏里，不需要再挪动，顺带去掉了 framer-motion 依赖；
 * - 悬停 / 聚焦时在按钮**左侧**展开音量条（往左展开才不会顶出导航栏右边缘）；
 * - 点击切换播放 / 暂停，播放中带一圈呼吸光环 + 主色描边；
 * - 默认暂停：浏览器会拦截自动播放，绝不开机自响。
 *
 * 文件实际是 MP4/AAC 容器（扩展名误标 mp3），已改名为 bgm.m4a 让 Vite 以 audio/mp4 提供，
 * 浏览器据此正确解码 AAC。详情见对话记录。
 */

const BGM_SRC = '/bgm.m4a'

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const { lang } = useLang()
  const t = musicCopy[lang]

  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.6)
  const [open, setOpen] = useState(false)

  // 音量始终同步到 <audio>（默认 0.6，避免一上来就拉满）
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      // play() 返回 Promise，可能被浏览器策略拦截或中断；catch 兜底，不抛未处理 rejection
      const p = audio.play()
      if (p && typeof p.then === 'function') {
        p.then(() => setPlaying(true)).catch(() => setPlaying(false))
      } else {
        setPlaying(true)
      }
    }
    setOpen(true)
  }

  return (
    <div
      className={styles.widget}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      // 键盘用户也要能拿到音量条：聚焦时展开，失焦收起
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <div
        className={`${styles.sliderWrap} ${open ? styles.sliderOpen : ''}`}
        aria-hidden={!open}
      >
        <input
          className={styles.slider}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label={t.volume}
          tabIndex={open ? 0 : -1}
        />
      </div>

      <button
        type="button"
        className={`${styles.button} ${playing ? styles.playing : ''}`}
        onClick={toggle}
        aria-label={playing ? t.pause : t.play}
        aria-pressed={playing}
      >
        <span className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M9 17V5l10-2v12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="6.5" cy="17.5" r="2.5" fill="currentColor" />
            <circle cx="16.5" cy="15.5" r="2.5" fill="currentColor" />
          </svg>
        </span>
        {playing && <span className={styles.pulse} aria-hidden="true" />}
      </button>

      <audio ref={audioRef} src={BGM_SRC} loop preload="none" />
    </div>
  )
}
