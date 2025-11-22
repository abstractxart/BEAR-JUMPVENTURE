import Phaser from 'phaser'
import { screenSize } from '../gameConfig.json'

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' })
  }

  init(data) {
    this.gameSceneKey = data.gameSceneKey
  }

  create() {
    // 1) Read & apply persisted mute state to the *global* sound manager
    const audioMuted = localStorage.getItem('audioMuted') === 'true'
    this.game.sound.setMute(audioMuted)
    // keep local reference in sync too (usually same manager, but be explicit)
    this.sound.setMute(audioMuted)

    // 2) Make sure this UI scene sits on top visually AND for input
    this.scene.bringToTop()
    this.input.setTopOnly(true) // UI should win input over lower scenes

    // 3) Score/height/boost UI (unchanged)
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontFamily: 'SupercellMagic',
      fontSize: '24px',
      color: '#000000',
      stroke: '#ffffff',
      strokeThickness: 4
    }).setScrollFactor(0).setDepth(100)

    this.heightText = this.add.text(20, 50, 'Height: 0m', {
      fontFamily: 'SupercellMagic',
      fontSize: '20px',
      color: '#000000',
      stroke: '#ffffff',
      strokeThickness: 4
    }).setScrollFactor(0).setDepth(100)

    this.boostText = this.add.text(screenSize.width.value / 2, 80, '', {
      fontFamily: 'SupercellMagic',
      fontSize: '20px',
      color: '#FFD700',
      stroke: '#8B4513',
      strokeThickness: 4
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100)

    this.jesterHatTimer = this.add.text(screenSize.width.value / 2, 110, '', {
      fontFamily: 'SupercellMagic',
      fontSize: '18px',
      color: '#FF00FF',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100)

    // 💎 COCAINE BEAR: COMBO DISPLAY (moved higher and made smaller)
    this.comboText = this.add.text(screenSize.width.value / 2, 90, '', {
      fontFamily: 'SupercellMagic',
      fontSize: '22px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100)

    // 4) Create mute button with an explicit, generous hit area
    this.createMuteButton()

    // 5) Wire to the game scene events
    this.gameScene = this.scene.get(this.gameSceneKey)
    this.gameScene?.events.on('updateScore', this.updateScore, this)
    this.gameScene?.events.on('updateHeight', this.updateHeight, this)
    this.gameScene?.events.on('updateBoostStatus', this.updateBoostStatus, this)
    this.gameScene?.events.on('updateCombo', this.updateCombo, this) // 💎 COCAINE BEAR

    // 6) Listen for global mute changes (e.g., from a pause menu)
    this.game.events.on('audio:mute-changed', this.syncMuteIcon, this)
    
    // Clean up listener when scene shuts down
    this.events.once('shutdown', () => {
      this.game.events.off('audio:mute-changed', this.syncMuteIcon, this)
    })
  }

  createMuteButton() {
    const w = screenSize.width.value
    const icon = this.game.sound.mute ? '🔇' : '🔊'

    // Use a container so we can control hit area independently of text glyph size
    this.muteContainer = this.add.container(w - 60, 20).setDepth(1500).setScrollFactor(0)

    // Big transparent hit zone (44×44 is a good minimum tap target)
    const hit = this.add.rectangle(0, 0, 44, 44, 0x000000, 0).setOrigin(1, 0)
    hit.setInteractive({ useHandCursor: true })

    // The actual icon text
    this.muteTxt = this.add.text(-4, 0, icon, {
      fontSize: '28px',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(1, 0)

    this.muteContainer.add([hit, this.muteTxt])

    // Pointer handler on the rectangle (much more reliable than Text bounds)
    hit.on('pointerdown', () => {
      const newMuted = !this.game.sound.mute
      this.game.sound.setMute(newMuted)
      this.sound.setMute(newMuted) // keep local reference in sync
      localStorage.setItem('audioMuted', String(newMuted))

      // Update icon & notify other scenes (e.g., pause menu label)
      this.syncMuteIcon()
      this.game.events.emit('audio:mute-changed', newMuted)
    })
  }

  // Keep the icon in sync with the current mute state
  syncMuteIcon() {
    // Only update if this scene is active and the text exists
    if (!this.scene.isActive() || !this.muteTxt || !this.muteTxt.active) return
    this.muteTxt.setText(this.game.sound.mute ? '🔇' : '🔊')
  }

  update() {
    // F) Update jester hat timer
    if (this.gameScene && this.gameScene.player && this.gameScene.player.jesterHatActive) {
      const timeLeft = Math.max(0, this.gameScene.player.jesterHatEndTime - this.gameScene.time.now)
      const secondsLeft = Math.ceil(timeLeft / 1000)
      this.jesterHatTimer.setText(`🎩 JESTER HAT: ${secondsLeft}s`)
      this.jesterHatTimer.setVisible(true)
    } else {
      this.jesterHatTimer.setVisible(false)
    }
  }

  updateScore(score) {
    this.scoreText.setText(`Score: ${score}`)
  }

  updateHeight(height) {
    this.heightText.setText(`Height: ${height}m`)
  }

  updateBoostStatus(boostStatus) {
    this.boostText.setText(boostStatus)
  }

  // 💎 COCAINE BEAR: COMBO SYSTEM DISPLAY
  updateCombo(combo, multiplier) {
    if (combo < 5) {
      this.comboText.setText('')
      return
    }

    // Color code by multiplier tier
    let color = '#FFD700' // Gold (default)
    let text = `🔥 ${combo} COMBO!`

    if (multiplier >= 5.0) {
      color = '#FF00FF' // Magenta - INSANE
      text = `💎 ${combo} COMBO! 5X SCORE 💎`
      this.comboText.setFontSize('25px')
    } else if (multiplier >= 3.0) {
      color = '#FF4500' // Red-Orange - HUGE
      text = `🔥 ${combo} COMBO! 3X SCORE 🔥`
      this.comboText.setFontSize('24px')
    } else if (multiplier >= 2.0) {
      color = '#FFD700' // Gold - GOOD
      text = `⚡ ${combo} COMBO! 2X SCORE ⚡`
      this.comboText.setFontSize('22px')
    }

    this.comboText.setColor(color)
    this.comboText.setText(text)
  }
}
