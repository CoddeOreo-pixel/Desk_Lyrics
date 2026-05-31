# Desk Lyrics 🎵

局域网实时歌词投射器——在 PC 端网易云音乐播放歌曲，平板（或任何设备）打开网页即可实时显示歌词。

## 功能

- **实时歌词同步**：自动检测网易云音乐 PC 客户端正在播放的歌曲，实时获取并推送歌词
- **双语歌词**：支持原文 + 翻译对照显示
- **播放控制**：上一首 / 播放暂停 / 下一首，通过 Windows 媒体键控制 NCM 客户端
- **多主题**：暗黑沉浸风、野兽主义、Apple Music 风格，一键切换
- **沉浸模式**：隐藏所有 UI 元素，只留歌词
- **歌词偏移**：手动调整歌词时间偏移，解决歌词不同步问题
- **字体大小**：可调节歌词字体大小
- **全屏模式**：浏览器全屏显示
- **二维码**：启动时自动生成局域网二维码，平板扫码即开

## 前置要求

- **操作系统**：Windows（通过 PowerShell 获取 NCM 窗口标题和发送媒体键）
- **Node.js**：v16+
- **网易云音乐 PC 客户端**：运行中

## 安装

```bash
git clone <repo-url>
cd Desk_Lyrics
npm install
```

## 使用

### 1. 启动服务

```bash
npm start
```

终端会显示：

```
╔══════════════════════════════════════╗
║       Desk_Lyrics 歌词投射器          ║
╠══════════════════════════════════════╣
║  本机访问: http://localhost:3210
║  局域网:   http://192.168.x.x:3210
╠══════════════════════════════════════╣
║  扫描二维码在平板上打开:              ║
╚══════════════════════════════════════╝
```

### 2. 打开网易云音乐

在 PC 上打开网易云音乐客户端并播放歌曲。服务会自动检测正在播放的歌曲。

### 3. 打开网页

在平板（或任何同局域网设备）的浏览器中访问终端显示的局域网地址，或扫描二维码。

## 项目结构

```
Desk_Lyrics/
├── server/
│   ├── index.js              # Express + WebSocket 服务器入口
│   ├── ws-handler.js         # WebSocket 消息协议处理
│   └── services/
│       ├── ncm-local.js      # NCM 客户端检测、窗口标题解析、媒体键控制
│       ├── ncm-cloud.js      # 网易云音乐 API（歌词/歌曲详情/搜索）
│       ├── lyrics-parser.js  # LRC 歌词解析器
│       ├── player-state.js   # 播放状态管理（轮询 + 事件驱动）
│       └── crypto.js         # API 加密模块
├── public/
│   ├── index.html            # 前端页面
│   ├── css/
│   │   ├── base.css          # 基础样式 + 沉浸模式
│   │   └── themes/
│   │       ├── dark-immersive.css  # 暗黑沉浸风
│   │       ├── brutalism.css       # 野兽主义
│   │       └── apple-music.css     # Apple Music 风
│   └── js/
│       ├── app.js            # 前端主逻辑
│       ├── lyrics-renderer.js # 歌词渲染引擎
│       ├── ws-client.js      # WebSocket 客户端（自动重连）
│       └── theme-manager.js  # 主题管理
├── package.json
└── PRD.md                    # 产品需求文档
```

## 工作原理

1. **歌曲检测**：每秒通过 PowerShell 获取网易云音乐窗口标题（格式：`歌曲名 - 艺术家`），解析出当前播放的歌曲
2. **歌曲匹配**：通过 NeteaseCloudMusicApi 搜索匹配歌曲 ID，获取歌词和封面
3. **实时同步**：服务端维护播放进度，通过 WebSocket 推送给前端；前端用 `requestAnimationFrame` 本地计时 + 服务端校准，实现低延迟歌词滚动
4. **播放控制**：通过 Windows `keybd_event` API 发送媒体键（播放/暂停/上一首/下一首），控制 NCM 客户端

## 技术栈

- **后端**：Node.js + Express + WebSocket (ws)
- **前端**：原生 HTML/CSS/JS，零框架依赖
- **API**：NeteaseCloudMusicApi（歌词、歌曲详情、搜索）
- **歌词渲染**：CSS `transform: translateY()` GPU 合成层滚动 + 二分查找当前行
