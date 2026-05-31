class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('desk-lyrics-theme') || 'dark-immersive'
    this.themes = ['dark-immersive', 'brutalism', 'apple-music']
    this.apply(this.currentTheme)
  }

  apply(theme) {
    if (!this.themes.includes(theme)) return
    this.currentTheme = theme
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('desk-lyrics-theme', theme)
    this.updateActiveButton()
  }

  toggle() {
    const idx = this.themes.indexOf(this.currentTheme)
    const next = this.themes[(idx + 1) % this.themes.length]
    this.apply(next)
  }

  updateActiveButton() {
    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === this.currentTheme)
    })
  }

  getCurrentTheme() {
    return this.currentTheme
  }
}

const themeManager = new ThemeManager()
