import axios from 'axios'
import yts from 'yt-search'

let handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!args[0]) return m.reply(`✅ Correct usage: ${usedPrefix + command} <link or name>`)
try {
    let url = args[0]
    let videoInfo = null

    // Search on YouTube if it is not a direct link
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      let search = await yts(args.join(' '))
      if (!search.videos || search.videos.length === 0) return m.reply('No results were found.')
      videoInfo = search.videos[0]
      url = videoInfo.url
    } else {
      let id = url.split('v=')[1]?.split('&')[0] || url.split('/').pop()

let search = await yts({ videoId: id })

if (search && search.title) videoInfo = search

}

// Time limit (63 minutes)

if (videoInfo.seconds > 3780) {

return m.reply(`⛔ The video exceeds the allowed duration limit (63 minutes).`)



let apiUrl = ''

let isAudio = false

/ New API configuration

if (command == 'play' || command == 'ytmp3') {
apiUrl = `https://api.the-legacy-code.pro/download/ytmp3?url=${encodeURIComponent(url)}`
isAudio = true


} else if (command == 'play2' || command == 'ytmp4') {
apiUrl = `https://api.the-legacy-code.pro/download/ytmp4?url=${encodeURIComponent(url)}`

} else {

return m.reply('Command not recognized.')


// API call using Axios

const response = await axios.get(apiUrl)

const json = response.data // Axios saves the response to .data

// Validation based on format: { status: true, result: "url" }

if (!json.status || !json.result) {

throw new Error('The API did not return a valid link.')



let downloadUrl = json.result

let title = videoInfo.title || 'File'

let thumbnail = videoInfo.thumbnail || videoInfo.image || ''

let duration = videoInfo?.timestamp || 'Unknown'

let details = `
📌 Title: *${title}*
📁 Duration: *${duration}*
📥 Quality: *High*
🎧 Type: *${isAudio? 'Audio' : 'Video'}*
🌐 Source: *YouTube*`.trim()

    // Send informative message
    await conn.sendMessage(m.chat, {
      text: details,
      contextInfo: {
        externalAdReply: {
          title: `${title}`,
          body: 'Sending content...',
          thumbnailUrl: thumbnail,
          sourceUrl: 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O',
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m })

    // Send the final file
    if (isAudio) {
      /*await conn.sendMessage(m.chat, {
        audio: { url: downloadUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`
      }, { quoted: m })*/
                await conn.sendMessage(m.chat, { document: { url: downloadUrl }, mimetype: "audio/mpeg", fileName: `${title}`, caption: `Aqui tienes tu audio *Documento*` }, { quoted: m });

    } else {
      /*await conn.sendMessage(m.chat, {
        video: {url:downloadUrl},
        mimetype: 'video/mp4',
        fileName: `${title}.mp4`
      }, { quoted: m })*/
      const objeto = {
              document: { url: downloadUrl },
              fileName: `${title}.mp4`,
              mimetype: 'video/mp4',
              caption: `✅ ${title} entregado desde *Documento*`,
              thumbnailUrl: thumbnail
            };

            await conn.sendMessage(m.chat, objeto, { quoted: m });
    }

  } catch (e) {
    console.error('Play error:', e)
    m.reply('❌ Sorry, there was an error processing your request with Axios.')
  }
}

handler.help = ['play', 'ytmp3', 'play2', 'ytmp4']
handler.tags = ['downloader']
handler.command = ['play', 'play2', 'ytmp3', 'ytmp4']

export default handler
 ndler
