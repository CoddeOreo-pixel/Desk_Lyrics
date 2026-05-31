const NcmApi = require('NeteaseCloudMusicApi')

const ncmCloud = {
  async getSongDetail(ids) {
    try {
      const res = await NcmApi.song_detail({ ids: ids.join(',') })
      const songs = res.body?.songs || []
      if (songs.length > 0) {
        const s = songs[0]
        return {
          id: s.id,
          name: s.name,
          artist: s.ar?.map(a => a.name).join(' / ') || '',
          album: s.al?.name || '',
          coverUrl: s.al?.picUrl || '',
          duration: s.dt || 0
        }
      }
      return null
    } catch (e) {
      console.error('[NCM Cloud] getSongDetail error:', e.message || e)
      return null
    }
  },

  async getLyric(id) {
    try {
      const res = await NcmApi.lyric({ id })
      const data = res.body || {}
      const lrc = data.lrc?.lyric || ''
      const tlyric = data.tlyric?.lyric || ''
      return { lrc, tlyric }
    } catch (e) {
      console.error('[NCM Cloud] getLyric error:', e.message || e)
      return { lrc: '', tlyric: '' }
    }
  },

  async search(keyword, limit = 10) {
    try {
      const res = await NcmApi.search({ keywords: keyword, limit, type: 1 })
      return res.body?.result?.songs || []
    } catch (e) {
      console.error('[NCM Cloud] search error:', e.message || e)
      return []
    }
  }
}

module.exports = ncmCloud
