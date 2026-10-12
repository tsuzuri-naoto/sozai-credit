export function normalizeUrl(raw: string): string | null {
  const input = raw.trim()
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  const host = url.hostname
  if (host !== 'booth.pm' && !host.endsWith('.booth.pm')) return input
  if (host === 'booth.pm' || host === 'www.booth.pm') {
    const item = url.pathname.match(/^\/(?:[a-z]{2}(?:-[A-Za-z]+)?\/)?items\/(\d+)\/?$/)
    if (item) return `https://booth.pm/ja/items/${item[1]}`
  } else {
    const item = url.pathname.match(/^\/items\/(\d+)\/?$/)
    if (item) return `https://${host}/items/${item[1]}`
  }
  return `https://${host}${url.pathname.replace(/\/$/, '')}`
}
