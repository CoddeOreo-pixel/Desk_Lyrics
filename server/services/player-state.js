const EventEmitter = require('events')
const ncmLocal = require('./ncm-local')
const ncmCloud = require('./ncm-cloud')
const { parseLRC, mergeTranslation, filterLyrics } = require('./lyrics-parser')

class PlayerState extends EventEmitter {
  constructor() {
    super()
    this.currentSong = null
    this.currentLyrics = []
    this.isPlaying = false
    this.currentTime = 0
    this.duration = 0
    this.lastUpdateTime = Date.now()
    this.pollInterval = null
    this.lyricsCache = new Map()
    this.connected = false
    this.lastWindowTitle = ''
    this.polling = false
    this.manualPause = false
  }

  async start() {
    const discovery = await ncmLocal.discover()
    this.connected = discovery.ncmRunning

    if (this.connected) {
      console.log('[PlayerState] NCM client detected, auto-sync mode')
    } else {
      console.log('[PlayerState] NCM client not found, waiting for connection...')
    }

    this.pollInterval = setInterval(() => this.poll(), 1000)
    this.poll()

    this.emit('state:change', { connected: this.connected })
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  async poll() {
    if (this.polling) return
    this.polling = true
    try {
      const running = ncmLocal.isNcmRunning()
      if (running !== this.connected) {
        this.connected = running
        this.emit('state:change', { connected: this.connected })
      }
      if (!running) return

      const title = ncmLocal.getNcmWindowTitle()
      if (title === this.lastWindowTitle) {
        this.emitProgress()
        return
      }
      this.lastWindowTitle = title

      if (!title) {
        if (this.isPlaying) {
          this.isPlaying = false
          this.emit('player:state', { isPlaying: false })
        }
        this.emitProgress()
        return
      }

      const songInfo = ncmLocal.getSongInfoFromTitle(title)
      if (!songInfo) {
        this.emitProgress()
        return
      }

      const prevSongId = this.currentSong?.id
      const prevSongName = this.currentSong?.name
      const songChanged = songInfo.name !== prevSongName

      if (songInfo.id && songInfo.id !== prevSongId) {
        await this.onSongChange(songInfo.id, songInfo)
      } else if (songChanged && !songInfo.id) {
        const searchResults = await ncmCloud.search(
          `${songInfo.artist} ${songInfo.name}`, 1
        )
        if (searchResults.length > 0) {
          const matched = searchResults[0]
          songInfo.id = matched.id
          await this.onSongChange(matched.id, songInfo)
        } else {
          this.currentSong = songInfo
          this.emit('song:change', songInfo)
        }
      }

      if (!this.isPlaying && !this.manualPause) {
        this.isPlaying = true
        this.manualPause = false
        this.emit('player:state', { isPlaying: true })
      }

      this.emitProgress()
    } catch (e) {
      console.error('[PlayerState] Poll error:', e.message)
    } finally {
      this.polling = false
    }
  }

  emitProgress() {
    if (this.isPlaying && this.currentSong?.duration) {
      const now = Date.now()
      const elapsed = now - this.lastUpdateTime
      if (elapsed < 3000) {
        this.currentTime += elapsed
      }
      this.lastUpdateTime = now
    }
    this.emit('progress:update', {
      currentTime: this.currentTime,
      duration: this.duration,
      isPlaying: this.isPlaying
    })
  }

  async onSongChange(songId, songInfo) {
    if (songInfo) {
      this.currentSong = songInfo
      this.emit('song:change', songInfo)
    } else {
      const songDetail = await ncmCloud.getSongDetail([songId])
      if (songDetail) {
        this.currentSong = songDetail
        this.emit('song:change', songDetail)
      }
    }

    let lyrics = this.lyricsCache.get(songId)
    if (!lyrics) {
      const { lrc, tlyric } = await ncmCloud.getLyric(songId)
      const original = filterLyrics(parseLRC(lrc))
      const translation = filterLyrics(parseLRC(tlyric))
      lyrics = mergeTranslation(original, translation)
      this.lyricsCache.set(songId, lyrics)
    }
    this.currentLyrics = lyrics
    this.emit('lyrics:load', { lyrics })

    this.currentTime = 0
    this.lastUpdateTime = Date.now()
    this.duration = this.currentSong?.duration || 0
    this.isPlaying = true
    this.emit('player:state', { isPlaying: true })
  }

  async setManualSong(songId) {
    await this.onSongChange(songId)
  }

  async control(action) {
    const keyMap = {
      play: 'play',
      pause: 'pause',
      prev: 'prev',
      next: 'next'
    }
    const key = keyMap[action]
    if (!key) return false

    const success = ncmLocal.sendMediaKey(key)
    if (success) {
      if (action === 'pause') {
        this.isPlaying = false
        this.manualPause = true
        this.emit('player:state', { isPlaying: false })
      } else if (action === 'play') {
        this.isPlaying = true
        this.manualPause = false
        this.lastUpdateTime = Date.now()
        this.emit('player:state', { isPlaying: true })
      }
      if (action === 'prev' || action === 'next') {
        this.lastWindowTitle = ''
        this.manualPause = false
        setTimeout(() => this.poll(), 500)
      }
    }
    return success
  }

  getFullState() {
    return {
      song: this.currentSong,
      lyrics: this.currentLyrics,
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      connected: this.connected
    }
  }
}

module.exports = new PlayerState()
