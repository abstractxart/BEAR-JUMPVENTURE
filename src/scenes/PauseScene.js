import Phaser from 'phaser'
import { screenSize } from '../gameConfig.json'

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' })
  }

  create() {
    const screenWidth = screenSize.width.value
    const screenHeight = screenSize.height.value

    // Load mute state from localStorage
    const audioMuted = localStorage.getItem('audioMuted') === 'true'
    this.sound.mute = audioMuted

    // D) Semi-transparent overlay
    this.add.rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1000)

    // Title
    this.add.text(screenWidth / 2, screenHeight * 0.25, 'PAUSED', {
      fontFamily: 'SupercellMagic',
      fontSize: Math.min(screenWidth / 7, 50) + 'px',
      fill: '#FFD700',
      stroke: '#8B4513',
      strokeThickness: 6,
      align: 'center'
    }).setOrigin(0.5).setDepth(1001)

    // D) Resume button (I: thumb-reachable)
    const resumeBtn = this.add.text(screenWidth / 2, screenHeight * 0.50, 'RESUME', {
      fontFamily: 'SupercellMagic',
      fontSize: Math.min(screenWidth / 10, 38) + 'px',
      fill: '#00FF00',
      stroke: '#8B4513',
      strokeThickness: 5,
      padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setDepth(1001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.resumeGame())

    // D) Mute/Unmute button
    const muteText = this.sound.mute ? 'UNMUTE' : 'MUTE'
    const muteBtn = this.add.text(screenWidth / 2, screenHeight * 0.65, muteText, {
      fontFamily: 'SupercellMagic',
      fontSize: Math.min(screenWidth / 12, 32) + 'px',
      fill: '#FFFFFF',
      stroke: '#8B4513',
      strokeThickness: 4,
      padding: { x: 25, y: 12 }
    }).setOrigin(0.5).setDepth(1001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleMute(muteBtn))

    // D) Return to Title button
    const titleBtn = this.add.text(screenWidth / 2, screenHeight * 0.80, 'RETURN TO TITLE', {
      fontFamily: 'SupercellMagic',
      fontSize: Math.min(screenWidth / 13, 28) + 'px',
      fill: '#FF6666',
      stroke: '#8B4513',
      strokeThickness: 4,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(1001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.returnToTitle())

    // Setup keyboard shortcuts
    this.input.keyboard.on('keydown-ESC', () => this.resumeGame())
    this.input.keyboard.on('keydown-ENTER', () => this.resumeGame())
    
    // C) Mobile UX - Tap anywhere to resume (except buttons)
    this.input.on('pointerdown', (pointer) => {
      const clickedButton = [resumeBtn, muteBtn, titleBtn].some(btn => 
        btn.getBounds().contains(pointer.x, pointer.y)
      )
      if (!clickedButton) {
        this.resumeGame()
      }
    })
  }

  resumeGame() {
    this.sound.add('ui_click', { volume: 0.3 }).play()
    
    // Clean up listeners
    this.input.keyboard.removeAllListeners()
    this.input.removeAllListeners()
    
    // Resume game scene
    this.scene.resume('GameScene')
    this.scene.resume('UIScene')
    this.scene.stop()
  }

  toggleMute(muteBtn) {
    const newMuted = !this.game.sound.mute
    this.game.sound.setMute(newMuted)
    this.sound.setMute(newMuted)
    muteBtn.setText(newMuted ? 'UNMUTE' : 'MUTE')
    
    // Persist to localStorage
    localStorage.setItem('audioMuted', String(newMuted))
    
    // Notify all scenes
    this.game.events.emit('audio:mute-changed', newMuted)
    
    this.sound.add('ui_click', { volume: 0.3 }).play()
  }

  returnToTitle() {
    this.sound.add('ui_click', { volume: 0.3 }).play()
    
    // H) Stop all looping sounds before returning to title
    const gameScene = this.scene.get('GameScene')
    if (gameScene && gameScene.backgroundMusic) {
      gameScene.backgroundMusic.stop()
    }
    if (gameScene && gameScene.player && gameScene.player.jetpackSound) {
      gameScene.player.jetpackSound.stop()
    }
    
    // Clean up listeners
    this.input.keyboard.removeAllListeners()
    this.input.removeAllListeners()
    
    // Stop all scenes and return to title
    this.scene.stop('GameScene')
    this.scene.stop('UIScene')
    this.scene.stop()
    this.scene.start('TitleScene')
  }
}
