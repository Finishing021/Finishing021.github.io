/** 把 2026-03-28 显示成 2026 / 03 / 28 */
export function formatDate(date: string): string {
  return date.replace(/-/g, ' / ')
}
