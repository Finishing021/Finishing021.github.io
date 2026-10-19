import styles from './PageSkeleton.module.css'

/**
 * 懒加载整页到位前的兜底骨架屏（缺陷三）。
 *
 * 关键诉求：图片 / 整页代码还没加载出来前，显示**淡蓝色渐变**骨架屏，
 * 拒绝纯白屏——纯白在手机端很容易被当成「卡死 / 没加载出来」。
 *
 * 这里用一组流光占位块模拟「标题 + 图片网格 + 文字行」的页面轮廓，
 * 让用户一眼看懂「内容在来」，同时和全站淡蓝主色保持一致。
 */
export default function PageSkeleton() {
  const cards = Array.from({ length: 6 })
  const lines = Array.from({ length: 4 })

  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={`${styles.header} ${styles.shimmer}`} />
      <div className={styles.grid}>
        {cards.map((_, i) => (
          <div key={i} className={`${styles.card} ${styles.shimmer}`} />
        ))}
      </div>
      <div className={styles.lines}>
        {lines.map((_, i) => (
          <div
            key={i}
            className={`${styles.line} ${styles.shimmer} ${
              i === lines.length - 1 ? styles.lineShort : ''
            }`}
          />
        ))}
      </div>
    </div>
  )
}
