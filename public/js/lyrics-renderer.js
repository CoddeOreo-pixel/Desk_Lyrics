class LyricsRenderer {
  constructor() {
    this.lyrics = []
    this.currentLineIndex = -1
    this.container = document.getElementById('lyrics-body')
    this.placeholder = document.getElementById('lyrics-placeholder')
    this.lyricsContainer = document.getElementById('lyrics-container')
    this.lineElements = []
    this.offset = 0
    this.linePositions = []
    this.containerHeight = 0
    this.prevActiveEl = null
    this.prevNearEls = []
  }

  setLyrics(lyrics) {
    this.lyrics = lyrics || []
    this.currentLineIndex = -1
    this.prevActiveEl = null
    this.prevNearEls = []
    this.container.style.transform = 'translateY(0)'
    this.render()
    this.cachePositions()
  }

  setOffset(offset) {
    this.offset = offset
  }

  render() {
    if (this.lyrics.length === 0) {
      this.container.innerHTML = ''
      this.placeholder.classList.remove('hidden')
      return
    }

    this.placeholder.classList.add('hidden')
    this.container.innerHTML = ''
    this.lineElements = []

    const spacerTop = document.createElement('div')
    spacerTop.className = 'lyric-spacer'
    this.container.appendChild(spacerTop)

    for (let i = 0; i < this.lyrics.length; i++) {
      const line = this.lyrics[i]
      const el = document.createElement('div')
      el.className = 'lyric-line'
      el.dataset.index = i

      const textSpan = document.createElement('span')
      textSpan.className = 'lyric-text'
      textSpan.textContent = line.text
      el.appendChild(textSpan)

      if (line.translation) {
        const transEl = document.createElement('div')
        transEl.className = 'lyric-translation'
        transEl.textContent = line.translation
        el.appendChild(transEl)
      }

      this.container.appendChild(el)
      this.lineElements.push(el)
    }

    const spacerBottom = document.createElement('div')
    spacerBottom.className = 'lyric-spacer'
    this.container.appendChild(spacerBottom)
  }

  cachePositions() {
    if (this.lineElements.length === 0) return
    this.containerHeight = this.lyricsContainer.clientHeight
    this.linePositions = []
    for (let i = 0; i < this.lineElements.length; i++) {
      const el = this.lineElements[i]
      this.linePositions.push({
        top: el.offsetTop,
        height: el.offsetHeight
      })
    }
  }

  updateProgress(currentTime) {
    if (this.lyrics.length === 0) return

    const adjustedTime = currentTime + this.offset
    const newIndex = this.findCurrentLine(adjustedTime)

    if (newIndex === this.currentLineIndex) return
    this.currentLineIndex = newIndex
    this.highlightLine(newIndex)
    this.scrollToLine(newIndex)
  }

  findCurrentLine(time) {
    let lo = 0
    let hi = this.lyrics.length - 1
    let result = -1
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      if (this.lyrics[mid].time <= time) {
        result = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    return result
  }

  highlightLine(newIndex) {
    if (this.prevActiveEl) {
      this.prevActiveEl.classList.remove('active')
      this.prevActiveEl = null
    }
    for (const el of this.prevNearEls) {
      el.classList.remove('near')
    }
    this.prevNearEls = []

    if (newIndex < 0 || newIndex >= this.lineElements.length) return

    const newEl = this.lineElements[newIndex]
    newEl.classList.add('active')
    this.prevActiveEl = newEl

    for (let d = 1; d <= 2; d++) {
      const nearIdxs = [newIndex - d, newIndex + d]
      for (const ni of nearIdxs) {
        if (ni >= 0 && ni < this.lineElements.length) {
          const nearEl = this.lineElements[ni]
          nearEl.classList.add('near')
          this.prevNearEls.push(nearEl)
        }
      }
    }
  }

  scrollToLine(index) {
    if (index < 0 || index >= this.linePositions.length) return

    const pos = this.linePositions[index]
    if (!pos) return

    const targetY = pos.top - this.containerHeight / 2 + pos.height / 2
    this.container.style.transform = `translateY(${-targetY}px)`
  }

  clear() {
    this.lyrics = []
    this.currentLineIndex = -1
    this.container.innerHTML = ''
    this.lineElements = []
    this.linePositions = []
    this.prevActiveEl = null
    this.prevNearEls = []
    this.placeholder.classList.remove('hidden')
  }

  on(event, callback) {
    if (!this._listeners) this._listeners = new Map()
    if (!this._listeners.has(event)) this._listeners.set(event, [])
    this._listeners.get(event).push(callback)
  }

  emit(event, data) {
    if (!this._listeners || !this._listeners.has(event)) return
    for (const cb of this._listeners.get(event)) {
      cb(data)
    }
  }
}

const lyricsRenderer = new LyricsRenderer()
