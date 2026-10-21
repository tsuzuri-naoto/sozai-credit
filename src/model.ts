import { normalizeUrl } from './booth-url'
import { TEMPLATES } from './templates'

// 表記が要るか(配布元の規約)。unknown は「まだ確かめていない」。
export type Requirement = 'required' | 'optional' | 'none' | 'unknown'
export const REQUIREMENTS: ReadonlyArray<{ id: Requirement; label: string }> = [
  { id: 'unknown', label: '未確認' },
  { id: 'required', label: '必須' },
  { id: 'optional', label: '任意' },
  { id: 'none', label: '不要' },
]
// url には URL のほか X の @名前 も入る。fixedText は配布元が決めた表記文で、入っていれば生成した行の代わりにそのまま出す。
export type Material = {
  id: string
  category: string
  name: string
  shop: string
  url: string
  fixedText: string
  requirement: Requirement
  inUse: boolean
}
export type TemplateId = 'standard' | 'oneline' | 'byshop' | 'bycategory'
export type AppState = { version: 2; materials: Material[]; templateId: TemplateId; honorific: boolean }
export const initialState: AppState = { version: 2, materials: [], templateId: 'standard', honorific: false }
export type MaterialInput = { category: string; name: string; shop: string; url: string; fixedText: string; requirement: Requirement }
export type InputError = 'name-required' | 'link-invalid'
export type Result<T> = { ok: true; value: T } | { ok: false; error: InputError }

const HANDLE = /^@[A-Za-z0-9_]{1,15}$/

export function normalizeLink(raw: string): string | null {
  const input = raw.trim()
  if (input === '') return ''
  if (HANDLE.test(input)) return input
  return normalizeUrl(input)
}

export function validateInput(input: MaterialInput): Result<MaterialInput> {
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'name-required' }
  const url = normalizeLink(input.url)
  if (url === null) return { ok: false, error: 'link-invalid' }
  return {
    ok: true,
    value: {
      category: input.category.trim(),
      name,
      shop: input.shop.trim(),
      url,
      fixedText: input.fixedText.replace(/\r\n?/g, '\n').trim(),
      requirement: isRequirement(input.requirement) ? input.requirement : 'unknown',
    },
  }
}

export function addMaterial(state: AppState, input: MaterialInput, newId: () => string): Result<AppState> {
  const result = validateInput(input)
  if (!result.ok) return result
  return { ok: true, value: { ...state, materials: [...state.materials, { id: newId(), ...result.value, inUse: true }] } }
}

export function updateMaterial(state: AppState, id: string, input: MaterialInput): Result<AppState> {
  const result = validateInput(input)
  if (!result.ok) return result
  if (!state.materials.some(material => material.id === id)) return { ok: true, value: state }
  return { ok: true, value: { ...state, materials: state.materials.map(material => material.id === id ? { ...material, ...result.value } : material) } }
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

export function setInUse(state: AppState, id: string | null, inUse: boolean): AppState {
  return { ...state, materials: state.materials.map(material => id === null || material.id === id ? { ...material, inUse } : material) }
}

export function setTemplate(state: AppState, templateId: TemplateId): AppState {
  return { ...state, templateId }
}

export function setHonorific(state: AppState, honorific: boolean): AppState {
  return { ...state, honorific }
}

function isRequirement(value: unknown): value is Requirement {
  return REQUIREMENTS.some(requirement => requirement.id === value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// 1 版(素材名・ショップ名・URL だけ)の素材は、区分なし・未確認・今回使う、として読む。
function sanitizeMaterial(raw: unknown, version: 1 | 2): Material | null {
  if (!isRecord(raw)) return null
  const { id, name, shop, url } = raw
  if (typeof id !== 'string' || typeof name !== 'string' || typeof shop !== 'string' || typeof url !== 'string') return null
  if (version === 1) return { id, category: '', name, shop, url, fixedText: '', requirement: 'unknown', inUse: true }
  const { category, fixedText, requirement, inUse } = raw
  if (typeof category !== 'string' || typeof fixedText !== 'string' || !isRequirement(requirement) || typeof inUse !== 'boolean') return null
  return { id, category, name, shop, url, fixedText, requirement, inUse }
}

export function sanitizeState(raw: unknown): AppState | null {
  if (!isRecord(raw)) return null
  const version = raw.version
  if ((version !== 1 && version !== 2) || !Array.isArray(raw.materials)) return null
  const materials: Material[] = []
  for (const candidate of raw.materials) {
    const material = sanitizeMaterial(candidate, version)
    if (material) materials.push(material)
  }
  const templateId = TEMPLATES.find(template => template.id === raw.templateId)?.id ?? 'standard'
  // 1 版はショップ名に必ず「様」を付けていたので、読み込んだ後も同じ出力になるように付けたままにする。
  const honorific = version === 1 ? true : raw.honorific === true
  return { version: 2, materials, templateId, honorific }
}
