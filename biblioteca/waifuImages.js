import fetch from 'node-fetch'

const IMAGE_RE = /\.(png|jpe?g|webp|gif)$/i

function pickFromArray(arr = []) {
  const list = Array.isArray(arr) ? arr.filter(Boolean).map(String) : []
  if (!list.length) return null
  const imgs = list.filter((u) => IMAGE_RE.test(u))
  const pool = imgs.length ? imgs : list
  return pool[Math.floor(Math.random() * pool.length)] || null
}

async function fallbackSfw() {
 
  try {
    const r = await fetch('https://api.waifu.pics/sfw/waifu', { timeout: 12000 })
    const j = await r.json().catch(() => null)
    if (j?.url) return String(j.url)
  } catch {}

  try {
    const r = await fetch('https://nekos.best/api/v2/waifu?amount=1', { timeout: 12000 })
    const j = await r.json().catch(() => null)
    const u = j?.results?.[0]?.url
    if (u) return String(u)
  } catch {}
  return null
}

export async function getWaifuImageUrl(waifuOrId, resolver = null) {
  let waifu = null

  if (waifuOrId && typeof waifuOrId === 'object') waifu = waifuOrId
  else if (resolver && typeof resolver === 'function') waifu = resolver(String(waifuOrId || ''))

  const direct = pickFromArray(waifu?.img || waifu?.images || [])
  if (direct) return direct

  return await fallbackSfw()
}
