import { addMaterial, updateMaterial, removeMaterial, moveMaterial, setTemplate, type AppState, type InputError } from './model'
import { TEMPLATES, renderCredits, countChars, MAX_DESCRIPTION } from './templates'
import { backupFileName, serializeBackup, parseBackup, type BackupError } from './backup'
import type { AppStorage } from './storage'

const HOME_URL = 'https://tsuzuri-naoto.github.io/'
const SOURCE_URL = 'https://github.com/tsuzuri-naoto/sozai-credit'

export type AppDeps = {
  storage: AppStorage
  copy: (text: string) => Promise<boolean>
  newId: () => string
  download: (fileName: string, text: string) => void
  confirm: (message: string) => boolean
  now: () => Date
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, testId?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (testId) node.dataset.testid = testId
  if (text !== undefined) node.textContent = text
  return node
}

// ホームページと同じ「窓」の形のカード。上の帯にファイル名ふうのラベルを出す。
function win(label: string, body: HTMLElement): HTMLElement {
  const frame = element('section')
  frame.className = 'win'
  const bar = element('div')
  bar.className = 'win-bar'
  bar.setAttribute('aria-hidden', 'true')
  bar.append(element('i'), element('i'), element('i'), element('span', undefined, label))
  body.classList.add('win-body')
  frame.append(bar, body)
  return frame
}

function link(href: string, text: string): HTMLAnchorElement {
  const node = element('a', undefined, text)
  node.href = href
  return node
}

function bracketed(text: string): HTMLParagraphElement {
  const node = element('p')
  node.className = 'eyebrow'
  const open = element('b', undefined, '<#')
  const close = element('b', undefined, '#>')
  open.setAttribute('aria-hidden', 'true')
  close.setAttribute('aria-hidden', 'true')
  node.append(open, document.createTextNode(` ${text} `), close)
  return node
}

function appHeader(): HTMLElement {
  const header = element('header')
  header.className = 'app-header'
  const heading = element('h1', undefined, '素材クレジットメーカー')
  const cursor = element('span')
  cursor.className = 'cursor'
  cursor.setAttribute('aria-hidden', 'true')
  heading.append(cursor)
  const lead = element('p', undefined, '配信や動画で使った素材を登録すると、概要欄に貼る権利表記をまとめて作れます。登録した内容はこのブラウザの中にだけ保存されます。')
  lead.className = 'lead'
  header.append(bracketed('tools / sozai-credit'), heading, lead)
  return header
}

function appFooter(): HTMLElement {
  const footer = element('footer')
  footer.className = 'app-footer'
  const links = element('p')
  links.append(link(HOME_URL, 'ホーム'), document.createTextNode(' / '), link(SOURCE_URL, 'ソース(GitHub)'), document.createTextNode(' / MIT License'))
  footer.append(bracketed('made by 綴 尚音'), links)
  return footer
}

function emptyHint(): HTMLElement {
  const hint = element('p', 'empty-hint', '素材を登録すると、ここに並びます。BOOTH の URL は、商品ページのアドレスをそのまま貼れば短く整えます。')
  hint.className = 'hint'
  return hint
}

function button(testId: string, text: string, action?: () => void): HTMLButtonElement {
  const node = element('button', testId, text)
  node.type = 'button'
  if (action) node.addEventListener('click', action)
  return node
}

const inputErrors: Record<InputError, string> = {
  'name-required': '素材名を入力してください',
  'shop-required': 'ショップ名を入力してください',
  'url-invalid': 'URL は http:// か https:// で始めてください',
}
const backupErrors: Record<BackupError, string> = {
  'invalid-json': '読み込めませんでした。ファイルが壊れているか、JSON ではありません。',
  'not-backup': 'このファイルは素材クレジットメーカーの書き出しファイルではありません。',
}

