import axios from 'axios'

const MAX_BYTES = 25 * 1024 * 1024

function safeStr(x) {
  return String(x ?? '')
}

function parseFileNameFromDisposition(cd = '') {
  const s = safeStr(cd)
  const m1 = s.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  if (m1?.[1]) return decodeURIComponent(m1[1].replace(/^"|"$/g, '').trim())
  const m2 = s.match(/filename\s*=\s*([^;]+)/i)
  if (m2?.[1]) return m2[1].replace(/^"|"$/g, '').trim()
  return ''
}

function fileNameFromUrl(url = '') {
  try {
    const u = new URL(url)
    const p = u.pathname || ''
    const base = p.split('/').filter(Boolean).pop() || ''
    return decodeURIComponent(base)
  } catch {
    return ''
  }
}

function isHttpUrl(u = '') {
  try {
    const x = new URL(u)
    return x.protocol === 'http:' || x.protocol === 'https:'
  } catch {
    return false
  }
}

function hasExt(name = '') {
  return /\.[a-z0-9]{1,8}$/i.test(String(name || ''))
}

function extFromMime(mime = '') {
  const m = safeStr(mime).toLowerCase()
  if (m.includes('mp4')) return '.mp4'
  if (m.includes('webm')) return '.webm'
  if (m.includes('quicktime')) return '.mov'
  if (m.includes('mpeg')) return '.mp3'
  if (m.includes('ogg')) return '.ogg'
  if (m.includes('wav')) return '.wav'
  if (m.includes('png')) return '.png'
  if (m.includes('jpeg')) return '.jpg'
  if (m.includes('gif')) return '.gif'
  if (m.includes('pdf')) return '.pdf'
  if (m.includes('zip')) return '.zip'
  return ''
}

function ensureName(name = '', mime = '') {
  const n = safeStr(name).trim()
  if (!n) return `file${extFromMime(mime) || ''}` || 'file'
  if (hasExt(n)) return n
  return `${n}${extFromMime(mime) || ''}`.replace(/\.+$/, '')
}

function looksGenericMime(mime = '') {
  const m = safeStr(mime).toLowerCase().trim()
  return (
    !m ||
    m === 'application/octet-stream' ||
    m === 'binary/octet-stream' ||
    m === 'application/download' ||
    m === 'application/force-download'
  )
}

function sniffMimeFromBuffer(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || [])
  if (b.length < 12) return { mime: '', ext: '' }

  if (b.slice(0, 8).equals(Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]))) {
    return { mime: 'image/png', ext: '.png' }
  }

  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) {
    return { mime: 'image/jpeg', ext: '.jpg' }
  }

  const gifHdr = b.slice(0, 6).toString('ascii')
  if (gifHdr === 'GIF87a' || gifHdr === 'GIF89a') {
    return { mime: 'image/gif', ext: '.gif' }
  }

  if (b.slice(0, 4).toString('ascii') === '%PDF') {
    return { mime: 'application/pdf', ext: '.pdf' }
  }

  if (b[0] === 0x50 && b[1] === 0x4B && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07) && (b[3] === 0x04 || b[3] === 0x06 || b[3] === 0x08)) {
    return { mime: 'application/zip', ext: '.zip' }
  }

  if (b.slice(0, 4).toString('ascii') === 'OggS') {
    return { mime: 'audio/ogg', ext: '.ogg' }
  }

  if (b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WAVE') {
    return { mime: 'audio/wav', ext: '.wav' }
  }
  if (b.slice(0, 3).toString('ascii') === 'ID3' || (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0)) {
    return { mime: 'audio/mpeg', ext: '.mp3' }
  }
  if (b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3) {
    return { mime: 'video/webm', ext: '.webm' }
  }

  if (b.slice(4, 8).toString('ascii') === 'ftyp') {
    return { mime: 'video/mp4', ext: '.mp4' }
  }

  return { mime: '', ext: '' }
}

async function fetchBinary(url) {
  return axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 45000,
    maxRedirects: 10,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    headers: {
      'user-agent':
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      accept: '*/*',
      'cache-control': 'no-store'
    },
    validateStatus: (s) => (s >= 200 && s < 400) || s === 206
  })
}

