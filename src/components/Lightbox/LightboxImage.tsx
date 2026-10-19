import { useEffect, useRef, useState } from 'react'
import styles from './LightboxImage.module.css'

/**
 * 灯箱里的大图容器（摄影灯箱 / 手稿灯箱共用）。
 *
 * 解决两个具体症状：
 *
 * 1. **白色断层**
 *    只要图片还没加载完，`<img>` 在页面上占的盒子却可能已经由 `aspect-ratio`
 *    定好了尺寸 —— 一块「有尺寸、无内容」的区域。在深色遮罩上，任何不是深色的
 *    底（白 / 透明 / 未初始化）都会露出一条亮色横带，也就是用户说的「断层白条」。
 *    这里把底色锁成与遮罩合成后一致的深色，并让图片**解码完成后才淡入**，
 *    于是加载过程中只可能看到深色，不可能出现白色断层。
 *
 * 2. **从上到下慢慢刷出来**
 *    大图解码是逐行进行的，若图片一到位就直接显示，浏览器会把「解到一半的行」
 *    画出来 —— 视觉上就是自上而下慢慢刷出。这里等 `decode()`（或 load 兜底）
 *    真正完成后再整体淡入，看到的永远是完整的一张图。
 *
 * 顺带解决的还有「点左右切换时卡」：切图瞬间旧图已经卸下、新图还没解码，
 *    中间是空白。这里保留框体（尺寸不变），视觉上是「换图」而不是「塌陷再撑开」。
 *
 * ⚠️ 尺寸策略刻意与原样式一致（90vw / 90vh、object-fit: contain），不改变任何
 *    既有视觉表现 —— 只是把它包进一个锁了 aspect-ratio 的容器里。
 */

/** 图片解码完成后的显示状态 */
type Status = 'loading' | 'ready' | 'error'

export default function LightboxImage({
  src,
  alt,
  /** 宽高比（宽 / 高）。有值才锁框体，避免无数据的图把容器压成 0 高。 */
  aspect,
  /** 图未解码时的占位底色，需与所在遮罩的合成色一致。 */
  placeholder,
}: {
  src: string
  alt: string
  aspect?: number
  placeholder: string
}) {
  const [status, setStatus] = useState<Status>('loading')
  /**
   * 实际生效的宽高比。
   *
   * 优先用调用方给的数据（清单里的 aspect，无需等图）；
   * 没有数据的（手稿灯箱只拿到一串 URL）就在解码完成后从 naturalWidth/naturalHeight
   * 量出来补上 —— 量到之后锁死框体，下次切图就不会再抖。
   */
  const [measuredAspect, setMeasuredAspect] = useState<number | null>(null)
  const effectiveAspect = aspect ?? measuredAspect ?? undefined
  const imgRef = useRef<HTMLImageElement>(null)

  // 换图时立刻回到「加载中」：新图尚未解码，不能沿用上一张的 ready 态
  useEffect(() => {
    setStatus('loading')
    setMeasuredAspect(null)
  }, [src])

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    let cancelled = false

    /**
     * 走 decode()：它 resolve 时图片已**完整解码**，可以直接一次性画出来，
     * 不会中途露出半张。旧浏览器没有 decode() 时退化为 complete 判断。
     */
    const settle = (ok: boolean) => {
      if (cancelled) return
      // 顺手量出真实宽高比，供「清单里没有 aspect」的图锁框体
      if (ok && !aspect && img.naturalWidth > 0 && img.naturalHeight > 0) {
        setMeasuredAspect(img.naturalWidth / img.naturalHeight)
      }
      setStatus(ok ? 'ready' : 'error')
    }

    if (typeof img.decode === 'function') {
      img.decode().then(
        () => settle(true),
        () => {
          // decode 失败不代表图坏（src 变更 / 中断等），退回 load 事件判断
          if (cancelled) return
          settle(img.complete && img.naturalWidth > 0)
        },
      )
    } else if (img.complete && img.naturalWidth > 0) {
      settle(true)
    }

    return () => {
      cancelled = true
    }
  }, [src])

  /** decode() 不可用或没等到时的兜底：load 事件到达也算就绪 */
  const handleLoad = () => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth > 0) setStatus('ready')
  }

  const handleError = () => setStatus('error')

  return (
    <div
      className={styles.frame}
      data-status={status}
      style={{
        // 锁死宽高比：图没到之前框体尺寸已确定，换图不塌陷、加载中也不露白
        ...(effectiveAspect ? { aspectRatio: String(effectiveAspect) } : {}),
        // 占位底色锁成遮罩色 —— 这是「绝不允许白色断层」的最后一道保险
        background: placeholder,
      }}
    >
      <img
        ref={imgRef}
        className={styles.image}
        src={src}
        alt={alt}
        decoding="async"
        fetchPriority="high"
        draggable={false}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}