import type { GalleryItem } from '../../content/gallery'
import styles from './PhotoCard.module.css'

/** 文件名去扩展名并首字母大写：xiyang.jpg → Xiyang */
function toCaption(file: string): string {
  const base = file.replace(/\.[^.]+$/, '')
  return base.charAt(0).toUpperCase() + base.slice(1)
}

/**
 * 网格里的一张照片：白框 + 悬停浮起 + 点击打开大图。
 *
 * 外层是 `<button>`，所以内部只能用**短语内容** —— 不能用 `<figure>` 或 `<div>`，
 * 那在 button 里是非法嵌套（浏览器会把它踢出按钮）。白框用 `<span>` 撑，
 * `display: block` 让它的表现和块级元素一样。
 *
 * 可访问名来自内部 `<img>` 的 `alt`，因此**不**在按钮上再加 `aria-label`：
 * 两者同时存在会让读屏把同一句话念两遍。
 *
 * 内联设置 `aspect-ratio` 是为了在图片解码完成前就占好位。没有它，
 * 每加载一张整堵墙就往下跳一次（CLS）。
 */
export default function PhotoCard({
  photo,
  onOpen,
}: {
  photo: GalleryItem
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      className={styles.card}
      onClick={(event) => {
        /*
         * 这是 `type="button"`，本来就没有默认行为可拦。加这一行是双保险：
         * 万一以后把它换成 <a>（比如走「新标签页打开」的兜底方案），
         * 或者被塞进 <form> 里，这里能挡住跳转/提交导致的滚动。
         */
        event.preventDefault()
        onOpen()
      }}
    >
      <span className={styles.polaroid}>
        <img
          className={styles.image}
          src={photo.thumb}
          alt={photo.alt}
          style={{ aspectRatio: photo.aspect }}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <span className={styles.caption} aria-hidden="true">
          {photo.caption || toCaption(photo.file)}
        </span>
      </span>
    </button>
  )
}