async function tryHead(url) {
  try {
    const r = await axios.head(url, {
      timeout: 20000,
      maxRedirects: 10,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        accept: '*/*',
        'cache-control': 'no-store'
      },
      validateStatus: (s) => (s >= 200 && s < 400) || s === 206
    })
    return r
  } catch {
    return null
  }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const url = safeStr(text).trim()

  if (!url || !isHttpUrl(url)) {
    return conn.sendMessage(
      m.chat,
      { text: `「✦」Usa: *${usedPrefix + command}* <url>\nEj: *${usedPrefix + command}* https://ejemplo.com/archivo` },
      { quoted: m }
    )
  }

  try {
    m.react?.('🕒').catch?.(() => {})

    const head = await tryHead(url)
    const headLen = Number(head?.headers?.['content-length'] || 0) || 0
    const headTypeRaw = safeStr(head?.headers?.['content-type'] || '')
    const headType = headTypeRaw.split(';')[0].trim()
    const headName = parseFileNameFromDisposition(head?.headers?.['content-disposition'] || '') || fileNameFromUrl(url)

    if (headLen && headLen > MAX_BYTES) {
      const mime = headType || 'application/octet-stream'
      let fileName = ensureName(headName || 'file', mime)
      const lower = mime.toLowerCase()

      m.react?.('✅').catch?.(() => {})

      if (lower.startsWith('video/')) {
        return conn.sendMessage(m.chat, { video: { url }, mimetype: mime, caption: '「✦」' }, { quoted: m })
      }
      if (lower.startsWith('image/')) {
        return conn.sendMessage(m.chat, { image: { url }, mimetype: mime, caption: '「✦」' }, { quoted: m })
      }
      if (lower.startsWith('audio/')) {
        return conn.sendMessage(m.chat, { audio: { url }, mimetype: mime }, { quoted: m })
      }
      return conn.sendMessage(m.chat, { document: { url }, mimetype: mime, fileName }, { quoted: m })
    }
    const res = await fetchBinary(url)
    const rawMime = safeStr(res?.headers?.['content-type'] || headType || 'application/octet-stream')
    const headerMime = rawMime.split(';')[0].trim()

    const cd = res?.headers?.['content-disposition'] || ''
    const nameGuess = parseFileNameFromDisposition(cd) || headName || fileNameFromUrl(url) || 'file'

    const buf = Buffer.from(res.data || [])
    if (!buf.length) throw new Error('Respuesta vacía.')

    let mime = headerMime
    let fileName = nameGuess

    if (looksGenericMime(mime)) {
      const sniff = sniffMimeFromBuffer(buf)
      if (sniff.mime) mime = sniff.mime
      if (!hasExt(fileName) && sniff.ext) fileName = `${fileName}${sniff.ext}`
    }

    if (!hasExt(fileName)) fileName = ensureName(fileName, mime)

    const lower = mime.toLowerCase()

    m.react?.('✅').catch?.(() => {})

    if (lower.startsWith('video/')) {
      return conn.sendMessage(m.chat, { video: buf, mimetype: mime, caption: '「✦」' }, { quoted: m })
    }

    if (lower.startsWith('image/')) {
      return conn.sendMessage(m.chat, { image: buf, mimetype: mime, caption: '「✦」' }, { quoted: m })
    }

    if (lower.startsWith('audio/')) {
      return conn.sendMessage(m.chat, { audio: buf, mimetype: mime }, { quoted: m })
    }

    return conn.sendMessage(m.chat, { document: buf, mimetype: mime, fileName }, { quoted: m })
  } catch (e) {
    m.react?.('❌').catch?.(() => {})
    const msg = e?.response?.data ? safeStr(e.response.data) : (e?.message || String(e))
    return conn.sendMessage(m.chat, { text: `「✦」Error: ${msg}` }, { quoted: m })
  }
}

handler.help = ['get <url>']
handler.tags = ['downloader']
handler.command = ['get']

export default handler