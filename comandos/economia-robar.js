import { jidNormalizedUser } from '@whiskeysockets/baileys'

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
  msToHuman,
  randInt,
  resolveUserJid,
  replyText
} from '../biblioteca/economia.js'

const CD = 20 * 60 * 1000

function normalizeJid(jid = '') {
  return jid ? jidNormalizedUser(jid) : ''
}

function getDecodeJid(conn) {
  return typeof conn?.decodeJid === 'function'
    ? conn.decodeJid.bind(conn)
    : (jid) => normalizeJid(jid)
}

function getParticipantJid(p = {}, decodeJid) {
  const raw = p?.jid || p?.id || p?.participant || ''
  return decodeJid(raw)
}

function getUserId(userId = '') {
  return String(userId || '').split('@')[0]
}

async function resolveLidToPnJid(conn, chatJid, candidateJid) {
  const jid = normalizeJid(candidateJid)
  if (!jid || !jid.endsWith('@lid')) return jid
  if (!chatJid || !String(chatJid).endsWith('@g.us')) return jid
  if (typeof conn?.groupMetadata !== 'function') return jid

  try {
    const meta = await conn.groupMetadata(chatJid)
    const participants = Array.isArray(meta?.participants) ? meta.participants : []

    const found = participants.find(p => {
      const pid = normalizeJid(p?.id || '')
      const plid = normalizeJid(p?.lid || '')
      const pjid = normalizeJid(p?.jid || '')
      return pid === jid || plid === jid || pjid === jid
    })

    const mapped = normalizeJid(found?.jid || '')
    return mapped || jid
  } catch {
    return jid
  }
}

async function pickTargetJid(m, conn) {
  const decodeJid = getDecodeJid(conn)
  const chatJid = decodeJid(m?.chat || m?.key?.remoteJid || m?.from || '')

  const ctx =
    m?.message?.extendedTextMessage?.contextInfo ||
    m?.msg?.contextInfo ||
    {}

  const mentioned =
    m?.mentionedJid ||
    ctx?.mentionedJid ||
    ctx?.mentionedJidList ||
    []

  if (Array.isArray(mentioned) && mentioned.length) {
    const raw = decodeJid(mentioned[0])
    const fixed = await resolveLidToPnJid(conn, chatJid, raw)
    return decodeJid(fixed)
  }

  const text =
    m?.text ||
    m?.body ||
    m?.message?.conversation ||
    m?.message?.extendedTextMessage?.text ||
    ''

  if (conn?.parseMention) {
    const parsed = conn.parseMention(String(text))
    if (parsed?.length) {
      const raw = decodeJid(parsed[0])
      const fixed = await resolveLidToPnJid(conn, chatJid, raw)
      return decodeJid(fixed)
    }
  }

  const quotedCtx =
    m?.quoted?.msg?.contextInfo ||
    m?.quoted?.contextInfo ||
    {}

  const qRaw =
    getParticipantJid(m?.quoted?.participant, decodeJid) ||
    getParticipantJid(ctx?.participant, decodeJid) ||
    getParticipantJid(quotedCtx?.participant, decodeJid)

  if (qRaw) {
    const fixed = await resolveLidToPnJid(conn, chatJid, qRaw)
    return decodeJid(fixed)
  }

  return ''
}

async function ensureUserJid(conn, m, raw = '') {
  const decodeJid = getDecodeJid(conn)
  const chatJid = decodeJid(m?.chat || m?.key?.remoteJid || m?.from || '')

  const s = String(raw || '').trim()
  if (!s) return null

  if (/@(s\.whatsapp\.net|lid|g\.us)$/i.test(s)) {
    const decoded = decodeJid(s)
    const fixed = await resolveLidToPnJid(conn, chatJid, decoded)
    const r = await resolveUserJid(conn, fixed)
    const out = decodeJid(r || fixed)
    return out && !/@lid$/i.test(out) ? out : null
  }

  const num = s.replace(/\D/g, '')
  const jid = num ? `${num}@s.whatsapp.net` : null
  if (!jid) return null

  const r = await resolveUserJid(conn, jid)
  const out = decodeJid(r || jid)
  return out && !/@lid$/i.test(out) ? out : null
}

