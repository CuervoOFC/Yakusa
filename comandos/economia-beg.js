import {
  withDbLock,
  loadEconomyDb,
  saveEconomyDb,
  getSubbotId,
  getUser,
  formatMoney,
  economyDecor,
  safeUserTag,
  getCooldown,
  setCooldown,
  pick,
  randInt,
  replyText
} from '../biblioteca/economia.js'

const CD = 10 * 60 * 1000

const TEXTS = [
  'Te dieron una monedita por ser insistente',
  'Una doña te regaló para el pasaje',
  'Hiciste un show y te aplaudieron',
  'Te cayó una propina inesperada',
  'Un admin se apiadó de ti'
]

const handler = async (m, { conn }) => {
  const subbotId = getSubbotId(conn)
  const userJid = m?.sender

  await withDbLock(subbotId, async () => {
    const db = loadEconomyDb()
    const user = getUser(db, subbotId, userJid)
    const userTag = safeUserTag(conn, m)

    const remain = getCooldown(user, 'beg')
    if (remain > 0) {
      const text = economyDecor({
        title: 'Aún no puedes mendigar.',
        lines: ['> Mira tu tiempo en *.einfo*'],
        userTag
      })
      saveEconomyDb(db)
      return await replyText(conn, m, text)
    }

    user.stats.beg = (user.stats.beg || 0) + 1
    setCooldown(user, 'beg', CD)

    const hit = Math.random() < 0.75
    if (!hit) {
      const text = economyDecor({
        title: 'Hoy no te dieron nada…',
        lines: ['> Intenta luego. (revisa *.einfo*)'],
        userTag
      })
      saveEconomyDb(db)
      return await replyText(conn, m, text)
    }

    const earned = randInt(1500, 20000)
    user.wallet += earned

    const text = economyDecor({
      title: `¡Mendigar completado! +${formatMoney(earned)}`,
      lines: [`> ${pick(TEXTS)} *${formatMoney(earned)}*.`],
      userTag
    })

    saveEconomyDb(db)
    return await replyText(conn, m, text)
  })
}

handler.command = ['beg', 'mendigar', 'limosna']
handler.tags = ['economy']
handler.help = ['beg']

export default handler
