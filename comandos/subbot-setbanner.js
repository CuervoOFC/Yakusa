import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { getSubbotInfo, setSubbotBanner } from '../subbotManager.js'

async function downloadImage(msg) {
  const stream = await downloadContentFromMessage(msg, 'image')
  let buffer = Buffer.from([])
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
  return buffer
}

const handler = async (m, { conn, sender, usedPrefix, command }) => {
  const from = m.key?.remoteJid
  if (!conn?.isSubBot) {
    return await conn.sendMessage(
      from,
      { text: '「✦」Este comando solo funciona dentro de tu subbot.' },
      { quoted: m }
    )
  }

  const info = getSubbotInfo(conn)
  if (!info || info.owner !== sender) {
    return await conn.sendMessage(from, { text: '「✦」Solo el dueño del subbot puede cambiar el banner.' }, { quoted: m })
  }

  const ctx = m?.message?.extendedTextMessage?.contextInfo
  const quoted = ctx?.quotedMessage?.imageMessage || ctx?.quotedMessage?.message?.imageMessage
  const imageMsg = m?.message?.imageMessage || quoted

  if (!imageMsg) {
    return await conn.sendMessage(
      from,
      {
        text:
          '「✦」Responde con una imagen o envíala junto al comando.\n' +
          `> ✐ Ejemplo » *${usedPrefix + command}* (respondiendo a la imagen)`
      },
      { quoted: m }
    )
  }

  try {
    const buffer = await downloadImage(imageMsg)
    const updated = await setSubbotBanner(conn, buffer)
    await conn.sendMessage(
      from,
      {
        text:
          '「✦」Banner actualizado correctamente.'
      },
      { quoted: m }
    )
  } catch (err) {
    const msg = err?.message || 'No se pudo actualizar el banner.'
    await conn.sendMessage(from, { text: `「✦」Error: ${msg}` }, { quoted: m })
  }
}

handler.help = ['setbanner']
handler.tags = ['owner']
handler.command = ['setbanner']

export default handler