async function pickVictimJid(m, conn, attackerJid) {
  const decodeJid = getDecodeJid(conn)

  const ctx =
    m?.message?.extendedTextMessage?.contextInfo ||
    m?.msg?.contextInfo ||
    {}

  const mentioned =
    m?.mentionedJid ||
    ctx?.mentionedJid ||
    ctx?.mentionedJidList ||
    []

  const text =
    m?.text ||
    m?.body ||
    m?.message?.conversation ||
    m?.message?.extendedTextMessage?.text ||
    ''

  const parsed = conn?.parseMention ? conn.parseMention(String(text)) : []

  const uniq = [...new Set([...(mentioned || []), ...(parsed || [])])]

  for (const v of uniq) {
    const cand = await ensureUserJid(conn, m, v)
    if (cand && cand !== attackerJid) return cand
  }

  const tokens = String(text).match(/@\d{5,16}/g) || []
  for (const t of tokens) {
    const num = String(t).replace(/\D/g, '')
    if (!num) continue
    const cand = await ensureUserJid(conn, m, `${num}@s.whatsapp.net`)
    if (cand && cand !== attackerJid) return cand
  }

  const qSender =
    m?.quoted?.sender ||
    m?.quoted?.participant ||
    m?.msg?.contextInfo?.participant ||
    m?.message?.extendedTextMessage?.contextInfo?.participant ||
    null

  const qJid = await ensureUserJid(conn, m, qSender)
  if (qJid && qJid !== attackerJid) return qJid

  return null
}

const handler = async (m, { conn }) => {
  const subbotId = getSubbotId(conn)

  const attackerJid =
    (await ensureUserJid(conn, m, m?.sender)) ||
    (await resolveUserJid(conn, m?.sender))

  await withDbLock(subbotId, async () => {
    const db = loadEconomyDb()
    const attacker = getUser(db, subbotId, attackerJid)
    const userTag = safeUserTag(conn, m)

    const victimJid = await pickVictimJid(m, conn, attackerJid)

    if (!victimJid) {
      const text = economyDecor({
        title: 'Uso: responde o menciona',
        lines: [
          '> Debes *responder* al mensaje del usuario o *mencionarlo*.',
          '> Ej: *.rob @usuario*',
          '> Solo puedes robar el dinero que está en *billetera* (no en el banco).'
        ],
        userTag
      })
      saveEconomyDb(db)
      return await replyText(conn, m, text)
    }

    const remain = getCooldown(attacker, 'rob')
    if (remain > 0) {
      const text = economyDecor({
        title: 'Aún no puedes usar rob.',
        lines: [`> Vuelve en » *${msToHuman(remain)}*`],
        userTag
      })
      saveEconomyDb(db)
      return await replyText(conn, m, text)
    }

    const victim = getUser(db, subbotId, victimJid)
    const victimWallet = Math.floor(Number(victim.wallet || 0))

    attacker.stats.rob = (attacker.stats.rob || 0) + 1
    setCooldown(attacker, 'rob', CD)

    const victimId = getUserId(victimJid)

    if (victimWallet <= 0) {
      const text = economyDecor({
        title: 'No había nada que robar 😭',
        lines: [
          `> @${victimId} no tiene dinero en *billetera*.`,
          '> Tip: si guardan su dinero con *dep all*, aquí no les podrás robar.'
        ],
        userTag
      })
      saveEconomyDb(db)
      return await replyText(conn, m, text, { mentions: [victimJid] })
    }

    const baseChance = 0.48
    const bonus = Math.min(0.1, victimWallet / 2_000_000)
    const success = Math.random() < baseChance + bonus

    const stealMin = Math.max(1, Math.floor(victimWallet * 0.1))
    const stealMax = Math.max(1, Math.floor(victimWallet * 0.35))
    const steal = Math.min(250000, randInt(stealMin, stealMax))

    if (success) {
      victim.wallet = Math.max(0, Math.floor(Number(victim.wallet || 0)) - steal)
      attacker.wallet = Math.floor(Number(attacker.wallet || 0)) + steal

      const text = economyDecor({
        title: `¡Robo exitoso! +${formatMoney(steal)}`,
        lines: [
          `> Le robaste *${formatMoney(steal)}* a @${victimId} (solo billetera).`,
          '> Consejo para la víctima: usa *dep all* para estar a salvo.'
        ],
        userTag
      })

      saveEconomyDb(db)
      return await replyText(conn, m, text, { mentions: [victimJid] })
    }

    const fine = Math.min(Math.floor(Number(attacker.wallet || 0)), randInt(5000, 60000))
    attacker.wallet = Math.max(0, Math.floor(Number(attacker.wallet || 0)) - fine)
    victim.wallet = Math.floor(Number(victim.wallet || 0)) + fine

    const text = economyDecor({
      title: `Robo fallido... -${formatMoney(fine)}`,
      lines: [`> Te descubrieron y le pagaste *${formatMoney(fine)}* a @${victimId}.`],
      userTag
    })

    saveEconomyDb(db)
    return await replyText(conn, m, text, { mentions: [victimJid] })
  })
}

handler.command = ['steal', 'rob', 'robar']
handler.tags = ['economy']
handler.help = ['rob @usuario', 'rob (respondiendo a un usuario)']

export default handler
