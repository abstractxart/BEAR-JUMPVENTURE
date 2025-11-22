import Phaser from 'phaser'
import { setupLoadingProgressUI } from '../utils.js'

export default class PreloaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloaderScene' })
  }

  preload() {
    // Load progress bar
    setupLoadingProgressUI(this)

    // Enable fallback for failed asset loads
    this.load.on('loaderror', (file) => {
      console.warn(`⚠️ Failed to load from CDN: ${file.key}`)
      console.log(`📦 Attempting fallback for: ${file.key}`)

      // Try local fallback path
      const fallbackPath = `assets/fallback/${file.key}.${this.getFileExtension(file.type)}`

      // Retry with local fallback
      if (file.type === 'image') {
        this.load.image(file.key, fallbackPath)
      } else if (file.type === 'audio') {
        this.load.audio(file.key, fallbackPath)
      } else if (file.type === 'font') {
        // Fonts need special handling - use system font as ultimate fallback
        console.log(`🔤 Using system font fallback for: ${file.key}`)
      }
    })

    // Load asset pack by type (using Vite BASE_URL for deployment subdirectory support)
    this.load.pack('assetPack', `${import.meta.env.BASE_URL}assets/asset-pack.json`)
  }

  getFileExtension(type) {
    const extensions = {
      'image': 'png',
      'audio': 'mp3',
      'font': 'ttf'
    }
    return extensions[type] || 'png'
  }

  create() {
    // Load and apply mute state from localStorage before starting any scene
    const audioMuted = localStorage.getItem('audioMuted') === 'true'
    this.sound.mute = audioMuted

    // Start title scene after loading complete
    this.scene.start('TitleScene')
  }
}
