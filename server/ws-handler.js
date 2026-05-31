const { WebSocketServer } = require('ws')

function setupWebSocket(server, playerState) {
  const wss = new WebSocketServer({ server, path: '/ws' })
  const clients = new Set()

  wss.on('connection', (ws) => {
    clients.add(ws)
    console.log(`[WS] Client connected. Total: ${clients.size}`)

    const fullState = playerState.getFullState()
    ws.send(JSON.stringify({ type: 'init', data: fullState }))

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        handleClientMessage(ws, msg, playerState)
      } catch (e) {
        console.error('[WS] Invalid message:', e.message)
      }
    })

    ws.on('close', () => {
      clients.delete(ws)
      console.log(`[WS] Client disconnected. Total: ${clients.size}`)
    })

    ws.on('error', (err) => {
      console.error('[WS] Error:', err.message)
      clients.delete(ws)
    })
  })

  function broadcast(type, data) {
    const msg = JSON.stringify({ type, data })
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send(msg)
      }
    }
  }

  playerState.on('song:change', (song) => broadcast('song:change', song))
  playerState.on('lyrics:load', (data) => broadcast('lyrics:load', data))
  playerState.on('progress:update', (data) => broadcast('progress:update', data))
  playerState.on('player:state', (data) => broadcast('player:state', data))
  playerState.on('state:change', (data) => broadcast('state:change', data))

  return wss
}

async function handleClientMessage(ws, msg, playerState) {
  switch (msg.type) {
    case 'control:play':
    case 'control:pause':
    case 'control:prev':
    case 'control:next': {
      const action = msg.type.replace('control:', '')
      const success = await playerState.control(action)
      ws.send(JSON.stringify({ type: 'control:result', data: { action, success } }))
      break
    }
    case 'manual:song':
      if (msg.data?.songId) {
        await playerState.setManualSong(msg.data.songId)
      }
      break
    case 'search':
      if (msg.data?.keyword) {
        const results = await require('./services/ncm-cloud').search(msg.data.keyword, msg.data.limit || 10)
        ws.send(JSON.stringify({ type: 'search:result', data: results }))
      }
      break
    default:
      break
  }
}

module.exports = { setupWebSocket }
