import Phaser from 'phaser'
import { screenSize } from '../gameConfig.json'

export class HighScoreScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HighScoreScene' })
  }

  init(data) {
    // Data passed from game
    this.totalScore = data.totalScore || 0
    this.maxHeight = data.maxHeight || 0
    this.viewOnly = data.viewOnly || false // When viewing from title screen
  }

  create() {
    const screenWidth = screenSize.width.value
    const screenHeight = screenSize.height.value

    // Load mute state from localStorage
    const audioMuted = localStorage.getItem('audioMuted') === 'true'
    this.sound.mute = audioMuted

    // Dim overlay
    this.add.rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.85)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1000)

    // Load leaderboard
    this.leaderboard = this.loadLeaderboard()

    // If viewing from title, just show leaderboard
    if (this.viewOnly) {
      this.showLeaderboardOnly()
      return
    }

    // Always show leaderboard immediately after game over
    // Display player's recent run at the top, then leaderboard
    this.showLeaderboardWithPlayerScore()
  }

  // Data & Persistence
  loadLeaderboard() {
    try {
      const data = localStorage.getItem('leaderboard_v1')
      return data ? JSON.parse(data) : []
    } catch (e) {
      console.error('Failed to load leaderboard:', e)
      return []
    }
  }

  saveLeaderboard(leaderboard) {
    try {
      localStorage.setItem('leaderboard_v1', JSON.stringify(leaderboard))
      return true
    } catch (e) {
      console.error('Failed to save leaderboard:', e)
      this.showToast('Saved locally for this session')
      return false
    }
  }

  checkIfHighScore(score, height) {
    if (this.leaderboard.length < 10) return true
    const lastEntry = this.leaderboard[this.leaderboard.length - 1]
    return score > lastEntry.score || (score === lastEntry.score && height > lastEntry.height)
  }

  // Show leaderboard with player score (after game over)
  showLeaderboardWithPlayerScore() {
    const screenWidth = screenSize.width.value
    const screenHeight = screenSize.height.value

    // Title with gentle fade-in
    const title = this.add.text(screenWidth / 2, screenHeight * 0.06, 'HIGH SCORES', {
      fontFamily: 'SupercellMagic',
      fontSize: Math.min(screenWidth / 10, 38) + 'px',
      fill: '#FFD700',
      stroke: '#8B4513',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5).setDepth(1001).setAlpha(0)

    // Fade in title
    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 500,
      ease: 'Power2'
    })

    // Display player's recent run at the top
    this.add.text(screenWidth / 2, screenHeight * 0.14, 'YOUR SCORE:', {
      fontFamily: 'SupercellMagic',
      fontSize: '18px',
      fill: '#AAAAAA',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5).setDepth(1001)

    this.add.text(screenWidth / 2, screenHeight * 0.19, `${this.totalScore}`, {
      fontFamily: 'SupercellMagic',
      fontSize: '28px',
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5).setDepth(1001)

    this.add.text(screenWidth / 2, screenHeight * 0.24, `HEIGHT: ${this.maxHeight}m`, {
      fontFamily: 'SupercellMagic',
      fontSize: '16px',
      fill: '#00FF88',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5).setDepth(1001)

    // Divider line
    this.add.rectangle(screenWidth / 2, screenHeight * 0.30, screenWidth * 0.85, 2, 0xFFD700)
      .setDepth(1001)

    // Display Top 10 Leaderboard
    this.displayLeaderboardTable(screenHeight * 0.35)

    // Check if player qualifies for Top 10
    const qualifiesForTop10 = this.checkIfHighScore(this.totalScore, this.maxHeight)

    if (qualifiesForTop10) {
      // Show name entry
      this.createNameEntryUI()
    } else {
      // Show skip/continue button
      this.createSkipButton()
    }
  }

  // Name entry UI (only shown if player qualifies for Top 10)
  createNameEntryUI() {
    const screenWidth = screenSize.width.value
    const screenHeight = screenSize.height.value

    // Input box
    this.add.rectangle(screenWidth / 2, screenHeight * 0.78, 280, 48, 0x333333)
      .setStrokeStyle(3, 0xFFD700)
      .setDepth(1001)

    this.playerName = ''
    this.nameText = this.add.text(screenWidth / 2, screenHeight * 0.78, '_', {
      fontFamily: 'SupercellMagic',
      fontSize: '24px',
      fill: '#FFD700',
      align: 'center'
    }).setOrigin(0.5).setDepth(1002)

    // Instructions
    this.add.text(screenWidth / 2, screenHeight * 0.72, 'Enter Your Name (Top 10!)', {
      fontFamily: 'SupercellMagic',
      fontSize: '16px',
      fill: '#FFD700',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5).setDepth(1001)

    // Large OK button at bottom center (mobile friendly)
    const okBtn = this.add.text(screenWidth / 2, screenHeight * 0.90, 'OK', {
      fontFamily: 'SupercellMagic',
      fontSize: '32px',
      fill: '#00FF00',
      stroke: '#000000',
      strokeThickness: 5,
      padding: { x: 40, y: 15 }
    }).setOrigin(0.5).setDepth(1001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.submitName())

    // Setup keyboard input
    this.setupNameInput()
  }

  // Skip/Continue button (shown if score doesn't qualify for Top 10)
  createSkipButton() {
    const screenWidth = screenSize.width.value
    const screenHeight = screenSize.height.value

    // Large Skip/Continue button at bottom center (mobile friendly)
    const skipBtn = this.add.text(screenWidth / 2, screenHeight * 0.88, 'CONTINUE', {
      fontFamily: 'SupercellMagic',
      fontSize: '32px',
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 5,
      padding: { x: 40, y: 15 }
    }).setOrigin(0.5).setDepth(1001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.returnToTitle())

    // Allow Enter key to continue
    this.input.keyboard.on('keydown-ENTER', () => this.returnToTitle())
    this.input.keyboard.on('keydown-SPACE', () => this.returnToTitle())
  }

  setupNameInput() {
    this.nameInputHandler = (event) => {
      if (event.key === 'Enter') {
        this.submitName()
      } else if (event.key === 'Backspace') {
        this.playerName = this.playerName.slice(0, -1)
        this.updateNameDisplay()
      } else if (event.key.length === 1 && this.playerName.length < 10) {
        if (/^[a-zA-Z0-9 ]$/.test(event.key)) {
          this.playerName += event.key
          this.updateNameDisplay()
        }
      }
    }
    this.input.keyboard.on('keydown', this.nameInputHandler)
  }

  updateNameDisplay() {
    this.nameText.setText(this.playerName || '_')
  }

  submitName() {
    // Clean up input listener
    if (this.nameInputHandler) {
      this.input.keyboard.off('keydown', this.nameInputHandler)
    }
    
    let finalName = this.playerName.trim()
    
    // Default fallback name if empty
    if (!finalName) {
      finalName = this.generateFallbackName()
    }
    
    this.saveScore(finalName)
  }

  generateFallbackName() {
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    return `Player${randomNum}`
  }

  saveScore(name) {
    // Create new entry
    const newEntry = {
      name: name,
      score: this.totalScore,
      height: this.maxHeight,
      date: new Date().toISOString()
    }

    // Add to leaderboard
    this.leaderboard.push(newEntry)
    
    // Sort: Primary by score desc, Secondary by height desc
    this.leaderboard.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      return b.height - a.height
    })
    
    // Keep top 10 only
    this.leaderboard = this.leaderboard.slice(0, 10)
    
    // Save
    this.saveLeaderboard(this.leaderboard)
    
    // Play sound
    this.sound.add('ui_click', { volume: 0.3 }).play()
    
    // Show confirmation and return to title
    this.showConfirmationAndReturn()
  }

  showConfirmationAndReturn() {
    const screenWidth = screenSize.width.value
    const screenHeight = screenSize.height.value

    // Show quick confirmation text
    const confirmation = this.add.text(screenWidth / 2, screenHeight / 2, 'SAVED!', {
      fontFamily: 'SupercellMagic',
      fontSize: '48px',
      fill: '#00FF00',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center'
    }).setOrigin(0.5).setDepth(2000).setAlpha(0)

    // Fade in confirmation
    this.tweens.add({
      targets: confirmation,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        // Wait a moment then fade out and return to title
        this.time.delayedCall(800, () => {
          this.tweens.add({
            targets: confirmation,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => {
              this.returnToTitle()
            }
          })
        })
      }
    })
  }

  returnToTitle() {
    // Play sound
    this.sound.add('ui_click', { volume: 0.3 }).play()
    
    // Stop background music from game if it exists
    const gameScene = this.scene.get('GameScene')
    if (gameScene && gameScene.backgroundMusic) {
      gameScene.backgroundMusic.stop()
    }
    
    // Clean up listeners
    this.input.keyboard.removeAllListeners()
    this.input.removeAllListeners()
    
    // Stop scenes
    if (this.scene.isActive('GameScene')) {
      this.scene.stop('GameScene')
    }
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene')
    }
    
    // Fade out and start title
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('TitleScene')
    })
  }

  // Display Top 10 Leaderboard table
  displayLeaderboardTable(startY) {
    const screenWidth = screenSize.width.value
    const screenHeight = screenSize.height.value

    // Table header
    const headerY = startY
    const headerStyle = {
      fontFamily: 'SupercellMagic',
      fontSize: '14px',
      fill: '#FFD700',
      stroke: '#000000',
      strokeThickness: 2
    }
    
    this.add.text(screenWidth * 0.12, headerY, '#', headerStyle).setOrigin(0, 0.5).setDepth(1001)
    this.add.text(screenWidth * 0.28, headerY, 'Name', headerStyle).setOrigin(0, 0.5).setDepth(1001)
    this.add.text(screenWidth * 0.62, headerY, 'Score', headerStyle).setOrigin(0, 0.5).setDepth(1001)
    this.add.text(screenWidth * 0.88, headerY, 'Height', headerStyle).setOrigin(1, 0.5).setDepth(1001)

    // Entries
    const entriesStartY = startY + 28
    const lineHeight = 26
    const maxEntries = Math.min(this.leaderboard.length, 10) // Top 10 only

    if (this.leaderboard.length === 0) {
      this.add.text(screenWidth / 2, entriesStartY + 40, 'No scores yet!\nBe the first!', {
        fontFamily: 'SupercellMagic',
        fontSize: '18px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center',
        lineSpacing: 6
      }).setOrigin(0.5).setDepth(1001)
    } else {
      for (let i = 0; i < maxEntries; i++) {
        const entry = this.leaderboard[i]
        const rank = i + 1
        const y = entriesStartY + (i * lineHeight)
        
        // Highlight if this is the player's new score
        const isPlayerScore = !this.viewOnly && 
          entry.score === this.totalScore && 
          entry.height === this.maxHeight
        
        // Color based on rank or highlight
        let color = '#ffffff'
        let glowColor = null
        
        if (isPlayerScore) {
          color = '#00FFFF' // Cyan highlight for player
          glowColor = 0x00FFFF
        } else if (rank === 1) {
          color = '#FFD700' // Gold
        } else if (rank === 2) {
          color = '#C0C0C0' // Silver
        } else if (rank === 3) {
          color = '#CD7F32' // Bronze
        }
        
        const entryStyle = {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          fill: color,
          stroke: '#000000',
          strokeThickness: 2
        }
        
        const rankText = this.add.text(screenWidth * 0.12, y, `${rank}`, entryStyle).setOrigin(0, 0.5).setDepth(1001)
        const nameText = this.add.text(screenWidth * 0.28, y, entry.name.substring(0, 10), entryStyle).setOrigin(0, 0.5).setDepth(1001)
        const scoreText = this.add.text(screenWidth * 0.62, y, `${entry.score}`, entryStyle).setOrigin(0, 0.5).setDepth(1001)
        const heightText = this.add.text(screenWidth * 0.88, y, `${entry.height}`, entryStyle).setOrigin(1, 0.5).setDepth(1001)
        
        // Add subtle glow to player's score
        if (isPlayerScore && glowColor) {
          this.tweens.add({
            targets: [rankText, nameText, scoreText, heightText],
            alpha: 0.7,
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
          })
        }
      }
    }
  }

  // Show leaderboard only (from title screen)
  showLeaderboardOnly() {
    const screenWidth = screenSize.width.value
    const screenHeight = screenSize.height.value

    // Title
    this.add.text(screenWidth / 2, screenHeight * 0.08, 'HIGH SCORES', {
      fontFamily: 'SupercellMagic',
      fontSize: Math.min(screenWidth / 9, 42) + 'px',
      fill: '#FFD700',
      stroke: '#8B4513',
      strokeThickness: 6,
      align: 'center'
    }).setOrigin(0.5).setDepth(1001)

    // Display leaderboard
    this.displayLeaderboardTable(screenHeight * 0.18)

    // Continue button
    const continueBtn = this.add.text(screenWidth / 2, screenHeight * 0.88, 'BACK', {
      fontFamily: 'SupercellMagic',
      fontSize: '32px',
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 5,
      padding: { x: 40, y: 15 }
    }).setOrigin(0.5).setDepth(1001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.returnToTitle())

    // Enter key also works
    this.input.keyboard.on('keydown-ENTER', () => this.returnToTitle())
    this.input.keyboard.on('keydown-ESC', () => this.returnToTitle())
  }

  showToast(message) {
    const screenWidth = screenSize.width.value
    const screenHeight = screenSize.height.value
    
    const toast = this.add.text(screenWidth / 2, screenHeight * 0.1, message, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fill: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 15, y: 10 }
    }).setOrigin(0.5).setDepth(2000)
    
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: toast,
        alpha: 0,
        duration: 500,
        onComplete: () => toast.destroy()
      })
    })
  }
}
