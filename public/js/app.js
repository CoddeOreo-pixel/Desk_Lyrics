(function () {
  const ws = wsClient
  const renderer = lyricsRenderer
  const theme = themeManager

  const els = {
    statusDot: document.querySelector('.status-dot'),
    statusText: document.querySelector('.status-text'),
    songInfo: document.getElementById('song-info'),
    coverImg: document.getElementById('cover-img'),
    songName: document.getElementById('song-name'),
    songArtist: document.getElementById('song-artist'),
    controls: document.getElementById('controls'),
    btnPrev: document.getElementById('btn-prev'),
    btnPlay: document.getElementById('btn-play'),
    btnNext: document.getElementById('btn-next'),
    iconPlay: document.getElementById('icon-play'),
    iconPause: document.getElementById('icon-pause'),
    btnImmersive: document.getElementById('btn-immersive'),
    btnTheme: document.getElementById('btn-theme'),
    btnFullscreen: document.getElementById('btn-fullscreen'),
    btnFontSize: document.getElementById('btn-font-size'),
    btnOffset: document.getElementById('btn-offset'),
    themePanel: document.getElementById('theme-panel'),
    fontPanel: document.getElementById('font-panel'),
    offsetPanel: document.getElementById('offset-panel'),
    manualPanel: document.getElementById('manual-panel'),
    fontSlider: document.getElementById('font-slider'),
    fontValue: document.getElementById('font-value'),
    offsetValue: document.getElementById('offset-value'),
    offsetMinus: document.getElementById('offset-minus'),
    offsetPlus: document.getElementById('offset-plus'),
    offsetReset: document.getElementById('offset-reset'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    searchResults: document.getElementById('search-results'),
    statusBar: document.getElementById('connection-status'),
    toolbar: document.getElementById('toolbar')
  }

  let isPlaying = false
  let currentOffset = 0
  let manualMode = false
  let activePanel = null
  let localTimer = null
  let localCurrentTime = 0
  let localDuration = 0
  let lastFrameTime = 0
  let lastCheckTime = 0
  let immersiveMode = false

  function init() {
    ws.connect()
    bindEvents()
    loadSettings()
  }

  function startLocalTimer() {
    stopLocalTimer()
    lastFrameTime = performance.now()
    lastCheckTime = 0
    localTimer = requestAnimationFrame(tick)
  }

  function tick(now) {
    if (!isPlaying) {
      localTimer = null
      return
    }
    const delta = now - lastFrameTime
    lastFrameTime = now
    localCurrentTime += delta
    if (localDuration > 0 && localCurrentTime > localDuration) {
      localCurrentTime = localDuration
    }
    if (now - lastCheckTime >= 100) {
      lastCheckTime = now
      renderer.updateProgress(localCurrentTime)
    }
    localTimer = requestAnimationFrame(tick)
  }

  function stopLocalTimer() {
    if (localTimer) {
      cancelAnimationFrame(localTimer)
      localTimer = null
    }
  }

  function bindEvents() {
    ws.on('connected', () => {
      els.statusDot.className = 'status-dot connected'
      els.statusText.textContent = '已连接'
    })

    ws.on('disconnected', () => {
      els.statusDot.className = 'status-dot'
      els.statusText.textContent = '已断开'
    })

    ws.on('reconnecting', ({ attempt }) => {
      els.statusDot.className = 'status-dot connecting'
      els.statusText.textContent = `重连中(${attempt})...`
    })

    ws.on('init', (data) => {
      if (data.connected) {
        els.statusDot.className = 'status-dot connected'
        els.statusText.textContent = '已同步'
      } else {
        showManualMode()
      }
      if (data.song) onSongChange(data.song)
      if (data.lyrics && data.lyrics.length > 0) renderer.setLyrics(data.lyrics)
      if (data.isPlaying !== undefined) updatePlayState(data.isPlaying)
      if (data.currentTime) {
        localCurrentTime = data.currentTime
        renderer.updateProgress(data.currentTime)
      }
    })

    ws.on('song:change', onSongChange)
    ws.on('lyrics:load', (data) => {
      renderer.setLyrics(data.lyrics)
      localCurrentTime = 0
      startLocalTimer()
    })
    ws.on('progress:update', (data) => {
      localCurrentTime = data.currentTime
      localDuration = data.duration
      renderer.updateProgress(data.currentTime)
    })
    ws.on('player:state', (data) => {
      updatePlayState(data.isPlaying)
      if (data.isPlaying) {
        startLocalTimer()
      } else {
        stopLocalTimer()
      }
    })
    ws.on('control:result', (data) => {
      if (!data.success) {
        console.warn('[App] Control failed:', data.action)
      }
    })
    ws.on('state:change', (data) => {
      if (data.connected) {
        els.statusDot.className = 'status-dot connected'
        els.statusText.textContent = '已同步'
        els.manualPanel.classList.add('hidden')
        manualMode = false
      } else {
        showManualMode()
      }
    })
    ws.on('search:result', onSearchResult)

    els.btnPrev.addEventListener('click', () => {
      els.btnPrev.classList.add('active')
      ws.send('control:prev')
      setTimeout(() => els.btnPrev.classList.remove('active'), 300)
    })
    els.btnPlay.addEventListener('click', () => {
      const willPause = isPlaying
      updatePlayState(!willPause)
      ws.send(willPause ? 'control:pause' : 'control:play')
    })
    els.btnNext.addEventListener('click', () => {
      els.btnNext.classList.add('active')
      ws.send('control:next')
      setTimeout(() => els.btnNext.classList.remove('active'), 300)
    })

    els.btnImmersive.addEventListener('click', (e) => {
      e.stopPropagation()
      toggleImmersive(true)
    })
    els.btnTheme.addEventListener('click', () => togglePanel('theme'))
    els.btnFullscreen.addEventListener('click', toggleFullscreen)
    els.btnFontSize.addEventListener('click', () => togglePanel('font'))
    els.btnOffset.addEventListener('click', () => togglePanel('offset'))

    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', () => {
        theme.apply(btn.dataset.theme)
      })
    })

    els.fontSlider.addEventListener('input', () => {
      const size = els.fontSlider.value
      document.documentElement.style.setProperty('--lyric-font-size', size + 'px')
      els.fontValue.textContent = size + 'px'
      localStorage.setItem('desk-lyrics-font-size', size)
    })

    els.offsetMinus.addEventListener('click', () => adjustOffset(-500))
    els.offsetPlus.addEventListener('click', () => adjustOffset(500))
    els.offsetReset.addEventListener('click', () => {
      currentOffset = 0
      renderer.setOffset(0)
      els.offsetValue.textContent = '0.0s'
      localStorage.setItem('desk-lyrics-offset', '0')
    })

    els.searchBtn.addEventListener('click', doSearch)
    els.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch()
    })

    document.addEventListener('click', (e) => {
      if (immersiveMode) {
        toggleImmersive(false)
        return
      }
      if (activePanel && !e.target.closest('.toolbar') && !activePanel.contains(e.target)) {
        closeAllPanels()
      }
    })
  }

  function onSongChange(song) {
    els.songInfo.classList.remove('hidden')
    els.controls.classList.remove('hidden')
    els.songName.textContent = song.name || ''
    els.songArtist.textContent = song.artist || ''
    if (song.coverUrl) {
      els.coverImg.src = song.coverUrl
      els.coverImg.classList.remove('hidden')
      els.coverImg.parentElement.classList.remove('hidden')
      updateAppleMusicBg(song.coverUrl)
    } else {
      els.coverImg.src = ''
      els.coverImg.classList.add('hidden')
    }
    localDuration = song.duration || 0
    localCurrentTime = 0
  }

  function updatePlayState(playing) {
    isPlaying = playing
    els.iconPlay.style.display = playing ? 'none' : 'block'
    els.iconPause.style.display = playing ? 'block' : 'none'
  }

  function showManualMode() {
    manualMode = true
    els.manualPanel.classList.remove('hidden')
  }

  function doSearch() {
    const keyword = els.searchInput.value.trim()
    if (!keyword) return
    ws.send('search', { keyword, limit: 10 })
  }

  function onSearchResult(results) {
    els.searchResults.innerHTML = ''
    if (!results || results.length === 0) {
      els.searchResults.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px">无结果</div>'
      return
    }
    results.forEach(song => {
      const item = document.createElement('div')
      item.className = 'search-result-item'
      const artistStr = (song.ar || []).map(a => a.name).join(' / ')
      item.innerHTML = `
        <span class="result-name">${song.name}</span>
        <span class="result-artist">${artistStr}</span>
      `
      item.addEventListener('click', () => {
        ws.send('manual:song', { songId: song.id })
        isPlaying = true
        updatePlayState(true)
        localCurrentTime = 0
        localDuration = song.dt || 0
        startLocalTimer()
        els.searchResults.innerHTML = ''
        els.searchInput.value = ''
      })
      els.searchResults.appendChild(item)
    })
  }

  function togglePanel(name) {
    const panels = { theme: els.themePanel, font: els.fontPanel, offset: els.offsetPanel }
    const panel = panels[name]
    if (!panel) return

    if (activePanel === panel) {
      closeAllPanels()
      return
    }

    closeAllPanels()
    panel.classList.remove('hidden')
    activePanel = panel
  }

  function closeAllPanels() {
    [els.themePanel, els.fontPanel, els.offsetPanel].forEach(p => p.classList.add('hidden'))
    activePanel = null
  }

  function toggleFullscreen() {
    var el = document.documentElement
    var isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement)
    if (!isFull) {
      var rq = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen
      if (rq) rq.call(el)
    } else {
      var ex = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen
      if (ex) ex.call(document)
    }
  }

  function toggleImmersive(enter) {
    immersiveMode = enter
    const app = document.getElementById('app')
    if (enter) {
      closeAllPanels()
      app.classList.add('immersive')
    } else {
      app.classList.remove('immersive')
    }
  }

  function adjustOffset(delta) {
    currentOffset += delta
    currentOffset = Math.max(-5000, Math.min(5000, currentOffset))
    renderer.setOffset(currentOffset)
    els.offsetValue.textContent = (currentOffset / 1000).toFixed(1) + 's'
    localStorage.setItem('desk-lyrics-offset', currentOffset.toString())
  }

  function updateAppleMusicBg(coverUrl) {
    if (theme.getCurrentTheme() !== 'apple-music') return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      document.getElementById('app').style.background = `
        linear-gradient(180deg, rgba(${r},${g},${b},0.4) 0%, rgba(${r * 0.3},${g * 0.3},${b * 0.3},0.6) 50%, #1c1c1e 100%)
      `
    }
    img.src = coverUrl
  }

  function loadSettings() {
    const fontSize = localStorage.getItem('desk-lyrics-font-size')
    if (fontSize) {
      els.fontSlider.value = fontSize
      document.documentElement.style.setProperty('--lyric-font-size', fontSize + 'px')
      els.fontValue.textContent = fontSize + 'px'
    }

    const offset = localStorage.getItem('desk-lyrics-offset')
    if (offset) {
      currentOffset = parseInt(offset) || 0
      renderer.setOffset(currentOffset)
      els.offsetValue.textContent = (currentOffset / 1000).toFixed(1) + 's'
    }
  }

  init()
})()
