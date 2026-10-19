import type { ProjectModuleImage } from '../../content/projectsData'
import { useLang } from '../../i18n/useLang'
import styles from './Projects.module.css'

/**
 * 画廊型模块的通用渲染：白色相框卡片网格。
 *
 * 相框观感与轮播的 frame、光影 / 成长档案的卡片同一套
 * （白底 + 细描边 + 轻微阴影），保证站内视觉不断层。
 * 网格用 auto-fit 自适应列数：宽屏一行多张、窄屏自动折行，
 * 以后往模块里加新图，卡片自动排进来，不需要改任何布局代码。
 *
 * 每张卡片是真实的 <button>：键盘可达，点击回调给父级开灯箱。
 */
export default function ModuleGallery({
  images,
  onImageClick,
}: {
  images: ProjectModuleImage[]
  onImageClick: (index: number) => void
}) {
  const { lang } = useLang()

  return (
    <div className={styles.galleryGrid}>
      {images.map((image, index) => {
        const alt = lang === 'zh' ? image.alt : (image.altEn ?? image.alt)
        const caption = lang === 'zh' ? image.caption : (image.captionEn ?? image.caption)
        return (
          <button
            key={image.src}
            type="button"
            className={styles.galleryCard}
            onClick={() => onImageClick(index)}
            aria-label={alt}
          >
            <img
              className={styles.galleryImage}
              src={image.thumb}
              alt={alt}
              style={{ aspectRatio: image.aspect }}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            {caption && <span className={styles.galleryCaption}>{caption}</span>}
          </button>
        )
      })}
    </div>
  )
}
