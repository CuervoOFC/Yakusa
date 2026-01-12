import yts from 'yt-search'

const MAX_SECONDS = 90 * 60
const HTTP_TIMEOUT_MS = 90 * 1000

function parseDurationToSeconds(d) {
  if (d == null) return null
  if (typeof d === 'number' && Number.isFinite(d)) return Math.max(0, Math.floor(d))
  const s = String(d).trim()
  if (!s) return null
  if (/^\d+$/.test(s)) return Math.max(0, parseInt(s, 10))
  const parts = s.split(':').map((x) => x.trim()).filter(Boolean)
  if (!parts.length || parts.some((p) => !/^\d+$/.test(p))) return null
  let sec = 0
  for (const p of parts) sec = sec * 60 + parseInt(p, 10)
  return Number.isFinite(sec) ? sec : null
}

function formatErr(err, maxLen = 1500) {
  const e = err ?? 'Error desconocido'
  let msg = ''
  if (e instanceof Error) msg = e.stack || `${e.name}: ${e.message}`
  else if (typeof e === 'string') msg = e
  else {
    try { msg = JSON.stringify(e, null, 2) } catch { msg = String(e) }
  }
  msg = String(msg || 'Error desconocido').trim()
  if (msg.length > maxLen) msg = msg.slice(0, maxLen) + '\n... (recortado)'
  return msg
}

async function fetchJson(url, timeoutMs = HTTP_TIMEOUT_MS) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' }
    })
    const text = await res.text().catch(() => '')
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { data = null }
    if (!res.ok) {
      const msg = data?.message || data?.error || text || `HTTP ${res.status}`
      throw new Error(`HTTP ${res.status}: ${String(msg).slice(0, 400)}`)
    }
    if (data == null) throw new Error('Respuesta JSON inválida')
    return data
  } finally {
    clearTimeout(t)
  }
}

async function fetchBuffer(url, timeoutMs = HTTP_TIMEOUT_MS) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0' } })
    if (!res.ok) throw new Error(`No se pudo bajar el audio (HTTP ${res.status})`)
    const ab = await res.arrayBuffer()
    return Buffer.from(ab)
  } finally {
    clearTimeout(t)
  }
}

