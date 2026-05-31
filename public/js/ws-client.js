class WsClient {
  constructor() {
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 20
    this.reconnectDelay = 1000
    this.listeners = new Map()
    this.connected = false
  }

  connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${location.host}/ws`

    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.connected = true
      this.reconnectAttempts = 0
      this.reconnectDelay = 1000
      this.emit('connected')
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        this.emit(msg.type, msg.data)
      } catch (e) {
        console.error('[WS] Parse error:', e)
      }
    }

    this.ws.onclose = () => {
      this.connected = false
      this.emit('disconnected')
      this.scheduleReconnect()
    }

    this.ws.onerror = (err) => {
      console.error('[WS] Error:', err)
      this.connected = false
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnect_failed')
      return
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts),
      30000
    )

    setTimeout(() => {
      this.reconnectAttempts++
      this.emit('reconnecting', { attempt: this.reconnectAttempts })
      this.connect()
    }, delay)
  }

  send(type, data = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }))
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return
    const cbs = this.listeners.get(event)
    const idx = cbs.indexOf(callback)
    if (idx > -1) cbs.splice(idx, 1)
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return
    for (const cb of this.listeners.get(event)) {
      cb(data)
    }
  }
}

const wsClient = new WsClient()
