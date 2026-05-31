const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

const NCM_DATA_DIR = path.join(
  process.env.USERPROFILE || os.homedir(),
  'AppData', 'Local', 'NetEase', 'CloudMusic'
)
const PLAYING_LIST_PATH = path.join(NCM_DATA_DIR, 'webdata', 'file', 'playingList')

let ncmRunning = false
let lastWindowTitle = ''
let lastPlayingListMtime = null

function isNcmRunning() {
  try {
    const output = execSync(
      'tasklist /FI "IMAGENAME eq cloudmusic.exe" /NH 2>nul',
      { encoding: 'utf-8' }
    )
    return output.includes('cloudmusic.exe')
  } catch (e) {
    return false
  }
}

function getNcmWindowTitle() {
  try {
    const psScript = `
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$proc = Get-Process cloudmusic -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object -First 1
if ($proc) { [Console]::WriteLine($proc.MainWindowTitle) }
`
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
    const buf = execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { timeout: 8000, stdio: ['pipe', 'pipe', 'pipe'] })
    return buf.toString('utf-8').trim()
  } catch (e) {
    return ''
  }
}

function parseWindowTitle(title) {
  if (!title) return null
  const parts = title.split(' - ')
  if (parts.length >= 2) {
    const songName = parts[0].trim()
    const artist = parts.slice(1).join(' - ').trim()
    return { songName, artist }
  }
  if (parts.length === 1 && title.trim()) {
    return { songName: title.trim(), artist: '' }
  }
  return null
}

function readPlayingList() {
  try {
    if (!fs.existsSync(PLAYING_LIST_PATH)) return null
    const content = fs.readFileSync(PLAYING_LIST_PATH, 'utf-8')
    const data = JSON.parse(content)
    return data.list || []
  } catch (e) {
    return null
  }
}

function findSongInPlayingList(playingList, songName, artist) {
  if (!playingList || playingList.length === 0) return null
  for (const item of playingList) {
    const track = item.track
    if (!track) continue
    const nameMatch = !songName || track.name === songName || track.name.includes(songName) || songName.includes(track.name)
    const artistMatch = !artist || (track.artists && track.artists.some(a =>
      a.name === artist || a.name.includes(artist) || artist.includes(a.name)
    ))
    if (nameMatch && artistMatch) {
      return {
        id: parseInt(track.id),
        name: track.name,
        artist: track.artists ? track.artists.map(a => a.name).join(' / ') : '',
        album: track.album ? track.album.name : '',
        coverUrl: track.album ? (track.album.picUrl || track.album.cover || '') : '',
        duration: track.duration || 0
      }
    }
  }
  return null
}

function getFirstSongInPlayingList(playingList) {
  if (!playingList || playingList.length === 0) return null
  const item = playingList[0]
  const track = item.track
  if (!track) return null
  return {
    id: parseInt(track.id),
    name: track.name,
    artist: track.artists ? track.artists.map(a => a.name).join(' / ') : '',
    album: track.album ? track.album.name : '',
    coverUrl: track.album ? (track.album.picUrl || track.album.cover || '') : '',
    duration: track.duration || 0
  }
}

async function discover() {
  ncmRunning = isNcmRunning()
  if (ncmRunning) {
    console.log('[NCM Local] NCM client is running')
    const title = getNcmWindowTitle()
    if (title) {
      console.log(`[NCM Local] Window title: ${title}`)
    }
  } else {
    console.log('[NCM Local] NCM client is NOT running')
  }
  return { ncmRunning }
}

function getCurrentSongInfo() {
  if (!isNcmRunning()) return null

  const title = getNcmWindowTitle()
  if (!title) return null

  return getSongInfoFromTitle(title)
}

function getSongInfoFromTitle(title) {
  const parsed = parseWindowTitle(title)
  if (!parsed) return null

  const playingList = readPlayingList()
  if (playingList && playingList.length > 0) {
    const matched = findSongInPlayingList(playingList, parsed.songName, parsed.artist)
    if (matched) return matched
  }

  return {
    id: null,
    name: parsed.songName,
    artist: parsed.artist,
    album: '',
    coverUrl: '',
    duration: 0
  }
}

function isPlaying() {
  return isNcmRunning() && getNcmWindowTitle().length > 0
}

function sendMediaKey(key) {
  const vkMap = {
    play: 0xB3,
    pause: 0xB3,
    prev: 0xB1,
    next: 0xB0
  }

  const vk = vkMap[key]
  if (!vk) return false

  try {
    const psScript = `
$ProgressPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class MediaKey {
  [DllImport("user32.dll")]
  public static extern void keybd_event(byte vk, byte scan, uint flags, IntPtr extra);
}
"@
[MediaKey]::keybd_event(${vk}, 0, 0, [IntPtr]::Zero)
[MediaKey]::keybd_event(${vk}, 0, 2, [IntPtr]::Zero)
`
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
    execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { timeout: 8000, stdio: ['pipe', 'pipe', 'pipe'] })
    return true
  } catch (e) {
    return false
  }
}

module.exports = {
  discover,
  isNcmRunning,
  isPlaying,
  getCurrentSongInfo,
  getSongInfoFromTitle,
  getNcmWindowTitle,
  parseWindowTitle,
  readPlayingList,
  findSongInPlayingList,
  sendMediaKey,
  get NCM_DATA_DIR() { return NCM_DATA_DIR }
}
