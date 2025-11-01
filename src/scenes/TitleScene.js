import Phaser from 'phaser'
import { screenSize } from '../gameConfig.json'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' })
  }

  preload() {
    // All assets are already loaded by PreloaderScene
    // No need to load anything here
  }

  create() {
    // J) Load mute state from localStorage
    const audioMuted = localStorage.getItem('audioMuted') === 'true'
    this.sound.mute = audioMuted

    // Create Bear Jumpventure title background
    const screenWidth = screenSize.width.value
    const screenHeight = screenSize.height.value
    
    // Create full screen background with the Bear Jumpventure title image
    const bg = this.add.image(screenWidth / 2, screenHeight / 2, "bear_jumpventure_title_bg")
    bg.setOrigin(0.5, 0.5)
    
    // Scale to fit screen while maintaining aspect ratio
    const scaleX = screenWidth / bg.width
    const scaleY = screenHeight / bg.height
    const scale = Math.max(scaleX, scaleY)
    bg.setScale(scale)
    bg.setDepth(-100)

    this.createUI()
    this.setupInputs()
  }

  createUI() {
    const screenWidth = screenSize.width.value
    const screenHeight = screenSize.height.value
    
    // B) Mute/Unmute button (top right)
    this.createMuteButton()
    
    // Main START button
    const startBtn = this.add.text(screenWidth / 2, screenHeight * 0.55, 'START', {
      fontFamily: 'SupercellMagic',
      fontSize: Math.min(screenWidth / 8, 48) + 'px',
      fill: '#FFD700',
      stroke: '#8B4513',
      strokeThickness: 6,
      padding: { x: 40, y: 20 }
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startGame())

    // Add pulse animation to start button
    this.tweens.add({
      targets: startBtn,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })

    // B) View High Scores button
    const highScoresBtn = this.add.text(screenWidth / 2, screenHeight * 0.70, 'VIEW HIGH SCORES', {
      fontFamily: 'SupercellMagic',
      fontSize: Math.min(screenWidth / 12, 32) + 'px',
      fill: '#FFFFFF',
      stroke: '#8B4513',
      strokeThickness: 5,
      padding: { x: 30, y: 15 }
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.viewHighScores())

    // Create instruction text
    this.createInstructionText()
  }

  // B) Mute toggle button
  createMuteButton() {
    const screenWidth = screenSize.width.value
    
    this.muteBtn = this.add.text(screenWidth - 20, 20, this.sound.mute ? '🔇' : '🔊', {
      fontSize: '32px',
      padding: { x: 10, y: 10 }
    }).setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleMute())
  }

  toggleMute() {
    const newMuted = !this.game.sound.mute
    this.game.sound.setMute(newMuted)
    this.sound.setMute(newMuted)
    this.muteBtn.setText(newMuted ? '🔇' : '🔊')
    
    // J) Persist to localStorage
    localStorage.setItem('audioMuted', String(newMuted))
    
    // Notify all scenes
    this.game.events.emit('audio:mute-changed', newMuted)
    
    // Play click sound (will only play if not muted)
    this.sound.add("ui_click", { volume: 0.3 }).play()
  }

  createInstructionText() {
    const screenWidth = screenSize.width.value
    const screenHeight = screenSize.height.value
    
    // Create control instruction text at bottom
    const controlsText = `← → : Move   •   SPACE : Jetpack\nStomp enemies! Collect coins!`

    this.add.text(screenWidth / 2, screenHeight * 0.88, controlsText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: Math.min(screenWidth / 28, 14) + 'px',
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5)
  }

  setupInputs() {
    // C) Mobile UX - Tap anywhere can also start (but not on buttons)
    this.input.on('pointerdown', (pointer) => {
      // Check if clicking on a button
      const clickedOnButton = this.children.list.some(child => {
        if (child.input && child.input.enabled) {
          const bounds = child.getBounds()
          return bounds.contains(pointer.x, pointer.y)
        }
        return false
      })
      
      if (!clickedOnButton) {
        this.startGame()
      }
    })

    // Listen for keyboard events
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this.enterKey.on('down', () => {
      this.startGame()
    })

    this.spaceKey.on('down', () => {
      this.startGame()
    })
  }

  startGame() {
    // Play click sound effect
    this.sound.add("ui_click", { volume: 0.3 }).play()
    
    // Start game
    this.scene.start('GameScene')
  }

  viewHighScores() {
    // Play click sound effect
    this.sound.add("ui_click", { volume: 0.3 }).play()
    
    // Open high scores in view-only mode
    this.scene.start('HighScoreScene', { viewOnly: true })
  }
}
