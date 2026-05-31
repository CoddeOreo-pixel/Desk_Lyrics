const express = require('express')
const http = require('http')
const path = require('path')
const os = require('os')
const qrcode = require('qrcode-terminal')
const { setupWebSocket } = require('./ws-handler')
const playerState = require('./services/player-state')
const ncmCloud = require('./services/ncm-cloud')

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 3210

app.use(express.static(path.join(__dirname, '..', 'public')))
app.use(express.json())

app.get('/api/status', (req, res) => {
  res.json(playerState.getFullState())
})

app.post('/api/song/manual', async (req, res) => {
  const { songId } = req.body
  if (!songId) return res.status(400).json({ error: 'songId required' })
  await playerState.setManualSong(songId)
  res.json({ success: true })
})

app.post('/api/control/:action', async (req, res) => {
  const { action } = req.params
  if (!['play', 'pause', 'prev', 'next'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' })
  }
  const success = await playerState.control(action)
  res.json({ success })
})

app.get('/api/search', async (req, res) => {
  const { keyword, limit } = req.query
  if (!keyword) return res.status(400).json({ error: 'keyword required' })
  const results = await ncmCloud.search(keyword, parseInt(limit) || 10)
  res.json({ results })
})

function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
}

async function start() {
  setupWebSocket(server, playerState)

  await playerState.start()

  server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP()
    const url = `http://${localIP}:${PORT}`

    console.log('')
    console.log('╔══════════════════════════════════════╗')
    console.log('║       Desk_Lyrics 歌词投射器          ║')
    console.log('╠══════════════════════════════════════╣')
    console.log(`║  本机访问: http://localhost:${PORT}      `)
    console.log(`║  局域网:   ${url}  `)
    console.log('╠══════════════════════════════════════╣')
    console.log('║  扫描二维码在平板上打开:              ║')
    console.log('╚══════════════════════════════════════╝')
    console.log('')

    qrcode.generate(url, { small: true }, (qr) => {
      console.log(qr)
    })

    console.log('')
    console.log(`[Desk_Lyrics] Server running at ${url}`)
    if (!playerState.connected) {
      console.log('[Desk_Lyrics] NCM client not detected. Use manual mode to input song ID.')
    }
    console.log('[Desk_Lyrics] Press Ctrl+C to stop')
  })
}

function shutdown() {
  console.log('\n[Desk_Lyrics] Shutting down...')
  playerState.stop()
  server.close(() => {
    console.log('[Desk_Lyrics] Server stopped.')
    process.exit(0)
  })
  setTimeout(() => {
    console.log('[Desk_Lyrics] Force exit.')
    process.exit(0)
  }, 3000)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start().catch(err => {
  console.error('[Desk_Lyrics] Failed to start:', err)
  process.exit(1)
})
