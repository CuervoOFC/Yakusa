import {
  withDbLock,
  loadEconomyDb,
  saveEconomyDb,
  getSubbotId,
  getUser,
  parseAmount,
  formatMoney,
  economyDecor,
  safeUserTag,
  getCooldown,
  setCooldown,
  msToHuman,
  randInt,
  replyText
} from '../biblioteca/economia.js'

const CD = 20 * 1000

const ICONS = ['🍒', '🍋', '🍇', '🔔', '⭐', '7️⃣']

function roll() {
  return ICONS[randInt(0, ICONS.length - 1)]
}

function payoutMult(a, b, c) {
  // return multiplier (payoutAmount = bet * mult)
  if (a === '7️⃣' && b === '7️⃣' && c === '7️⃣') return 12
  if (a === b && b === c) return 6
  if (a === b || a === c || b === c) return 2
  return 0
}

const handler = async (m, { conn, args }) => {
  const subbotId = getSubbotId(conn)
  const userJid = m?.sender
  const input = args?.[0]

  await withDbLock(subbotId, async () => {
    const db = loadEconomyDb()
    const user = getUser(db, subbotId, userJid)
    const userTag = safeUserTag(conn, m)

    const remain = getCooldown(user, 'slot')
    if (remain > 0) {
      const text = economyDecor({
        title: 'Slot en cooldown.',
        lines: [`> Vuelve en » *${msToHuman(remain)}*`],
        userTag
      })
      saveEconomyDb(db)
      return await replyText(conn, m, text)
    }

    const bet = parseAmount(input, user.wallet)
    if (!bet || bet <= 0) {
      const text = economyDecor({
        title: 'Uso: slot <cantidad>',
        userTag
      })
      saveEconomyDb(db)
      return await replyText(conn, m, text)
    }

    if (bet < 1000) {
      const text = economyDecor({
        title: `Apuesta mínima: ${formatMoney(1000)}`,
        userTag
      })
      saveEconomyDb(db)
      return await replyText(conn, m, text)
    }

    if (user.wallet < bet) {
      const text = economyDecor({
        title: 'No tienes suficiente en la billetera.',
        lines: [`> Te faltan » *${formatMoney(bet - user.wallet)}*`],
        userTag
      })
      saveEconomyDb(db)
      return await replyText(conn, m, text)
    }

    const a = roll()
    const b = roll()
    const c = roll()

    const mult = payoutMult(a, b, c)
    user.stats.slot = (user.stats.slot || 0) + 1
    setCooldown(user, 'slot', CD)

    user.wallet -= bet

    let resultLine = ''
    if (mult <= 0) {
      resultLine = `Perdiste *${formatMoney(bet)}*`
    } else {
      const payoutAmount = bet * mult
      user.wallet += payoutAmount
      resultLine = `Ganaste *${formatMoney(payoutAmount)}* (x${mult})`
    }

    const text = economyDecor({
      title: 'Slot Machine',
      lines: [`> ${a}  |  ${b}  |  ${c}`, `> ${resultLine}`],
      userTag
    })

    saveEconomyDb(db)
    return await replyText(conn, m, text)
  })
}

handler.command = ['slot', 'slots']
handler.tags = ['economy']
handler.help = ['slot <cantidad>', 'slot 50k']

export default handler
