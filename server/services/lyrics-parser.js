function parseLRC(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return []

  const lines = lrcText.split('\n')
  const result = []
  const dotRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g
  const colonRegex = /\[(\d{2}):(\d{2}):(\d{2})\]/g

  for (const line of lines) {
    const times = []
    let match

    while ((match = dotRegex.exec(line)) !== null) {
      const min = parseInt(match[1])
      const sec = parseInt(match[2])
      const ms = match[3].length === 2 ? parseInt(match[3]) * 10 : parseInt(match[3])
      times.push(min * 60 * 1000 + sec * 1000 + ms)
    }

    while ((match = colonRegex.exec(line)) !== null) {
      const min = parseInt(match[1])
      const sec = parseInt(match[2])
      const frames = parseInt(match[3])
      const ms = frames * 10
      times.push(min * 60 * 1000 + sec * 1000 + ms)
    }

    const text = line
      .replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '')
      .replace(/\[\d{2}:\d{2}:\d{2}\]/g, '')
      .trim()

    if (times.length > 0 && text) {
      for (const time of times) {
        result.push({ time, text })
      }
    }
  }

  result.sort((a, b) => a.time - b.time)
  return result
}

function mergeTranslation(original, translation) {
  if (!translation || translation.length === 0) return original.map(l => ({ ...l, translation: '' }))

  const transMap = new Map()
  for (const t of translation) {
    transMap.set(t.time, t.text)
  }

  return original.map(line => {
    let transText = transMap.get(line.time) || ''
    if (!transText) {
      const lowerKey = [...transMap.keys()].find(k => Math.abs(k - line.time) < 100)
      if (lowerKey !== undefined) {
        transText = transMap.get(lowerKey)
      }
    }
    return { ...line, translation: transText }
  })
}

function findCurrentLine(lyrics, currentTime) {
  if (!lyrics || lyrics.length === 0) return -1

  let low = 0
  let high = lyrics.length - 1
  let result = -1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (lyrics[mid].time <= currentTime) {
      result = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return result
}

function isMetadataLine(text) {
  const metaPatterns = /^(作词|作曲|编曲|制作人|混音|录音|和声|吉他|贝斯|鼓|键盘|弦乐|指挥|监制|出品|词|曲|Lyrics|Music|Words|Compose|Arrangement|Vocal|Guitar|Bass|Drum|Keyboard|Producer|Mix|Record)/i
  return metaPatterns.test(text)
}

function filterLyrics(lyrics) {
  return lyrics.filter(l => !isMetadataLine(l.text))
}

module.exports = { parseLRC, mergeTranslation, findCurrentLine, isMetadataLine, filterLyrics }