export function mountApp(root: HTMLElement, deps: AppDeps): void {
  let state = deps.storage.load()
  let editingId: string | null = null
  let copyTimer: ReturnType<typeof setTimeout> | undefined
  const warning = element('p', 'storage-warning', 'この環境では登録内容を保存できません。ページを閉じると消えます。')
  warning.className = 'warning'
  warning.hidden = deps.storage.available
  const columns = element('div')
  columns.className = 'columns'
  const inputColumn = element('div', 'col-input')
  const outputColumn = element('div', 'col-output')
  const form = element('form')
  form.noValidate = true
  form.append(element('h2', undefined, '素材を登録'))

  function field(testId: string, text: string, type: string): HTMLInputElement {
    const label = element('label', undefined, text)
    const input = element('input', testId)
    input.id = testId
    input.type = type
    label.htmlFor = input.id
    form.append(label, input)
    return input
  }
  const nameInput = field('name-input', '素材名', 'text')
  const shopInput = field('shop-input', 'ショップ名', 'text')
  const urlInput = field('url-input', 'URL(任意)', 'url')
  urlInput.placeholder = 'https://booth.pm/ja/items/1234567'
  const submitButton = button('submit-button', '追加')
  submitButton.type = 'submit'
  submitButton.className = 'primary'
  const cancelButton = button('cancel-button', 'キャンセル', resetForm)
  cancelButton.hidden = true
  const formActions = element('div')
  formActions.className = 'actions'
  formActions.append(submitButton, cancelButton)
  const formError = element('p', 'form-error')
  formError.className = 'error'
  formError.setAttribute('role', 'alert')
  formError.hidden = true
  form.append(formActions, formError)

  const listCard = element('div')
  const listHeading = element('h2', undefined, '登録した素材')
  const itemCount = element('span', 'item-count')
  itemCount.className = 'count'
  listHeading.append(itemCount)
  const list = element('ul')
  list.className = 'materials'
  const hint = emptyHint()
  const exportButton = button('export-button', '書き出し', () => {
    backupStatus.textContent = ''
    try {
      const now = deps.now()
      deps.download(backupFileName(now), serializeBackup(state, now))
      backupStatus.textContent = '書き出しました'
    } catch {
      backupStatus.textContent = '書き出せませんでした。もう一度お試しください。'
    }
  })
  const importInput = element('input', 'import-input')
  importInput.type = 'file'
  importInput.accept = '.json,application/json'
  importInput.hidden = true
  const importButton = button('import-button', '読み込み', () => {
    backupStatus.textContent = ''
    importInput.click()
  })
  const backupActions = element('div')
  backupActions.className = 'actions'
  backupActions.append(exportButton, importButton, importInput)
  const backupStatus = element('p', 'backup-status')
  backupStatus.setAttribute('role', 'status')
  listCard.append(listHeading, hint, list, backupActions, backupStatus)
  inputColumn.append(win('new-material', form), win('materials/', listCard))

  const outputCard = element('div')
  const templateFieldset = element('fieldset')
  templateFieldset.append(element('legend', undefined, 'テンプレ'))
  const radios = TEMPLATES.map(template => {
    const label = element('label')
    label.className = 'template-choice'
    const radio = element('input', `template-${template.id}`)
    radio.type = 'radio'
    radio.name = 'template'
    radio.value = template.id
    radio.addEventListener('change', () => {
      if (radio.checked) changeState(setTemplate(state, template.id))
    })
    label.append(radio, document.createTextNode(template.label))
    templateFieldset.append(label)
    return radio
  })
  const outputHeading = element('h2', undefined, 'クレジット文')
  const output = element('textarea', 'output')
  output.readOnly = true
  output.setAttribute('aria-label', 'クレジット文')
  const charCount = element('p', 'char-count')
  charCount.className = 'status-bar'
  const angleWarning = element('p', 'angle-warning', '「<」「>」は YouTube の概要欄に入れられません。素材名・ショップ名から外してください。')
  angleWarning.className = 'warning'
  const copyStatus = element('p', 'copy-status')
  copyStatus.setAttribute('role', 'status')
  const copyButton = button('copy-button', 'コピー')
  copyButton.className = 'primary'
  copyButton.addEventListener('click', async () => {
    if (copyTimer !== undefined) clearTimeout(copyTimer)
    let success = false
    try {
      success = await deps.copy(output.value)
    } catch {
      success = false
    }
    copyStatus.textContent = success ? 'コピーしました' : 'コピーできませんでした。出力欄を選んでコピーしてください'
    if (success) copyTimer = setTimeout(() => { copyStatus.textContent = '' }, 2000)
  })
  outputCard.append(templateFieldset, outputHeading, output, charCount, angleWarning, copyButton, copyStatus)
  outputColumn.append(win('credits.txt', outputCard))
  columns.append(inputColumn, outputColumn)
  root.replaceChildren(appHeader(), warning, columns, appFooter())

  function clearError(): void {
    formError.textContent = ''
    formError.hidden = true
  }
  function resetForm(): void {
    editingId = null
    nameInput.value = ''
    shopInput.value = ''
    urlInput.value = ''
    submitButton.textContent = '追加'
    cancelButton.hidden = true
    clearError()
  }
  function changeState(next: AppState): void {
    state = next
    deps.storage.save(state)
    render()
  }
  function render(): void {
    warning.hidden = deps.storage.available
    list.replaceChildren()
    state.materials.forEach((material, index) => {
      const row = element('li', 'item-row')
      row.dataset.id = material.id
      const name = element('p', 'item-name', material.name)
      name.className = 'material-name'
      row.append(name, element('p', 'item-shop', material.shop))
      if (material.url) row.append(element('p', 'item-url', material.url))
      const up = button('move-up', '▲', () => changeState(moveMaterial(state, material.id, -1)))
      up.disabled = index === 0
      up.setAttribute('aria-label', `${material.name}を1つ上へ`)
      const down = button('move-down', '▼', () => changeState(moveMaterial(state, material.id, 1)))
      down.disabled = index === state.materials.length - 1
      down.setAttribute('aria-label', `${material.name}を1つ下へ`)
      const edit = button('edit', '編集', () => {
        editingId = material.id
        nameInput.value = material.name
        shopInput.value = material.shop
        urlInput.value = material.url
        submitButton.textContent = '更新'
        cancelButton.hidden = false
        clearError()
        nameInput.focus()
      })
      const remove = button('delete', '削除', () => {
        if (editingId === material.id) resetForm()
        changeState(removeMaterial(state, material.id))
      })
      remove.className = 'danger'
      const actions = element('div')
      actions.className = 'actions'
      actions.append(up, down, edit, remove)
      row.append(actions)
      list.append(row)
    })
    itemCount.textContent = `${state.materials.length} 件`
    hint.hidden = state.materials.length > 0
    exportButton.disabled = state.materials.length === 0
    radios.forEach(radio => { radio.checked = radio.value === state.templateId })
    output.value = renderCredits(state.materials, state.templateId)
    const count = countChars(output.value)
    charCount.textContent = `${count} / ${MAX_DESCRIPTION} 文字`
    charCount.dataset.over = String(count > MAX_DESCRIPTION)
    angleWarning.hidden = !/[<>]/.test(output.value)
  }

  form.addEventListener('submit', event => {
    event.preventDefault()
    const input = { name: nameInput.value, shop: shopInput.value, url: urlInput.value }
    const result = editingId === null ? addMaterial(state, input, deps.newId) : updateMaterial(state, editingId, input)
    if (!result.ok) {
      formError.textContent = inputErrors[result.error]
      formError.hidden = false
      return
    }
    resetForm()
    changeState(result.value)
  })
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0]
    if (!file) return
    backupStatus.textContent = ''
    try {
      const result = parseBackup(await file.text(), deps.newId)
      if (!result.ok) {
        backupStatus.textContent = backupErrors[result.error]
        return
      }
      const count = result.value.materials.length
      if (state.materials.length > 0 && !deps.confirm(`今の登録(${state.materials.length} 件)を、読み込んだファイルの内容(${count} 件)で置き換えます。よろしいですか?`)) return
      resetForm()
      changeState(result.value)
      backupStatus.textContent = `読み込みました(${count} 件)`
    } catch {
      backupStatus.textContent = backupErrors['invalid-json']
    } finally {
      importInput.value = ''
    }
  })
  render()
}
