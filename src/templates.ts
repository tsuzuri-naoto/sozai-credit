import type { Material, TemplateId } from './model'

export const TEMPLATES: ReadonlyArray<{ id: TemplateId; label: string }> = [
  { id: 'standard', label: '標準' },
  { id: 'oneline', label: '1 行' },
  { id: 'byshop', label: 'ショップごと' },
  { id: 'bycategory', label: '区分ごと' },
]
export const MAX_DESCRIPTION = 5000
export type RenderOptions = { honorific: boolean }

const OTHER_GROUP = 'その他'

// 出てきた順にまとめる。キーが空のもの(ショップ名・区分なし)は「その他」として最後に置く。
function groupBy(materials: Material[], key: (material: Material) => string): Array<[string, Material[]]> {
  const groups = new Map<string, Material[]>()
  for (const material of materials) {
    const name = key(material)
    const group = groups.get(name)
    if (group) group.push(material)
    else groups.set(name, [material])
  }
  const named = [...groups].filter(([name]) => name !== '')
  const rest = groups.get('')
  return rest ? [...named, ['', rest]] : named
}

export function renderCredits(materials: Material[], templateId: TemplateId, options: RenderOptions): string {
  const used = materials.filter(material => material.inUse)
  if (used.length === 0) return ''
  const sama = options.honorific ? ' 様' : ''
  const label = (material: Material) => material.category ? `${material.category}: ${material.name}` : material.name
  const lines = ['【使用素材】']
  const pushEntry = (material: Material, entry: () => string[]) => {
    lines.push(...(material.fixedText ? material.fixedText.split('\n') : entry()))
  }
  const withUrl = (line: string, material: Material) => material.url ? [line, material.url] : [line]

  if (templateId === 'byshop' || templateId === 'bycategory') {
    const byShop = templateId === 'byshop'
    for (const [name, group] of groupBy(used, material => byShop ? material.shop : material.category)) {
      lines.push(name === '' ? `■${OTHER_GROUP}` : byShop ? `■${name}${sama}` : `■${name}`)
      for (const material of group) {
        pushEntry(material, () => {
          if (byShop) return withUrl(`・${label(material)}`, material)
          return withUrl(`・${material.name}${material.shop ? ` / ${material.shop}${sama}` : ''}`, material)
        })
      }
    }
  } else {
    for (const material of used) {
      pushEntry(material, () => {
        if (templateId === 'oneline') {
          return [`・${label(material)}${material.shop ? `(${material.shop}${sama})` : ''}${material.url ? ` ${material.url}` : ''}`]
        }
        return withUrl(`・${label(material)}${material.shop ? ` / ${material.shop}${sama}` : ''}`, material)
      })
    }
  }
  return lines.join('\n')
}

export function countChars(text: string): number {
  return [...text].length
}
