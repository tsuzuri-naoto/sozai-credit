import { normalizeUrl } from './booth-url'
import { TEMPLATES } from './templates'

export type Material = { id: string; name: string; shop: string; url: string }
export type TemplateId = 'standard' | 'oneline' | 'byshop'
export type AppState = { version: 1; materials: Material[]; templateId: TemplateId }
export const initialState: AppState = { version: 1, materials: [], templateId: 'standard' }
export type MaterialInput = { name: string; shop: string; url: string }
export type InputError = 'name-required' | 'shop-required' | 'url-invalid'
export type Result<T> = { ok: true; value: T } | { ok: false; error: InputError }

export function validateInput(input: MaterialInput): Result<MaterialInput> {
  const name = input.name.trim()
  const shop = input.shop.trim()
  const rawUrl = input.url.trim()
  if (!name) return { ok: false, error: 'name-required' }
  if (!shop) return { ok: false, error: 'shop-required' }
  const url = rawUrl === '' ? '' : normalizeUrl(rawUrl)
  if (url === null) return { ok: false, error: 'url-invalid' }
  return { ok: true, value: { name, shop, url } }
}

export function addMaterial(state: AppState, input: MaterialInput, newId: () => string): Result<AppState> {
  const result = validateInput(input)
  if (!result.ok) return result
  return { ok: true, value: { ...state, materials: [...state.materials, { id: newId(), ...result.value }] } }
}

export function updateMaterial(state: AppState, id: string, input: MaterialInput): Result<AppState> {
  const result = validateInput(input)
  if (!result.ok) return result
  if (!state.materials.some(material => material.id === id)) return { ok: true, value: state }
  return { ok: true, value: { ...state, materials: state.materials.map(material => material.id === id ? { id, ...result.value } : material) } }
}

export function removeMaterial(state: AppState, id: string): AppState {
  return { ...state, materials: state.materials.filter(material => material.id !== id) }
}

export function moveMaterial(state: AppState, id: string, delta: -1 | 1): AppState {
  const from = state.materials.findIndex(material => material.id === id)
  const to = from + delta
  if (from < 0 || to < 0 || to >= state.materials.length) return state
  const materials = [...state.materials]
  ;[materials[from], materials[to]] = [materials[to], materials[from]]
  return { ...state, materials }
}

export function setTemplate(state: AppState, templateId: TemplateId): AppState {
  return { ...state, templateId }
}

export function sanitizeState(raw: unknown): AppState | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const data = raw as Record<string, unknown>
  if (data.version !== 1 || !Array.isArray(data.materials)) return null
  const materials: Material[] = []
  for (const candidate of data.materials) {
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) continue
    const material = candidate as Record<string, unknown>
    if (typeof material.id === 'string' && typeof material.name === 'string' && typeof material.shop === 'string' && typeof material.url === 'string') {
      materials.push({ id: material.id, name: material.name, shop: material.shop, url: material.url })
    }
  }
  const templateId = TEMPLATES.find(template => template.id === data.templateId)?.id ?? 'standard'
  return { version: 1, materials, templateId }
}
