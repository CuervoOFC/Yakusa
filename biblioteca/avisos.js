import { jidNormalizedUser } from '@whiskeysockets/baileys'
import { isAvisosEnabled, isBotEnabled } from './settings.js'

export default function groupAvisos(sock) {
  const subbotId = sock?.isSubBot ? String(sock?.subbotId || '').trim() : ''
  const normalizeJid = (jid = '') => (jid ? jidNormalizedUser(jid) : '')

  const decodeJid =
    typeof sock.decodeJid === 'function'
      ? sock.decodeJid.bind(sock)
      : (jid) => normalizeJid(jid)

  const ensureJid = (v = '') => {
    const s = String(v || '')
    if (!s) return ''
    if (/@(s\.whatsapp\.net|lid|g\.us)$/i.test(s)) return normalizeJid(s)
    if (/^\d+$/.test(s)) return normalizeJid(s + '@s.whatsapp.net')
    return normalizeJid(s)
  }

  const getPNForLID = async (lidJid = '') => {
    const lid = normalizeJid(lidJid)
    const repo = sock?.signalRepository?.lidMapping
    if (!lid || !/@lid$/i.test(lid)) return ''
    if (!repo || typeof repo.getPNForLID !== 'function') return ''
    try {
      const pn = await repo.getPNForLID(lid)
      const pnJid = ensureJid(pn)
      if (pnJid && /@s\.whatsapp\.net$/i.test(pnJid)) return pnJid
    } catch {}
    return ''
  }

  const resolveUserId = async (raw = '', metadata = null) => {
    const r = normalizeJid(raw)
    if (!r) return ''

    const d = decodeJid(r)
    if (d) {
      if (/@lid$/i.test(d)) return (await getPNForLID(d)) || d
      return d
    }

    if (/@lid$/i.test(r)) {
      const pn = await getPNForLID(r)
      if (pn) return pn

      const parts = metadata?.participants || []
      for (const p of parts) {
        const jid = normalizeJid(p?.jid || p?.id || p?.participant || '')
        const lid = normalizeJid(p?.lid || p?.lId || '')
        const phone = ensureJid(p?.phoneNumber || p?.pn || '')
        if (lid === r || jid === r) {
          if (phone && /@s\.whatsapp\.net$/i.test(phone)) return phone
          if (jid && /@s\.whatsapp\.net$/i.test(jid)) return jid
          return lid || r
        }
      }

      return r
    }

    return r
  }

  const buildUsername = (userId = '') => `@${String(userId).split('@')[0]}`

  const groupState = new Map()

  const getProfilePicUrl = async (id) => {
    try {
      if (typeof sock.profilePictureUrl === 'function') {
        return (await sock.profilePictureUrl(id, 'image')) || ''
      }
    } catch {}
    return ''
  }

  const ensureGroupState = async (id) => {
    const current = groupState.get(id)
    if (current) return current

    const md = await sock.groupMetadata(id).catch(() => null)
    const subject = md?.subject || ''
    const picUrl = await getProfilePicUrl(id)

    const st = { subject, picUrl }
    groupState.set(id, st)
    return st
  }

  const setGroupState = (id, patch = {}) => {
    const prev = groupState.get(id) || { subject: '', picUrl: '' }
    const next = { ...prev, ...patch }
    groupState.set(id, next)
    return next
  }

  const THUMB_URL = 'https://files.cloudkuimages.guru/images/9dd98cbaa3a0.jpg'
  let THUMB_BUF = null

  const fetchThumbBuffer = async () => {
    if (THUMB_BUF) return THUMB_BUF
    try {
      if (typeof fetch !== 'function') return null
      const res = await fetch(THUMB_URL)
      if (!res || !res.ok) return null
      const ab = await res.arrayBuffer()
      const buf = Buffer.from(ab)
      if (buf?.length) {
        THUMB_BUF = buf
        return buf
      }
    } catch {}
    return null
  }

  const buildContextInfo = async (mentionedJid = []) => {
    const thumbnail = await fetchThumbBuffer()

    return {
      mentionedJid,
      externalAdReply: {
        title: '➤; 𝗔𝗩𝗜𝗦𝗢𝗦 .☆',
        body: '',
        thumbnail: thumbnail || undefined,
        thumbnailUrl: 'https://whatsapp.com/channel/0029VaM09iJ8F2pDE8GCaB3V',
        sourceUrl: 'https://whatsapp.com/channel/0029VaM09iJ8F2pDE8GCaB3V',
        mediaType: 1,
        renderLargerThumbnail: false
      }
    }
  }

  const sendNotice = async (jid, text, mentionedJid = []) => {
    const contextInfo = await buildContextInfo(mentionedJid)
    await sock.sendMessage(jid, { text, contextInfo })
  }

  sock.ev.on('group-participants.update', async (update) => {
    const { id, participants, action, author } = update
    if (!id || !participants?.length) return
    if (!isBotEnabled(id, subbotId)) return
    if (action !== 'promote' && action !== 'demote') return
    if (!isAvisosEnabled(id, subbotId)) return

    const metadata = await sock.groupMetadata(id).catch(() => null)
    const actorId = await resolveUserId(author, metadata)
    const actorName = actorId ? buildUsername(actorId) : 'Alguien'

    for (const p of participants) {
      const userId = await resolveUserId(p, metadata)
      if (!userId) continue

      const username = buildUsername(userId)
      const mentions = [userId]
      if (actorId && actorId !== userId) mentions.push(actorId)

      if (action === 'promote') {
        await sendNotice(
          id,
          `「✦」 *Aviso:* ${actorName} le concedió permisos de *admin* a ${username}.`,
          mentions
        )
      } else if (action === 'demote') {
        await sendNotice(
          id,
          `「✦」 *Aviso:* ${actorName} le revocó los privilegios de *admin* a ${username}.`,
          mentions
        )
      }
    }
  })

  sock.ev.on('groups.update', async (updates) => {
    if (!Array.isArray(updates)) return

    for (const update of updates) {
      const { id, subject, desc, author } = update || {}
      if (!id || !isBotEnabled(id, subbotId) || !isAvisosEnabled(id, subbotId)) continue

      const prev = await ensureGroupState(id)

      let metadata = null
      if (author) metadata = await sock.groupMetadata(id).catch(() => null)

      const actorId = await resolveUserId(author, metadata)
      const actorName = actorId ? buildUsername(actorId) : 'Alguien'

      const notices = []

      if (typeof subject === 'string' && subject) {
        const oldName = prev?.subject || ''
        const newName = subject

        if (oldName && oldName !== newName) {
          notices.push({
            text: `「✦」 *Aviso:* ${actorName} cambió el *nombre* del grupo:
*${oldName}* → *${newName}*`,
            mentions: actorId ? [actorId] : []
          })
        } else if (!oldName && newName) {
          notices.push({
            text: `「✦」 *Aviso:* ${actorName} cambió el *nombre* del grupo a *${newName}*.`,
            mentions: actorId ? [actorId] : []
          })
        }

        setGroupState(id, { subject: newName })
      }

      if (typeof desc === 'string') {
        notices.push({
          text: `「✦」 *Aviso:* ${actorName} actualizó la *descripción* del grupo:
${desc}`,
          mentions: actorId ? [actorId] : []
        })
      }

      const hasPictureKey =
        update &&
        (Object.prototype.hasOwnProperty.call(update, 'picture') ||
          Object.prototype.hasOwnProperty.call(update, 'icon') ||
          Object.prototype.hasOwnProperty.call(update, 'avatar') ||
          Object.prototype.hasOwnProperty.call(update, 'profilePicture') ||
          Object.prototype.hasOwnProperty.call(update, 'profilePic') ||
          Object.prototype.hasOwnProperty.call(update, 'profilePicThumb') ||
          Object.prototype.hasOwnProperty.call(update, 'profilePicThumbObj') ||
          Object.prototype.hasOwnProperty.call(update, 'pictureUrl') ||
          Object.prototype.hasOwnProperty.call(update, 'imgUrl'))

      if (hasPictureKey) {
        const oldPic = prev?.picUrl || ''
        const newPic = await getProfilePicUrl(id)

        if (newPic && newPic !== oldPic) {
          notices.push({
            text: `「✦」 *Aviso:* ${actorName} cambió la *foto* del grupo.`,
            mentions: actorId ? [actorId] : []
          })
          setGroupState(id, { picUrl: newPic })
        } else if (!newPic && oldPic) {
          notices.push({
            text: `「✦」 *Aviso:* ${actorName} eliminó la *foto* del grupo.`,
            mentions: actorId ? [actorId] : []
          })
          setGroupState(id, { picUrl: '' })
        }
      }

      if (!notices.length) continue
      for (const notice of notices) {
        await sendNotice(id, notice.text, notice.mentions)
      }
    }
  })

  sock.ev.on('group-description.update', async (update) => {
    const { id, desc, participant } = update || {}
    if (!id || !isBotEnabled(id, subbotId) || !isAvisosEnabled(id, subbotId)) return

    const description = desc || 'Descripción eliminada.'
    const user = await resolveUserId(participant, null)
    const username = user ? buildUsername(user) : 'Alguien'

    await sendNotice(
      id,
      `「✦」 *Aviso:* ${username} modificó la *descripción* del grupo:
${description}`,
      user ? [user] : []
    )
  })
}
