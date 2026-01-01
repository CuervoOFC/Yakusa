const handler = async (m, ctx) => {
  const { conn, from, isGroup, text, usedPrefix, command } = ctx

  if (!isGroup) {
    await conn.sendMessage(from, { text: '「✦」Este comando solo funciona en grupos.' }, { quoted: m })
    return
  }

  const desc = String(text || '').trim()
  if (!desc) {
    await conn.sendMessage(from, { text: `「✦」Uso: *${usedPrefix || '.'}${command} <nueva descripción>*` }, { quoted: m })
    return
  }

  try {
    await conn.groupUpdateDescription(from, desc)
    await conn.sendMessage(from, { text: '「✿」Descripción actualizada.' }, { quoted: m })
  } catch {
    await conn.sendMessage(from, { text: '「✦」No pude actualizar la descripción.' }, { quoted: m })
  }
}

handler.command = ['setgpdesc', 'setdescgc', 'gpdesc']
handler.tags = ['group']
handler.help = ['setgpdesc <texto>']

handler.useradm = true
handler.botadm = true

export default handler