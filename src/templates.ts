import type { Material, TemplateId } from './model'

export const TEMPLATES: ReadonlyArray<{ id: TemplateId; label: string }> = [
  { id: 'standard', label: '標準' },
  { id: 'oneline', label: '1 行' },
  { id: 'byshop', label: 'ショップごと' },
]
export const MAX_DESCRIPTION = 5000

export function renderCredits(materials: Material[], templateId: TemplateId): string {
  if (materials.length === 0) return ''
  const lines = ['【使用素材】']
  if (templateId === 'byshop') {
    const groups = new Map<string, Material[]>()
    for (const material of materials) {
      const shop = material.shop.trim()
      const group = groups.get(shop)
      if (group) group.push(material)
      else groups.set(shop, [material])
    }
    for (const [shop, group] of groups) {
      lines.push(`■${shop} 様`)
      for (const material of group) {
        lines.push(`・${material.name}`)
        if (material.url) lines.push(material.url)
      }
    }
  } else {
    for (const material of materials) {
      if (templateId === 'oneline') {
        lines.push(`・${material.name}(${material.shop} 様)${material.url ? ` ${material.url}` : ''}`)
      } else {
        lines.push(`・${material.name} / ${material.shop} 様`)
        if (material.url) lines.push(material.url)
      }
    }
  }
  return lines.join('\n')
}

export function countChars(text: string): number {
  return [...text].length
}
