import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { Lang } from '../i18n/dict'
import { LangProvider } from '../i18n/useLang'
import { RouteProvider } from '../router/route'

/**
 * 测试用包裹器。
 *
 * 线上默认语言就是中文，而绝大多数组件测试断言的也是中文文案（标题、按钮、
 * 提示语都按中文写死），所以这里同样**默认按中文**挂载 —— 两边保持一致，
 * 免得出现「测试里是中文、线上是英文」这种测不出问题的偏差。
 * 需要测英文时传 lang="en"。
 *
 * 放在这个文件而不是各测试里重复，是为了将来再加全局 Provider 时只用改一处。
 */
export function withProviders(ui: ReactNode, lang: Lang = 'zh') {
  return (
    <RouteProvider>
      <LangProvider initial={lang}>{ui}</LangProvider>
    </RouteProvider>
  )
}

export function renderWithLang(ui: ReactNode, lang: Lang = 'zh') {
  return render(withProviders(ui, lang))
}
