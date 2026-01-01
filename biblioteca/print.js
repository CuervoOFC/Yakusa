import { WAMessageStubType } from '@whiskeysockets/baileys'
import chalk from 'chalk'

function humanSize(bytes = 0) {
  const b = Math.max(0, Number(bytes || 0))
  if (b === 0) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(b) / Math.log(1000))
  const val = (b / 1000 ** i).toFixed(1)
  return `${val} ${u[i] || 'B'}`
}

function getFileSizeFromMsg(msg, text = '') {
  try {
    const m = msg?.message || {}
    const key = Object.keys(m)[0]
    const body = key ? m[key] : null
    if (!body) return (text || '').length
    const fl = body?.fileLength
    if (typeof fl === 'number') return fl
    if (fl && typeof fl === 'object' && typeof fl.low === 'number') return fl.low
    if (typeof body?.vcard === 'string') return body.vcard.length
    if (body?.axolotlSenderKeyDistributionMessage?.length)
      return body.axolotlSenderKeyDistributionMessage.length
    return (text || '').length
  } catch {
    return (text || '').length
  }
}

function formatDate(ts) {
  const t = Number(ts || 0)
  const date = new Date(t > 10_000_000_000 ? t : t * 1000)
  try {
    return date.toLocaleDateString('es-ES', {
      timeZone: 'America/Tegucigalpa',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function prettyType(type = '') {
  const t = String(type || '').replace(/message$/i, '')
  if (!t) return 'Desconocido'
  return t
    .replace(/^./, (v) => v.toUpperCase())
    .replace('audio', 'Audio')
    .replace('sticker', 'Sticker')
}

function cleanText(t = '') {
  return String(t || '').replace(/\u200e+/g, '')
}

function mdPretty(text = '') {
  const mdRegex =
    /(?<=(?:^|[\s\n])\S?)(?:([*_~`])(?!`)(.+?)\1|```((?:.|[\n\r])+?)```|`([^`]+?)`)(?=\S?(?:[\s\n]|$))/g
  const mdFormat = (depth = 3) => (_, type, tx, monospace) => {
    const map = { _: 'italic', '*': 'bold', '~': 'strikethrough', '`': 'bgGray' }
    const raw = (tx || monospace || '').replace(/`/g, '')
    const fmt = map[type]
    if (!fmt || depth < 1 || !chalk[fmt]) return raw
    return chalk[fmt](raw.replace(mdRegex, mdFormat(depth - 1)))
  }
  return String(text || '').replace(mdRegex, mdFormat(3))
}

export default async function printMessage({ msg, conn, from, sender, isGroup, type, text }) {
  try {
    const meJid = conn?.user?.jid || conn?.user?.id || ''
    const botNum = meJid ? '+' + meJid.replace(/@s\.whatsapp\.net$/i, '') : '+Desconocido'
    const botName = conn?.user?.name || conn?.user?.verifiedName || 'Bot'
    const identity =
      globalThis?.conn?.user?.jid && globalThis.conn.user.jid === conn?.user?.jid ? '(Principal)' : '(Sub-Bot)'

    const senderPretty = '+' + String(sender || '').replace(/@s\.whatsapp\.net$/i, '')
    const chatPretty = (isGroup ? 'Grupo' : 'Privado') + ' ~ ' + String(from || '')

    const event = msg?.messageStubType ? WAMessageStubType[msg.messageStubType] : 'Ninguno'
    const bytes = getFileSizeFromMsg(msg, text)
    const sizeLine = `${bytes} B [${humanSize(bytes)}]`
    const dateLine = formatDate(msg?.messageTimestamp?.low || msg?.messageTimestamp || Date.now())

    console.log(
      `${chalk.hex('#FE0041').bold('╭────────────────────────────────···')}
${chalk.hex('#FE0041').bold('│')}${chalk.redBright('Bot:')} ${chalk.greenBright(botNum)} ~ ${chalk.magentaBright(botName)} ${chalk.cyanBright(identity)}
${chalk.hex('#FE0041').bold('│')}${chalk.yellowBright('Fecha:')} ${chalk.blueBright(dateLine)}
${chalk.hex('#FE0041').bold('│')}${chalk.greenBright('Evento:')} ${chalk.redBright(event || 'Ninguno')}
${chalk.hex('#FE0041').bold('│')}${chalk.magentaBright('Peso:')} ${chalk.yellowBright(sizeLine)}
${chalk.hex('#FE0041').bold('│')}${chalk.blueBright('Remitente:')} ${chalk.redBright(senderPretty)}
${chalk.hex('#FE0041').bold('│')}${chalk.cyanBright(`Chat ${isGroup ? 'Grupal' : 'Privado'}:`)} ${chalk.greenBright(chatPretty)}
${chalk.hex('#FE0041').bold('│')}${chalk.magentaBright('Tipo:')} ${chalk.yellowBright(prettyType(type))}
${chalk.hex('#FE0041').bold('╰───────────────────···')}`
    )

    const t = cleanText(text)
    if (t) console.log(mdPretty(t))
    console.log()
  } catch (e) {
    console.error(e)
  }
}
