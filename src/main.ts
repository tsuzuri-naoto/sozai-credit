import './style.css'
import { createStorage, type KeyValueStore } from './storage'
import { mountApp } from './ui'
import { copyText } from './clipboard'
import { downloadText } from './download'

let backend: KeyValueStore | null = null
try {
  backend = window.localStorage
} catch {
  // 保存領域にアクセスできない環境でもメモリ上で動かす。
}
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
mountApp(document.getElementById('app')!, {
  storage: createStorage(backend),
  copy: copyText,
  newId,
  download: downloadText,
  confirm: message => window.confirm(message),
  now: () => new Date(),
})