function guessMimeFromUrl(fileUrl = '') {
  let ext = ''
  try { ext = new URL(fileUrl).pathname.split('.').pop() || '' } catch { ext = String(fileUrl).split('.').pop() || '' }
  ext = '.' + String(ext).toLowerCase().replace(/[^a-z0-9]/g, '')
  if (ext === '.m4a') return 'audio/mp4'
  if (ext === '.opus') return 'audio/ogg; codecs=opus'
  if (ext === '.webm') return 'audio/webm'
  return 'audio/mpeg'
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const chatId = m?.chat || m?.key?.remoteJid
  if (!chatId) return

  if (!text) {
    return conn.sendMessage(
      chatId,
      { text: `「✦」Escribe el nombre o link del video.\n> ✐ Ejemplo » *${usedPrefix + command} lovely*` },
      { quoted: m }
    )
  }

  await conn.sendMessage(chatId, { react: { text: '🕒', key: m.key } }).catch(() => {})

  let ytUrl = text.trim()
  let ytInfo = null

  try {
    if (!/youtu\.be|youtube\.com/i.test(ytUrl)) {
      const search = await yts(ytUrl)
      const first = search?.videos?.[0]
      if (!first) {
        await conn.sendMessage(chatId, { text: '「✦」No se encontraron resultados.' }, { quoted: m })
        return
      }
      ytInfo = first
      ytUrl = first.url
    } else {
      const search = await yts({ query: ytUrl, pages: 1 })
      if (search?.videos?.length) ytInfo = search.videos[0]
    }
  } catch (e) {
    await conn.sendMessage(chatId, { text: `「✦」Error buscando en YouTube.\n\n> 🧩 Error:\n\`\`\`\n${formatErr(e)}\n\`\`\`` }, { quoted: m })
    return
  }

  const durSec = parseDurationToSeconds(ytInfo?.duration?.seconds) ?? parseDurationToSeconds(ytInfo?.seconds) ?? parseDurationToSeconds(ytInfo?.duration) ?? parseDurationToSeconds(ytInfo?.timestamp)
  if (durSec && durSec > MAX_SECONDS) {
    await conn.sendMessage(chatId, { text: `「✦」Audio muy largo.\n> Máx: ${Math.floor(MAX_SECONDS / 60)} min.` }, { quoted: m })
    return
  }

  const title = ytInfo?.title || 'Audio'
  const author = ytInfo?.author?.name || ytInfo?.author || 'Desconocido'
  const duration = ytInfo?.timestamp || 'Desconocida'
  const thumbnail = ytInfo?.thumbnail

  const caption = `「✦」Enviando *${title}*\n\n` +
    `> ❀ Canal » *${author}*\n` +
    `> ⴵ Duración » *${duration}*\n` +
    `> 🜸 Link » ${ytUrl}`

  try {
    if (thumbnail) await conn.sendMessage(chatId, { image: { url: thumbnail }, caption }, { quoted: m })
    else await conn.sendMessage(chatId, { text: caption }, { quoted: m })
  } catch {}

  const apiKey = globalThis?.apikey
  let directUrl = null
  let apiTitle = title

  // --- INTENTO 1: API ADONIX ---
  if (apiKey) {
    try {
      const apiUrl = `https://api-adonix.ultraplus.click/download/ytaudio?apikey=${encodeURIComponent(String(apiKey))}&url=${encodeURIComponent(String(ytUrl))}`
      const apiResp = await fetchJson(apiUrl, HTTP_TIMEOUT_MS)
      if (apiResp?.status && apiResp?.data?.url) {
        directUrl = String(apiResp.data.url)
        apiTitle = apiResp?.data?.title || title
      }
    } catch (e) {
      console.log("Adonix falló, intentando Gawrgura...")
    }
  }

  // --- INTENTO 2: API GAWRGURA ---
  if (!directUrl) {
    try {
      const guraUrl = `https://gawrgura-api.onrender.com/download/ytmp3?url=${encodeURIComponent(String(ytUrl))}`
      const guraResp = await fetchJson(guraUrl, HTTP_TIMEOUT_MS)
      if (guraResp?.status && guraResp?.result) {
        directUrl = guraResp.result
      }
    } catch (e) {
      console.log("Gawrgura falló, intentando Smasachika...")
    }
  }

  // --- INTENTO 3: API SMASACHIKA ---
  if (!directUrl) {
    try {
      const smasaUrl = `https://smasachika.alyabot.xyz/download_audio?url=${encodeURIComponent(String(ytUrl))}`
      const smasaResp = await fetchJson(smasaUrl, HTTP_TIMEOUT_MS)
      if (smasaResp?.file_url) {
        directUrl = smasaResp.file_url
      }
    } catch (e) {
      await conn.sendMessage(chatId, { text: `「✦」Error en todos los servidores de descarga.\n\n> 🧩 Detalle:\n\`\`\`\n${formatErr(e)}\n\`\`\`` }, { quoted: m })
      return
    }
  }

  if (!directUrl) return

  // --- DESCARGA Y ENVÍO DEL BUFFER ---
  try {
    const audioBuffer = await fetchBuffer(directUrl, HTTP_TIMEOUT_MS)
    const mime = guessMimeFromUrl(directUrl)

    await conn.sendMessage(
      chatId,
      { audio: audioBuffer, mimetype: mime, fileName: `${apiTitle}.mp3` },
      { quoted: m }
    )
    await conn.sendMessage(chatId, { react: { text: '✔️', key: m.key } }).catch(() => {})
  } catch (e) {
    await conn.sendMessage(chatId, { text: `「✦」Error al descargar/enviar el archivo final.\n\n> 🧩 Error:\n\`\`\`\n${formatErr(e)}\n\`\`\`` }, { quoted: m })
  }
}

handler.help = ['play <texto|link>']
handler.tags = ['multimedia']
handler.command = ['play']

export default handler
