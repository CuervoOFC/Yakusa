import axios from 'axios'
import yts from 'yt-search'

let handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!args[0]) return m.reply(`✅ Uso correcto: ${usedPrefix + command} <enlace o nombre>`)

    let url = args[0]
    let videoInfo = null

    // Búsqueda en YouTube si no es un enlace directo
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      let search = await yts(args.join(' '))
      if (!search.videos || search.videos.length === 0) return m.reply('No se encontraron resultados.')
      videoInfo = search.videos[0]
      url = videoInfo.url
    } else {
      let id = url.split('v=')[1]?.split('&')[0] || url.split('/').pop()
      let search = await yts({ videoId: id })
      if (search && search.title) videoInfo = search
    }

    // Límite de tiempo (63 minutos)
    if (videoInfo.seconds > 3780) {
      return m.reply(`⛔ El video supera el límite de duración permitido (63 minutos).`)
    }

    let apiUrl = ''
    let isAudio = false

    // Configuración de las nuevas APIs
    if (command == 'play' || command == 'ytmp3') {
      apiUrl = `https://api.the-legacy-code.pro/download/ytmp3?url=${encodeURIComponent(url)}`
      isAudio = true
    } else if (command == 'play2' || command == 'ytmp4') {
      apiUrl = `https://api.the-legacy-code.pro/download/ytmp4?url=${encodeURIComponent(url)}`
    } else {
      return m.reply('Comando no reconocido.')
    }

    // Llamada a la API usando Axios
    const response = await axios.get(apiUrl)
    const json = response.data // Axios guarda la respuesta en .data

    // Validación basada en el formato: { status: true, result: "url" }
    if (!json.status || !json.result) {
        throw new Error('La API no devolvió un enlace válido.')
    }

    let downloadUrl = json.result
    let title = videoInfo.title || 'Archivo'
    let thumbnail = videoInfo.thumbnail || videoInfo.image || ''
    let duration = videoInfo?.timestamp || 'Desconocida'

    let details = `
📌 Título : *${title}*
📁 Duración : *${duration}*
📥 Calidad : *Alta*
🎧 Tipo : *${isAudio ? 'Audio' : 'Video'}*
🌐 Fuente : *YouTube*`.trim()

    // Enviar mensaje informativo
    await conn.sendMessage(m.chat, {
      text: details,
      contextInfo: {
        externalAdReply: {
          title: `${title}`,
          body: 'Enviando contenido...',
          thumbnailUrl: thumbnail,
          sourceUrl: 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O',
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m })

    // Enviar el archivo final
    if (isAudio) {
      await conn.sendMessage(m.chat, {
        audio: { url: downloadUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        video: { url: downloadUrl },
        mimetype: 'video/mp4',
        fileName: `${title}.mp4`
      }, { quoted: m })
    }

  } catch (e) {
    console.error('Error en Play:', e)
    m.reply('❌ Lo siento, hubo un error al procesar tu solicitud con Axios.')
  }
}

handler.help = ['play', 'ytmp3', 'play2', 'ytmp4']
handler.tags = ['downloader']
handler.command = ['play', 'play2', 'ytmp3', 'ytmp4']

export default handler
