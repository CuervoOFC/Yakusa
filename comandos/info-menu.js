import fs from 'fs'
import { getBotVisual } from '../subbotManager.js'

function formatUptime(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const parts = []
  if (d) parts.push(`${d} dias`)
  if (h || d) parts.push(`${h} horas`)
  if (m || h || d) parts.push(`${m} minutos`)
  parts.push(`${ss} segundos`)
  return parts.join(' ')
}

function formatDateTimeChicago(date = new Date()) {
  try {
    const dtf = new Intl.DateTimeFormat('es-ES', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    return dtf.format(date)
  } catch {
    const pad = (n) => String(n).padStart(2, '0')
    const y = date.getFullYear()
    const mo = pad(date.getMonth() + 1)
    const da = pad(date.getDate())
    const hh = pad(date.getHours())
    const mm = pad(date.getMinutes())
    const ss = pad(date.getSeconds())
    return `${da}/${mo}/${y} ${hh}:${mm}:${ss}`
  }
}

let handler = async (m, { conn }) => {
  const from = m.key.remoteJid
  const visual = getBotVisual(conn)

  const bannerPath = visual?.banner
  const bannerExists = bannerPath && fs.existsSync(bannerPath)
  const identity = visual.isSubBot ? 'Sub-Bot' : 'Principal'

  const nowText = formatDateTimeChicago(new Date())
  const uptimeText = formatUptime(process.uptime())

  const menuText = `
「✿」¡Hola Soy \`${visual.name || globalThis.nombrebot || 'Bot'}\`! *${identity}*
❍ *Fecha y hora:* *${nowText}*
❑ *Uptime:* *${uptimeText}*

❀ *Descargas & Búsquedas*
> ✐ *.play*
> ❀ Descarga audios de YouTube.
> ✐ *.play2*
> ❀ Descarga videos de YouTube.
> ✐ *.mediafire*
> ❀ Descarga archivos de mediafire solo con el link.
> ✐ *.facebook*
> ❀ Descarga videos de facebook.
> ✐ *.tiktok*
> ❀ Descarga videos de tiktok.
> ✐ *.instagram*
> ❀ Descarga videos de instagram.
> ✐ *.ytsearch*
> ❀ Busca videos por texto en YouTube.
> ✐ *.pinterest*
> ❀ Busca imágenes en pinterest.
> ✐ *.wikipedia*
> ❀ Busca lo que quieras en wikipedia.

❀ *Inteligencia Artificial*
> ✐ *.imgia*
> ❀ Genera una imagen a partir de un prompt.
> ✐ *.gemini*
> ❀ Habla con el modelo gemini 2.5 flash.

❀ *Sub-Bots*
> ✐ *.code*
> ❀ Hazte subbot.
> ✐ *.setname*
> ❀ Cambia el nombre de tu Socket.
> ✐ *.setbanner*
> ❀ Cambia la imagen de tu Socket.
> ✐ *.setprefix*
> ❀ Cambia el prefijo de tu Socket.
> ✐ *.bots*
> ❀ Mira los total subbots conectados.

❀ *Random*
> ✐ *.meme*
> ❀ Envía un meme aleatorio en imagen.

❀ *Utilidades*
> 🜸 *.tourl*
> ❀ Sube archivos y devuelve link.
> ✐ *.s*
> ❀ Crea un sticker desde imagen o video.
> ✐ *.toimg*
> ❀ Convierte un sticker a imagen.
> ✐ *.tomp4*
> ❀ Convierte un sticker animado en imagen.

❀ *Reacciones Anime*
> ✐ *.angry / *.enojado*
> ✐ *.bath / *.bañarse*
> ✐ *.bite / *.morder*
> ✐ *.bleh / *.lengua*
> ✐ *.blush / *.sonrojarse*
> ✐ *.bored / *.aburrido*
> ✐ *.clap / *.aplaudir*
> ✐ *.coffee / *.cafe / *.café*
> ✐ *.cry / *.llorar*
> ✐ *.cuddle / *.acurrucarse*
> ✐ *.dance / *.bailar*
> ✐ *.drunk / *.borracho*
> ✐ *.eat / *.comer*
> ✐ *.facepalm / *.palmadacara*
> ✐ *.happy / *.feliz*
> ✐ *.hug / *.abrazar*
> ✐ *.kill / *.matar*
> ✐ *.kiss / *.muak*
> ✐ *.laugh / *.reirse*
> ✐ *.lick / *.lamer*
> ✐ *.slap / *.bofetada*
> ✐ *.sleep / *.dormir*
> ✐ *.smoke / *.fumar*
> ✐ *.spit / *.escupir*
> ✐ *.step / *.pisar*
> ✐ *.think / *.pensar*
> ✐ *.love / *.enamorado / *.enamorada*
> ✐ *.pat / *.palmadita / *.palmada*
> ✐ *.poke / *.picar*
> ✐ *.pout / *.pucheros*
> ✐ *.punch / *.pegar / *.golpear*
> ✐ *.preg / *.preñar / *.embarazar*
> ✐ *.run / *.correr*
> ✐ *.sad / *.triste*
> ✐ *.scared / *.asustada / *.asustado*
> ✐ *.seduce / *.seducir*
> ✐ *.shy / *.timido / *.timida*
> ✐ *.walk / *.caminar*
> ✐ *.dramatic / *.drama*
> ✐ *.kisscheek / *.beso*
> ✐ *.wink / *.guiñar*
> ✐ *.cringe / *.avergonzarse*
> ✐ *.smug / *.presumir*
> ✐ *.smile / *.sonreir*
> ✐ *.highfive / *.5*
> ✐ *.handhold / *.mano*
> ✐ *.bully / *.bullying*
> ✐ *.wave / *.hola / *.ola*

❀ *Economía*
> ✐ *.einfo / *.economyinfo*
> ❀ Muestra tu info de economía (cooldowns + dinero).
> ✐ *.daily*
> ❀ Reclama tu recompensa diaria.
> ✐ *.weekly*
> ❀ Reclama tu recompensa semanal.
> ✐ *.work / *.w*
> ❀ Trabaja y gana dinero.
> ✐ *.crime*
> ❀ Haz un crimen y gana o pierde.
> ✐ *.slut*
> ❀ Turno nocturno (riesgo/recompensa).
> ✐ *.slot <cantidad>*
> ❀ Apuesta en la máquina.
> ✐ *.beg*
> ❀ Mendiga y gana un poco.
> ✐ *.coinflip / *.flip <cantidad> [cara/cruz]*
> ❀ Apuesta a cara o cruz.
> ✐ *.roulette / *.rt <cantidad> <rojo/negro/verde>*
> ❀ Ruleta rápida (verde paga más).
> ✐ *.invest <cantidad>*
> ❀ Invierte (cobra luego con collect).
> ✐ *.collect*
> ❀ Cobra tu inversión.
> ✐ *.depositar / *.d <cantidad/all>*
> ❀ Deposita dinero al banco.
> ✐ *.retirar / *.withdraw <cantidad/all>*
> ❀ Retira dinero del banco.
> ✐ *.robar / *.rob @user*
> ❀ Intenta robar a un usuario.
> ✐ *.pay / *.givecoins @user <cantidad/all>*
> ❀ Envía dinero a otro usuario.
> ✐ *.bal / *.coins*
> ❀ Mira tu balance.
> ✐ *.baltop / *.economyboard [página]*
> ❀ Top de usuarios con más dinero.

❀ *Perfil*
> ✐ *.perfil / *.profile*
> ❀ Muestra tu perfil (o el de alguien mencionando / respondiendo).
> ✐ *.setprofile*
> ❀ Muestra las opciones para configurar tu perfil.
> ✐ *.setbirth 01/01/2000* / *.delbirth*
> ❀ Establece o borra tu cumpleaños.
> ✐ *.setgenre hombre|mujer|otro* / *.delgenre*
> ❀ Establece o borra tu género.
> ✐ *.setdesc <texto>* / *.deldesc*
> ❀ Establece o borra tu descripción.
> ✐ *.pfp @user*
> ❀ Muestra la foto de perfil de un usuario.

❀ *Gacha*
> ✐ *.rw / *.roll*
> ❀ Tira una waifu (roll).
> ✐ *.c / *.claim*
> ❀ Reclama tu último roll.
> ✐ *.ultimoroll*
> ❀ Muestra tu último roll activo.
> ✐ *.ginfo*
> ❀ Tu información de gacha.
> ✐ *.waifus / *.harem*
> ❀ Mira tu inventario.
> ✐ *.waifuinfo / *.charinfo <id|nombre>*
> ❀ Información de una waifu.
> ✐ *.charimage / *.charvideo <id|nombre>*
> ❀ Ver media aleatoria del personaje.
> ✐ *.buscarwaifu <texto>*
> ❀ Busca por nombre u origen.
> ✐ *.coleccion*
> ❀ Resumen de tu colección.
> ✐ *.market / *.haremshop [página]*
> ❀ Mercado de waifus.
> ✐ *.venderwaifu / *.sell <id> <precio>*
> ❀ Pon una waifu en venta.
> ✐ *.cancelarventa / *.removesale <id>*
> ❀ Quita una waifu del mercado.
> ✐ *.comprarwaifu / *.buychar <id>*
> ❀ Compra del mercado.
> ✐ *.regalar / *.givechar <id|nombre> @user*
> ❀ Regala una waifu.
> ✐ *.giveallharem @user*
> ❀ Regala todo tu harem.
> ✐ *.fav [id]*
> ❀ Marca/ver tu waifu favorita.
> ✐ *.favtop*
> ❀ Top de waifus favoritas.
> ✐ *.waifusboard [número]*
> ❀ Top waifus por valor.
> ✐ *.trade @user <tuID> / <suID>*
> ❀ Intercambia waifus.
> ✐ *.vote <id|nombre>*
> ❀ Vota para subir valor.
> ✐ *.setclaimmsg <texto> / *.delclaimmsg*
> ❀ Personaliza el mensaje al reclamar.
> ✐ *.delwaifu <id>*
> ❀ Elimina una waifu de tu harem.
> ✐ *.topwaifus*
> ❀ Top coleccionistas.

❀ *Gestión de Grupos*
> ✐ *.welcome/antilink/avisos on/off*
> ❀ Activa/desactiva los eventos en un grupo.
> ✐ *.banchat / *.unbanchat*
> ❀ Desactiva/activa el bot en este grupo.
> ✐ *.linkgc*
> ❀ Obtén el link de invitación del grupo.
> ✐ *.tagall [mensaje]*
> ❀ Menciona a todos los participantes.
> ✐ *.kick*
> ❀ Expulsa a un usuario del grupo.
> ✐ *.promote*
> ❀ Promueve a admin.
> ✐ *.demote*
> ❀ Degrada a miembro.
> ✐ *.gp*
> ❀ Abre o cierra el grupo.
> ✐ *.setgpname <nombre>*
> ❀ Cambia el nombre del grupo.
> ✐ *.setgpdesc <texto>*
> ❀ Cambia la descripción del grupo.
> ✐ *.setwelcome <mensaje>*
> ❀ Personaliza el mensaje de bienvenida.
> ✐ *.setbye <mensaje>*
> ❀ Personaliza el mensaje de despedida.

❀ *Información*
> ✐ *.menu*
> ❀ Muestra este menú.
> ✐ *.ping*
> ❀ Muestra la velocidad de respuesta del bot.
> ✐ *.report*
> ❀ Informa de un error al creador.

❀ *Dueño*
> ✐ *.update*
> ❀ Actualiza el bot desde Git.
`.trim()

  const { prepareWAMessageMedia, generateWAMessageFromContent } = await import('@whiskeysockets/baileys')

  const contextInfo = {
    forwardingScore: 999999,
    isForwarded: true
  }

  let header = { title: '' }

  try {
    if (bannerExists) {
      const media = await prepareWAMessageMedia(
        { image: fs.readFileSync(bannerPath) },
        { upload: conn.waUploadToServer }
      )
      header = { hasMediaAttachment: true, imageMessage: media.imageMessage }
    } else if (typeof bannerPath === 'string' && /^https?:\/\//i.test(bannerPath)) {
      const media = await prepareWAMessageMedia(
        { image: { url: bannerPath } },
        { upload: conn.waUploadToServer }
      )
      header = { hasMediaAttachment: true, imageMessage: media.imageMessage }
    }
  } catch {
    header = { title: '' }
  }

  const content = generateWAMessageFromContent(
    from,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header,
            body: { text: menuText },
            footer: { text: 'Hecho por *ᴛʜᴇᴅᴇᴠɪʟ ⁺⁵⁰¹/⁽ᶜᵘᵉʳᵛᵒᴼᶠᶜ⁴⁰⁴⁾* :D' },
            contextInfo,
            nativeFlowMessage: {
              buttons: [
                {
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({
                    display_text: 'BOT NUEVO??',
                    url: 'https://bot.the-legacy-code.pro'
                  })
                },
                {
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({
                    display_text: 'Canal Moon&Stars',
                    url: 'https://whatsapp.com/channel/0029VaM09iJ8F2pDE8GCaB3V'
                  })
                },
                {
                  name: 'cta_url',
                  buttonParamsJson: JSON.stringify({
                    display_text: 'Grupo Moon&Stars',
                    url: 'https://chat.whatsapp.com/KxHlg8fxLs8C8ShNFhDmYA'
                  })
                }
              ]
            }
          }
        }
      }
    },
    { quoted: m }
  )

  await conn.relayMessage(from, content.message, { messageId: content.key.id })
}

handler.help = ['menu', 'help', 'ayuda']
handler.tags = ['main']
handler.command = ['menu', 'help', 'ayuda']

export default handler
