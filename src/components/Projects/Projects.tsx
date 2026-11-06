import { useCallback, useState } from 'react'
import { projectModules, type ProjectModule } from '../../content/projectsData'
import { projectsCopy } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import section from '../../styles/section.module.css'
import Epigraph from '../Epigraph/Epigraph'
import type { LightboxPhoto } from '../Gallery/PhotoLightbox'
import PhotoLightbox from '../Gallery/PhotoLightbox'
import DownloadButton from '../DownloadButton/DownloadButton'
import ModuleGallery from './ModuleGallery'
import ProjectCarousel from './ProjectCarousel'
import styles from './Projects.module.css'

/**
 * 「作品集」——独立整页（/projects）。
 *
 * 页面结构由 `content/projectsData.ts` 的 `projectModules` 数组驱动：
 * 组件只负责按 kind 渲染（carousel → 单张轮播，gallery → 白框卡片网格），
 * 以后加新证书 / 新项目模块 = 往数组里加一项，这里一行都不用改。
 *
 * 两个模块现在都是轮播：
 *   - PPT 案例：复用的幻灯片轮播，底部挂「下载完整 PDF」按钮（紧贴轮播正下方）。
 *   - AI 认证：完全复用同一套轮播逻辑，一次只显示一张证书，左右箭头切换，
 *     下方页码按图片数量自动生成（如 01 / 07）。
 *
 * 点击任何模块里的图（课件页或证书）都会打开与光影共用的 PhotoLightbox
 * 放大查看 —— 灯箱自带滚轮缩放、双击复位，证书上的小字也能看清。
 */

/** 灯箱打开时记着「是哪个模块的哪张图」，换页/关闭都在这一份状态上操作 */
interface LightboxState {
  photos: LightboxPhoto[]
  index: number
}

export default function Projects() {
  const { lang } = useLang()
  const t = projectsCopy[lang]
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)

  const closeLightbox = useCallback(() => setLightbox(null), [])
  const changeLightboxIndex = useCallback((index: number) => {
    setLightbox((state) => (state ? { ...state, index } : state))
  }, [])

  const openModuleLightbox = useCallback((module: ProjectModule, index: number) => {
    /* 灯箱只要 src + alt；alt 跟随当前语言，缺英文时回落中文 */
    const photos: LightboxPhoto[] = module.images.map((image) => ({
      src: image.src,
      alt: lang === 'zh' ? image.alt : (image.altEn ?? image.alt),
    }))
    setLightbox({ photos, index })
  }, [lang])

  return (
    <section id="projects" className={section.section} aria-labelledby="projects-title">
      <div className={section.inner}>
        {/* 页头：小标 + 主标题 + 一行副标题。
            只在作品集页使用这里的专属样式（styles.head/heading/subtitle），
            不动 section.module.css 的通用页头，其它整页观感保持不变。 */}
        <header className={styles.head}>
          <p className={section.eyebrow} data-reveal>
            {t.eyebrow}
          </p>
          {/* 独立整页，页面上只有这一个 h1（模块标题都是 h2） */}
          <h1 className={styles.heading} id="projects-title" data-reveal>
            {t.heading}
          </h1>
          <p className={styles.subtitle} data-reveal>
            {t.subtitle}
          </p>
        </header>

        {projectModules.map((module, index) => (
          <section
            key={module.id}
            /* 第一个模块紧接页头：去掉顶部分隔线与多余留白，
               避免标题和「PPT 案例」之间空出一大块 */
            className={`${styles.module} ${index === 0 ? styles.moduleFirst : ''}`}
            aria-labelledby={`${module.id}-title`}
          >
            <h2 className={styles.moduleTitle} id={`${module.id}-title`} data-reveal>
              {module.title[lang]}
            </h2>
            {module.lead && (
              <p className={styles.moduleLead} data-reveal>
                {module.lead[lang]}
              </p>
            )}

            <div className={styles.moduleBody} data-reveal>
              {module.kind === 'carousel' ? (
                module.images.length === 0 ? (
                  <ProjectsEmpty />
                ) : (
                  <ProjectCarousel
                    projects={module.images}
                    onSlideClick={(index) => openModuleLightbox(module, index)}
                  />
                )
              ) : (
                <ModuleGallery
                  images={module.images}
                  onImageClick={(index) => openModuleLightbox(module, index)}
                />
              )}
            </div>

            {/* 「下载完整 PDF」紧贴轮播正下方，宽度与图片容器对齐，视觉上合为一体 */}
            {module.download && (
              <div className={styles.moduleActions}>
                <DownloadButton
                  href={module.download.href}
                  download={module.download.fileName}
                  label={t.download}
                  meta={`${t.pdfLabel} · ${module.images.length}${t.pagesSuffix}`}
                  ariaLabel={t.downloadHint}
                  testId="portfolio-download"
                />
              </div>
            )}
          </section>
        ))}

        {/* 寄语统一放在页面最下方：PPT 与证书都看完之后 */}
        <Epigraph text={t.epigraph} />
      </div>

      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onIndexChange={changeLightboxIndex}
          onClose={closeLightbox}
        />
      )}
    </section>
  )
}

/**
 * 空态。
 *
 * 和光影空态一样，这不是给访客看的，而是给站主的故障提示：页面上没有作品时，
 * 第一件想确认的事就是「我是不是忘了跑那条命令」。直接把命令写在这里，比翻文档快。
 *
 * 导出是为了能单独测 —— 否则只能靠「清单恰好为空」来触发它，
 * 一旦有了作品，这条分支就再也测不到了。
 */
export function ProjectsEmpty() {
  const { lang } = useLang()
  const t = projectsCopy[lang]

  return (
    <div className={styles.empty} data-reveal>
      <p className={styles.emptyTitle}>{t.emptyTitle}</p>
      <p className={styles.emptyHint}>
        {t.emptyHintPre}
        <code>assets-source/projects/</code>
        {t.emptyHintMid}
        <code>npm run projects:build</code>
      </p>
    </div>
  )
}
