import Phaser from 'phaser'
import { Player } from '../Player.js'
import { Platform } from '../Platform.js'
import { Enemy } from '../Enemy.js'
import { GaryEnemy } from '../GaryEnemy.js'
import { Coin } from '../Coin.js'
import { RocketBooster } from '../RocketBooster.js'
import { JesterHat } from '../JesterHat.js'
import { JetpackUI } from '../JetpackUI.js'
import { DifficultyManager } from '../DifficultyManager.js'
import { setupLoadingProgressUI } from '../utils.js'
import { screenSize, platformConfig, enemyConfig, coinConfig, gameConfig } from '../gameConfig.json'

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  preload() {
    // All assets are already loaded by PreloaderScene
    // No need to load anything here
  }

  create() {
    // Initialize game state
    this.gameStarted = false
    this.gameOver = false
    this.score = 0
    this.highestY = 0

    // Height tracking (A)
    this.startY = 0 // Will be set when player spawns
    this.maxHeightClimbed = 0

    // 💎 COCAINE BEAR: COMBO SYSTEM
    this.combo = 0
    this.maxCombo = 0
    this.comboMultiplier = 1.0

    // Create fixed tileSprite background
    this.createTileBackground()

    // Create physics groups
    this.platforms = this.add.group()
    this.enemies = this.add.group()
    this.coins = this.add.group()
    this.rocketBoosters = this.add.group()
    this.jesterHats = this.add.group() // F) Jester hat powerups

    // Create player
    this.player = new Player(this, screenSize.width.value / 2, screenSize.height.value - 100)
    
    // Set starting Y for height tracking
    this.startY = this.player.y

    // Create jetpack UI
    this.jetpackUI = new JetpackUI(this)

    // Initialize difficulty manager
    this.difficulty = new DifficultyManager(this, {
      graceMs: 5000,      // 5 seconds grace period
      rampMs: 120000,     // 2 minutes to reach max difficulty
      useDiscreteLevels: false
    })
    this.difficulty.start()

    // Create initial platforms
    this.createInitialPlatforms()

    // Setup camera follow
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setLerp(0.1, 0.1)

    // Create input controls
    this.setupInputs()
    
    // Create jetpack boost button (hidden initially)
    this.createJetpackButton()
    
    // Create menu button
    this.createMenuButton()

    // Setup collision detection
    this.setupCollisions()

    // Launch UI scene
    this.scene.launch("UIScene", { gameSceneKey: this.scene.key })
    this.scene.bringToTop('UIScene')  // Make sure UI is above for input & depth

    // Platform generation related
    this.lastPlatformY = screenSize.height.value - 100
    this.platformSpacing = platformConfig.platformSpacing.value

    // Load mute state from localStorage
    const audioMuted = localStorage.getItem('audioMuted') === 'true'
    this.sound.mute = audioMuted

    // Play background music - Bearverse Anthem Chiptune
    this.backgroundMusic = this.sound.add("bearverse_anthem_chiptune", {
      volume: 0.4,
      loop: true
    })
    this.backgroundMusic.play()

    // Start game
    this.startGame()
  }

  createInitialPlatforms() {
    // Create initial platform under player
    const startPlatform = new Platform(this, screenSize.width.value / 2, screenSize.height.value - 50, 'normal')
    this.platforms.add(startPlatform)

    // Create some initial platforms
    for (let i = 1; i <= 5; i++) {
      const x = Phaser.Math.Between(80, screenSize.width.value - 80)
      const y = screenSize.height.value - 50 - (i * this.platformSpacing)
      const type = Platform.getRandomPlatformType()
      const platform = new Platform(this, x, y, type)
      this.platforms.add(platform)
    }
  }

  setupInputs() {
    this.cursors = this.input.keyboard.createCursorKeys()
    
    // Add SPACE key for jetpack
    this.cursors.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    
    // D) ESC key for pause menu
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    this.escKey.on('down', () => this.openPauseMenu())

    // Mobile touch controls - left/right half screen
    this.touchDirection = null // 'left', 'right', or null
    this.jetpackButtonPressed = false
    this.lastTouchDirection = null // Track previous frame's touch direction
    
    this.input.on('pointerdown', (pointer) => {
      // 💎 COCAINE BEAR: Check if clicking jetpack button - use SCREEN coords only!
      // Jetpack button has setScrollFactor(0) so it's in screen space, not world space
      if (this.jetpackButton && this.jetpackButton.visible) {
        const buttonBounds = this.jetpackButton.getBounds()
        // Use pointer.x/y directly without camera scroll since button is setScrollFactor(0)
        if (buttonBounds.contains(pointer.x, pointer.y)) {
          // Jetpack button is handled by its own events, just mark this pointer as jetpack
          this.jetpackPointerId = pointer.id
          return // 💎 Don't process this jetpack pointer as movement!
        }
      }

      // Screen split controls - left 50% = left, right 50% = right
      // This pointer is for movement (not jetpack)
      const screenCenterX = screenSize.width.value / 2
      if (pointer.x < screenCenterX) {
        this.touchDirection = 'left'
        this.movePointerId = pointer.id // Track which pointer is for movement
      } else {
        this.touchDirection = 'right'
        this.movePointerId = pointer.id
      }
    })

    this.input.on('pointermove', (pointer) => {
      // Only update direction if this is the movement pointer
      if (pointer.isDown && pointer.id === this.movePointerId) {
        const screenCenterX = screenSize.width.value / 2
        if (pointer.x < screenCenterX) {
          this.touchDirection = 'left'
        } else {
          this.touchDirection = 'right'
        }
      }
    })

    this.input.on('pointerup', (pointer) => {
      // Check if this is the jetpack pointer being released
      if (pointer.id === this.jetpackPointerId) {
        this.jetpackPointerId = null
      }
      
      // Check if this is the movement pointer being released
      if (pointer.id === this.movePointerId) {
        this.touchDirection = null
        this.movePointerId = null
      }
    })
  }

  setupCollisions() {
    // 💎 COCAINE BEAR: Use overlap (non-blocking) with manual jetpack phase prevention
    this.physics.add.overlap(this.player, this.platforms, (player, platform) => {
      const playerBottom = player.body.bottom
      const platformTop = platform.body.top
      const isFalling = player.body.velocity.y > 0
      const isApproachingFromAbove = player.y < platform.y

      // 💎 COCAINE BEAR: Manually stop player when landing on platform
      // This prevents jetpack phasing while allowing jump-through from below
      if (isFalling && isApproachingFromAbove) {
        // Check if player's bottom has crossed platform's top (NO UPPER LIMIT - catch all speeds!)
        const platformBottom = platform.body.bottom
        const hasLanded = playerBottom >= platformTop && playerBottom <= platformBottom

        if (hasLanded) {
          // Stop the player on top of platform
          player.y = platformTop - (player.body.height / 2) - 1
          player.body.setVelocityY(0)

          // Trigger platform bounce
          platform.onPlayerLand(player)

          // 💎 COCAINE BEAR: INCREMENT COMBO ON PLATFORM BOUNCE
          this.combo++
          this.maxCombo = Math.max(this.maxCombo, this.combo)

          // Calculate combo multiplier (2x at 5, 3x at 10, 5x at 15+)
          if (this.combo >= 15) {
            this.comboMultiplier = 5.0
          } else if (this.combo >= 10) {
            this.comboMultiplier = 3.0
          } else if (this.combo >= 5) {
            this.comboMultiplier = 2.0
          } else {
            this.comboMultiplier = 1.0
          }
        }
      }
    })

    // Player-enemy collision - stomp or collision
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
      // 💎 COCAINE BEAR: BUG FIX - Don't collide with dead enemies!
      if (enemy.isDead) return

      if (player.body.velocity.y > 0 && player.y < enemy.y) {
        // Player stomps enemy
        if (enemy instanceof GaryEnemy) {
          // Gary takes damage but doesn't die in one stomp
          enemy.takeDamage()
          player.jump() // Bounce after stomp
          this.updateScore(50) // Less score since Gary has more health
        } else if (enemy.stepOn()) {
          player.jump() // Bounce after stomp
          this.updateScore(100) // Gain score
        }
      } else {
        // Player hits enemy - only die if not invincible
        if (!player.isInvincible) {
          this.gameOver = true
          this.combo = 0 // 💎 COCAINE BEAR: Reset combo on death
          player.die()
        }
      }
    })
    
    // 💎 COCAINE BEAR: BUG FIX - Setup fireball collision once per Gary, not every frame!
    // This will be handled in the update loop by checking all Gary enemies

    // Player-coin collision
    this.physics.add.overlap(this.player, this.coins, (player, coin) => {
      const points = coin.collect(player)
      if (points > 0) {
        console.log(`Collected ${coin.coinType} coin - adding ${points} points`)
        this.updateScore(points)
        
        // E) Jetpack + Coins Synergy: Give extra upward boost during jetpack
        if (player.jetpack.active) {
          const currentVelY = player.body.velocity.y
          const boostVel = -gameConfig.jetpackCoinBoost.value
          player.body.setVelocityY(Math.min(currentVelY, boostVel))
          
          // Optional sparkle effect
          this.createCoinSparkle(coin.x, coin.y)
        }
      }
    })

    // Player-rocket booster collision
    this.physics.add.overlap(this.player, this.rocketBoosters, (player, rocket) => {
      if (rocket.collect(player)) {
        this.updateScore(100) // Bonus points for collecting rocket
      }
    })

    // F) Player-jester hat collision
    this.physics.add.overlap(this.player, this.jesterHats, (player, jesterHat) => {
      if (jesterHat.collect(player)) {
        this.updateScore(200) // Bonus points for collecting jester hat
      }
    })

    // Doge-platform collision - keep Doge on platforms
    this.physics.add.collider(this.enemies, this.platforms)
  }

  startGame() {
    this.gameStarted = true
    this.gameStartTime = this.time.now // Track start time for honey points
    // Give player initial upward velocity
    this.player.jump()
  }

  update() {
    if (!this.gameStarted || this.gameOver) return

    // Update difficulty manager
    this.difficulty.update()

    // Apply mobile touch controls
    // If touch is active, override keyboard controls
    if (this.touchDirection === 'left') {
      this.cursors.left.isDown = true
      this.cursors.right.isDown = false
      this.lastTouchDirection = 'left'
    } else if (this.touchDirection === 'right') {
      this.cursors.right.isDown = true
      this.cursors.left.isDown = false
      this.lastTouchDirection = 'right'
    } else if (this.lastTouchDirection !== null) {
      // Touch was just released - explicitly stop movement
      this.cursors.left.isDown = false
      this.cursors.right.isDown = false
      this.lastTouchDirection = null
    }
    // Otherwise, keyboard controls work naturally
    
    // Handle jetpack button (mobile button OR up arrow key)
    if (this.jetpackButtonPressed || this.cursors.up.isDown) {
      this.cursors.space.isDown = true
    } else {
      this.cursors.space.isDown = false
    }

    // Update player
    this.player.update(this.cursors)

    // Update platforms
    this.platforms.children.entries.forEach(platform => {
      if (platform.update) platform.update()
    })

    // Update enemies (pass time and player for Gary enemy)
    this.enemies.children.entries.forEach(enemy => {
      if (enemy.update) {
        // Gary enemy needs time and player reference
        if (enemy instanceof GaryEnemy) {
          enemy.update(this.time.now, this.player)

          // 💎 COCAINE BEAR: Check fireball collision for this Gary
          if (enemy.fireballs && enemy.fireballs.children) {
            enemy.fireballs.children.entries.forEach(fireball => {
              if (fireball.active && this.physics.overlap(this.player, fireball)) {
                if (!this.player.isInvincible && !this.gameOver) {
                  this.gameOver = true
                  this.player.die()
                  fireball.destroy()
                }
              }
            })
          }
        } else {
          enemy.update()
        }
      }
    })

    // Update coins
    this.coins.children.entries.forEach(coin => {
      if (coin.update) coin.update()
    })

    // Update rocket boosters
    this.rocketBoosters.children.entries.forEach(rocket => {
      if (rocket.update) rocket.update()
    })

    // Update jester hats
    this.jesterHats.children.entries.forEach(hat => {
      if (hat.update) hat.update()
    })

    // Generate new platforms
    this.generateNewPlatforms()

    // Update background parallax
    this.updateBackgroundParallax()

    // Update score and height
    this.updateHeight()
    this.updateUI()

    // Clean up objects off screen
    this.cleanupOffScreenObjects()
  }

  createTileBackground() {
    const { width, height } = this.scale

    // Create tileSprite background that fills the screen and loops automatically
    this.bgTile = this.add.tileSprite(0, 0, width, height, 'castle_clouds_bg')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-100)

    // Parallax speed (pixels per second for vertical scrolling)
    this.parallaxSpeed = 10
  }

  updateBackgroundParallax() {
    // Tie background position to camera height for subtle depth effect
    const y = this.cameras.main.scrollY
    this.bgTile.tilePositionY = y * 0.2 // Slower parallax effect
  }

  generateNewPlatforms() {
    const cameraTop = this.cameras.main.scrollY
    const generateThreshold = cameraTop - 200

    // Get difficulty scales
    const scales = this.difficulty.scales

    // Calculate dynamic platform spacing (harder = wider gaps)
    const minGap = platformConfig.platformSpacing.value
    const maxGap = platformConfig.platformSpacing.value * 1.5
    const currentSpacing = Phaser.Math.Linear(minGap, maxGap, scales.platformGap.t)

    // If highest platform is below generation threshold, generate new platform
    if (this.lastPlatformY > generateThreshold) {
      let attempts = 0
      let validPosition = false
      let x, newY
      
      // Ensure new platform does not overlap
      while (!validPosition && attempts < 10) {
        this.lastPlatformY -= currentSpacing
        newY = this.lastPlatformY
        x = Phaser.Math.Between(80, screenSize.width.value - 80)
        
        // Check if overlaps with existing platforms
        const overlap = this.platforms.children.entries.some(platform => {
          if (!platform.active) return false
          const distance = Phaser.Math.Distance.Between(x, newY, platform.x, platform.y)
          return distance < 60 // Minimum distance check
        })
        
        if (!overlap) {
          validPosition = true
        }
        attempts++
      }
      
      if (validPosition) {
        // Use difficulty-scaled platform type chances
        const type = this.getRandomPlatformTypeScaled(scales)
        
        // Create platform with difficulty-scaled speed for moving platforms
        const platform = new Platform(this, x, newY, type)
        if (type === 'moving') {
          platform.speed = platform.speed * scales.movingPlatformSpeedMul
        }
        // Set max touches for normal platforms based on difficulty
        if (type === 'normal') {
          platform.maxTouches = scales.normalPlatformMaxTouches
        }
        this.platforms.add(platform)

        // 💎 COCAINE BEAR: Grace period - no enemies for first 8 seconds
        const timeSinceStart = this.time.now - this.gameStartTime
        const enemyGracePeriod = 8000 // 8 seconds
        const graceActive = timeSinceStart < enemyGracePeriod

        // May generate enemy (chance increases with difficulty)
        const enemyChance = enemyConfig.spawnChance.value * scales.enemySpawnChanceMul
        if (!graceActive && Phaser.Math.Between(1, 100) <= enemyChance) {
          const enemyType = Enemy.getRandomEnemyTypeWithDifficulty(this.difficulty.factor())
          
          if (enemyType === 'gary') {
            // Gary spawns in the air with erratic movement
            const garyX = Phaser.Math.Between(80, screenSize.width.value - 80)
            const garyY = newY - 100
            const gary = new GaryEnemy(this, garyX, garyY)
            gary.setDepth(200) // Ensure enemies are always visible
            this.enemies.add(gary)
          } else if (enemyType === 'doge') {
            // Doge spawns on the platform
            const dogeX = x // Spawn at platform center
            const dogeY = newY - 5 // Just above platform
            const enemy = new Enemy(this, dogeX, dogeY, enemyType, platform)
            // Apply difficulty speed multiplier
            enemy.speedMultiplier = scales.enemySpeedMul
            enemy.setDepth(200) // Ensure enemies are always visible
            this.enemies.add(enemy)
          } else if (enemyType === 'bouncer') {
            // Blue bouncer spawns on the platform
            const bouncerX = x
            const bouncerY = newY - 5
            const enemy = new Enemy(this, bouncerX, bouncerY, enemyType, platform)
            // Apply difficulty speed multiplier
            enemy.speedMultiplier = scales.enemySpeedMul
            enemy.setDepth(200) // Ensure enemies are always visible
            this.enemies.add(enemy)
          } else {
            // Pepe spawns flying in the air
            const pepeX = Phaser.Math.Between(80, screenSize.width.value - 80)
            const pepeY = newY - 80
            const enemy = new Enemy(this, pepeX, pepeY, enemyType, null)
            // Apply difficulty speed multiplier
            enemy.speedMultiplier = scales.enemySpeedMul
            enemy.setDepth(200) // Ensure enemies are always visible
            this.enemies.add(enemy)
          }
        }

        // May generate coin (bear coins get rarer with difficulty)
        // F) Coin spawn rate increases 1.5x when jester hat is active
        const coinSpawnMultiplier = this.player.jesterHatActive ? 1.5 : 1.0
        const coinType = this.getRandomCoinTypeScaled(scales, coinSpawnMultiplier)
        if (coinType) {
          const coinX = Phaser.Math.Between(80, screenSize.width.value - 80)
          const coinY = newY - 60
          const coin = new Coin(this, coinX, coinY, coinType)
          this.coins.add(coin)
        }

        // May generate jetpack booster (rare powerup, slightly rarer with difficulty)
        const jetpackChance = coinConfig.rocketBoosterChance.value * scales.jetpackChanceMul
        if (Phaser.Math.Between(1, 1000) <= jetpackChance * 10) {
          const rocketX = Phaser.Math.Between(80, screenSize.width.value - 80)
          const rocketY = newY - 80
          const rocket = new RocketBooster(this, rocketX, rocketY)
          this.rocketBoosters.add(rocket)
        }

        // F) May generate jester hat (very rare powerup)
        const jesterHatChance = gameConfig.jesterHatSpawnChance.value
        if (Phaser.Math.Between(1, 1000) <= jesterHatChance * 10) {
          const hatX = Phaser.Math.Between(80, screenSize.width.value - 80)
          const hatY = newY - 90
          const jesterHat = new JesterHat(this, hatX, hatY)
          this.jesterHats.add(jesterHat)
        }
      }
    }
  }

  getRandomPlatformTypeScaled(scales) {
    const rand = Math.random()
    let cumulative = 0

    // Use difficulty-scaled chances
    cumulative += scales.breakingChance
    if (rand < cumulative) return 'breaking'

    cumulative += scales.movingChance
    if (rand < cumulative) return 'moving'

    cumulative += scales.springChance
    if (rand < cumulative) return 'spring'

    return 'normal'
  }

  getRandomCoinTypeScaled(scales, spawnMultiplier = 1.0) {
    const xrpChance = coinConfig.xrpCoinChance.value * spawnMultiplier
    const bearChance = coinConfig.bearCoinChance.value * scales.bearCoinChanceMul * spawnMultiplier
    const totalChance = xrpChance + bearChance

    const rand = Phaser.Math.Between(1, 100)
    
    if (rand <= bearChance) {
      return 'bear'
    } else if (rand <= totalChance) {
      return 'xrp'
    }
    
    return null
  }

  updateHeight() {
    // Track height climbed in pixels
    const climbed = Math.max(0, this.startY - this.player.y)
    this.maxHeightClimbed = Math.max(this.maxHeightClimbed, climbed)
    
    // Also track old system for compatibility
    const currentHeight = Math.max(0, Math.floor(climbed / 10))
    if (currentHeight > this.highestY) {
      this.highestY = currentHeight
      this.updateScore(gameConfig.scoreMultiplier.value) // Gain score for reaching new height
    }
  }
  
  createCoinSparkle(x, y) {
    // Create simple sparkle particle effect
    const sparkle = this.add.circle(x, y, 8, 0xFFFF00, 0.8)
    sparkle.setDepth(100)
    
    this.tweens.add({
      targets: sparkle,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => sparkle.destroy()
    })
  }

  updateScore(points) {
    // 💎 COCAINE BEAR: Apply combo multiplier to score
    const multipliedPoints = Math.floor(points * this.comboMultiplier)
    this.score += multipliedPoints
  }

  updateUI() {
    // Send events to UIScene
    this.events.emit('updateScore', this.score)
    this.events.emit('updateHeight', this.highestY)

    // 💎 COCAINE BEAR: Update combo display
    this.events.emit('updateCombo', this.combo, this.comboMultiplier)

    // Update Honey Jet boost status display
    let boostStatus = ''
    if (this.player.hasHoneyJetBoost) {
      boostStatus = '⚡ HONEY JET ACTIVE!'
    }
    this.events.emit('updateBoostStatus', boostStatus)
  }

  cleanupOffScreenObjects() {
    const cameraBottom = this.cameras.main.scrollY + this.cameras.main.height + 300

    // Clean up platforms
    this.platforms.children.entries.forEach(platform => {
      if (platform.y > cameraBottom) {
        platform.destroy()
      }
    })

    // Clean up enemies
    this.enemies.children.entries.forEach(enemy => {
      if (enemy.y > cameraBottom) {
        enemy.destroy()
      }
    })

    // Clean up coins
    this.coins.children.entries.forEach(coin => {
      if (coin.y > cameraBottom) {
        coin.destroy()
      }
    })

    // Clean up rocket boosters
    this.rocketBoosters.children.entries.forEach(rocket => {
      if (rocket.y > cameraBottom) {
        rocket.destroy()
      }
    })

    // Clean up jester hats
    this.jesterHats.children.entries.forEach(hat => {
      if (hat.y > cameraBottom) {
        hat.destroy()
      }
    })
  }

  // Mobile left/right control buttons with all release events + global safety
  createMobileButtons() {
    const w = this.scale.width
    const h = this.scale.height
    const size = 76
    const pad = 12
    const alpha = 0.6
    const y = h - size/2 - pad
    
    // Touch move state
    this.touchMove = 0
    
    const vibrate = () => {
      if (navigator?.vibrate) navigator.vibrate(15)
    }
    
    const mk = (x, label, val) => {
      const r = this.add.rectangle(x, y, size, size, 0x000000, alpha)
        .setScrollFactor(0)
        .setDepth(1000)
        .setStrokeStyle(2, 0xffffff, 0.85)
        .setInteractive({ useHandCursor: true })
      
      this.add.text(x, y, label, { fontSize: 28, color: '#fff' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1001)
      
      // Press: set direction
      r.on('pointerdown', () => {
        this.touchMove = val
        r.setAlpha(0.9)
        vibrate()
      })
      
      // Release/Out/Cancel: clear to 0
      r.on('pointerup', () => {
        this.touchMove = 0
        r.setAlpha(alpha)
      })
      
      r.on('pointerout', () => {
        this.touchMove = 0
        r.setAlpha(alpha)
      })
      
      r.on('pointerupoutside', () => {
        this.touchMove = 0
        r.setAlpha(alpha)
      })
      
      r.on('pointercancel', () => {
        this.touchMove = 0
        r.setAlpha(alpha)
      })
      
      return r
    }
    
    mk(pad + size/2, '◀', -1)
    mk(w - pad - size/2, '▶', 1)
    
    // Global safety: if ANY pointer ends, neutralize movement
    this.input.on('pointerup', () => {
      this.touchMove = 0
    })
    
    this.input.on('pointerupoutside', () => {
      this.touchMove = 0
    })
    
    this.input.on('gameout', () => {
      this.touchMove = 0
    })
  }
  
  // Create visual jetpack boost button
  createJetpackButton() {
    const w = screenSize.width.value
    const h = screenSize.height.value
    
    // Button position - bottom center
    const buttonSize = 100
    const buttonX = w / 2
    const buttonY = h - buttonSize / 2 - 20
    
    // Create the button image from reference
    this.jetpackButtonImage = this.add.image(buttonX, buttonY, 'jetpack_button_icon')
      .setScrollFactor(0)
      .setDepth(1400)
      .setVisible(false)
      .setScale(0.15) // Scale to appropriate size
      .setInteractive({ useHandCursor: true })
    
    // Store reference for bounds checking
    this.jetpackButton = this.jetpackButtonImage
    
    // Add direct mouse/touch events on the button for hold-to-boost
    this.jetpackButtonImage.on('pointerdown', (pointer) => {
      this.jetpackButtonPressed = true
      this.jetpackPointerId = pointer.id
    })
    
    this.jetpackButtonImage.on('pointerup', (pointer) => {
      if (pointer.id === this.jetpackPointerId) {
        this.jetpackButtonPressed = false
        this.jetpackPointerId = null
      }
    })
    
    this.jetpackButtonImage.on('pointerout', (pointer) => {
      // Release if pointer moves outside button while held
      if (pointer.id === this.jetpackPointerId && pointer.isDown) {
        this.jetpackButtonPressed = false
        this.jetpackPointerId = null
      }
    })
    
    // Pulse animation for the button
    this.tweens.add({
      targets: this.jetpackButtonImage,
      scaleX: 0.16,
      scaleY: 0.16,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
    
    // Create "Jetpack Obtained!" banner
    this.jetpackBanner = this.add.text(w / 2, h - buttonSize - 60, 'Jetpack Obtained!', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 6,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000',
        blur: 4,
        fill: true
      }
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1400)
      .setVisible(false)
  }
  
  // Show jetpack button when player obtains jetpack
  showJetpackButton() {
    if (this.jetpackButtonImage) {
      this.jetpackButtonImage.setVisible(true)
    }
    if (this.jetpackBanner) {
      this.jetpackBanner.setVisible(true)
      
      // Fade out banner after 2 seconds
      this.time.delayedCall(2000, () => {
        this.tweens.add({
          targets: this.jetpackBanner,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            this.jetpackBanner.setVisible(false)
            this.jetpackBanner.setAlpha(1)
          }
        })
      })
    }
  }
  
  // Hide jetpack button when fuel depletes
  hideJetpackButton() {
    if (this.jetpackButtonImage) {
      this.jetpackButtonImage.setVisible(false)
    }
  }

  // Menu button (☰) with pause/resume/mute/high scores/quit
  createMenuButton() {
    const w = screenSize.width.value
    
    this.menuBtn = this.add.text(w - 16, 12, '☰', {
      fontSize: 28,
      color: '#fff',
      stroke: '#000',
      strokeThickness: 3
    })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1500)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.togglePauseMenu())
  }
  
  togglePauseMenu() {
    if (this.pauseUI) return this.closePauseMenu()
    
    const w = this.scale.width
    const h = this.scale.height
    
    // Pause physics
    this.physics.world.pause()
    
    // Stop jetpack sound
    if (this.player?.jetpackSound?.isPlaying) {
      this.player.jetpackSound.stop()
    }
    
    const layer = this.add.container(0, 0).setDepth(2000).setScrollFactor(0)
    
    // Background
    const bg = this.add.rectangle(w/2, h/2, w * 0.8, h * 0.6, 0x000000, 0.85)
      .setStrokeStyle(2, 0xffffff, 0.8)
    
    // Title
    const title = this.add.text(w/2, h * 0.33, 'PAUSED', {
      fontSize: 24,
      color: '#fff'
    }).setOrigin(0.5)
    
    // Helper to create big playful yellow menu button
    const createMenuButton = (text, yPos, callback) => {
      // Create border rectangle (black)
      const borderWidth = 220
      const borderHeight = 65
      const border = this.add.rectangle(w/2, yPos, borderWidth, borderHeight, 0x000000)
        .setDepth(2001)
        .setScrollFactor(0)
      
      // Create button background (yellow)
      const bg = this.add.rectangle(w/2, yPos, borderWidth - 6, borderHeight - 6, 0xFFD700)
        .setDepth(2002)
        .setScrollFactor(0)
      
      // Create text
      const txt = this.add.text(w/2, yPos, text, {
        fontSize: 26,
        fontStyle: 'bold',
        color: '#000000',
        fontFamily: 'Arial'
      })
        .setOrigin(0.5)
        .setDepth(2003)
        .setScrollFactor(0)
      
      // Make border interactive
      border.setInteractive({ useHandCursor: true })
      
      border.on('pointerdown', () => {
        border.setScale(0.95)
        bg.setScale(0.95)
        txt.setScale(0.95)
        this.time.delayedCall(100, () => {
          border.setScale(1)
          bg.setScale(1)
          txt.setScale(1)
          callback()
        })
      })
      
      border.on('pointerover', () => {
        bg.setFillStyle(0xFFE44D) // Lighter yellow on hover
        border.setScale(1.05)
        bg.setScale(1.05)
        txt.setScale(1.05)
      })
      
      border.on('pointerout', () => {
        bg.setFillStyle(0xFFD700) // Original yellow
        border.setScale(1)
        bg.setScale(1)
        txt.setScale(1)
      })
      
      // Return an object so we can still access the text for mute button
      return { border, bg, txt }
    }
    
    // Resume button - closes menu and resumes game
    const resume = createMenuButton('Resume', h * 0.46, () => {
      this.closePauseMenu()
    })
    
    // Mute button - toggles audio
    const mute = createMenuButton(
      this.game.sound.mute ? 'Unmute' : 'Mute',
      h * 0.56,
      () => {
        const newMuted = !this.game.sound.mute
        this.game.sound.setMute(newMuted)
        this.sound.setMute(newMuted)
        localStorage.setItem('audioMuted', String(newMuted))
        // Update the text
        mute.txt.setText(newMuted ? 'Unmute' : 'Mute')
        
        // Notify all scenes
        this.game.events.emit('audio:mute-changed', newMuted)
      }
    )
    
    // High Scores button - shows overlay on top
    const highScores = createMenuButton(
      'High Scores',
      h * 0.66,
      () => {
        this.showHighScoresOverlay()
      }
    )
    
    // Quit button - returns to title screen
    const quit = createMenuButton(
      'Quit to Title',
      h * 0.76,
      () => {
        // Clean up
        this.stopLoopsAndTimers()
        
        // Stop all scenes
        this.scene.stop('UIScene')
        this.scene.stop('GameScene')
        
        // Start title screen
        this.scene.start('TitleScene')
      }
    )
    
    layer.add([bg, title])
    // Buttons are already added to the scene directly, just track them
    this.pauseUI = layer
    this.pauseButtons = [resume, mute, highScores, quit]
  }
  
  closePauseMenu() {
    this.pauseUI?.destroy(true)
    this.pauseUI = null
    
    // Destroy button elements
    if (this.pauseButtons) {
      this.pauseButtons.forEach(btn => {
        btn.border?.destroy()
        btn.bg?.destroy()
        btn.txt?.destroy()
      })
      this.pauseButtons = null
    }
    
    // Resume physics
    this.physics.world.resume()
  }
  
  // High Scores overlay (shows on top of pause menu)
  showHighScoresOverlay() {
    // Destroy any existing overlay
    if (this.hsUI) {
      this.hsUI.destroy(true)
      this.hsUI = null
      
      // Destroy close button
      if (this.hsCloseBtn) {
        this.hsCloseBtn.border?.destroy()
        this.hsCloseBtn.bg?.destroy()
        this.hsCloseBtn.txt?.destroy()
        this.hsCloseBtn = null
      }
      return
    }
    
    const w = this.scale.width
    const h = this.scale.height
    
    // Higher depth to appear above pause menu (2000)
    const L = this.add.container(0, 0).setDepth(3000).setScrollFactor(0)
    
    const bg = this.add.rectangle(w/2, h/2, w * 0.86, h * 0.7, 0x000000, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.85)
    
    const title = this.add.text(w/2, h * 0.22, 'HIGH SCORES', {
      fontSize: 22,
      color: '#ffd700'
    }).setOrigin(0.5)
    
    // Load and normalize rows safely
    let rows = []
    try {
      rows = JSON.parse(localStorage.getItem('leaderboard_v1') || '[]')
      if (!Array.isArray(rows)) rows = []
    } catch (_) {
      rows = []
    }
    
    // Normalize fields so we never print "undefined"
    const norm = (r) => {
      const name = (r && typeof r.name === 'string' && r.name.trim()) ? r.name.trim() : 'Player'
      const score = Number(r?.totalScore ?? r?.score ?? 0) || 0
      const height = Number(r?.maxHeight ?? r?.height ?? 0) || 0
      return { name, score, height }
    }
    
    const top10 = rows.map(norm)
      .sort((a, b) => b.score - a.score || b.height - a.height)
      .slice(0, 10)
    
    // Render table (or empty state)
    const col = this.add.container(w * 0.13, h * 0.28)
    const header = this.add.text(0, 0, '#  NAME         SCORE    HEIGHT', {
      fontFamily: 'monospace',
      fontSize: 16,
      color: '#8fd3ff'
    })
    col.add(header)
    
    if (top10.length === 0) {
      col.add(
        this.add.text(0, 28, 'No scores yet. Play a round!', {
          fontFamily: 'monospace',
          fontSize: 16,
          color: '#fff'
        })
      )
    } else {
      top10.forEach((r, i) => {
        const rank = String(i + 1).padStart(2, ' ')
        const name = r.name.slice(0, 12).padEnd(12, ' ')
        const line = `${rank}  ${name}  ${String(r.score).padStart(6, ' ')}   ${String(r.height).padStart(6, ' ')}`
        
        col.add(
          this.add.text(0, 28 + i * 22, line, {
            fontFamily: 'monospace',
            fontSize: 16,
            color: '#fff'
          })
        )
      })
    }
    
    // Create close button
    const closeBorderWidth = 220
    const closeBorderHeight = 65
    const closeBorder = this.add.rectangle(w/2, h * 0.82, closeBorderWidth, closeBorderHeight, 0x000000)
      .setDepth(3001)
      .setScrollFactor(0)
    
    const closeBg = this.add.rectangle(w/2, h * 0.82, closeBorderWidth - 6, closeBorderHeight - 6, 0xFFD700)
      .setDepth(3002)
      .setScrollFactor(0)
    
    const closeTxt = this.add.text(w/2, h * 0.82, 'Close', {
      fontSize: 26,
      fontStyle: 'bold',
      color: '#000000',
      fontFamily: 'Arial'
    })
      .setOrigin(0.5)
      .setDepth(3003)
      .setScrollFactor(0)
    
    // Make border interactive
    closeBorder.setInteractive({ useHandCursor: true })
    
    closeBorder.on('pointerdown', () => {
      closeBorder.setScale(0.95)
      closeBg.setScale(0.95)
      closeTxt.setScale(0.95)
      this.time.delayedCall(100, () => {
        // Destroy high scores overlay
        this.hsUI?.destroy(true)
        this.hsUI = null
        
        // Destroy close button elements
        closeBorder.destroy()
        closeBg.destroy()
        closeTxt.destroy()
        this.hsCloseBtn = null
      })
    })
    
    closeBorder.on('pointerover', () => {
      closeBg.setFillStyle(0xFFE44D)
      closeBorder.setScale(1.05)
      closeBg.setScale(1.05)
      closeTxt.setScale(1.05)
    })
    
    closeBorder.on('pointerout', () => {
      closeBg.setFillStyle(0xFFD700)
      closeBorder.setScale(1)
      closeBg.setScale(1)
      closeTxt.setScale(1)
    })
    
    L.add([bg, title, col])
    // Close button elements are already added to scene
    this.hsUI = L
    this.hsCloseBtn = { border: closeBorder, bg: closeBg, txt: closeTxt }
  }
  
  stopLoopsAndTimers() {
    // Stop jetpack sound
    if (this.player?.jetpackSound?.isPlaying) {
      this.player.jetpackSound.stop()
    }
    
    // Stop background music
    if (this.backgroundMusic?.isPlaying) {
      this.backgroundMusic.stop()
    }
  }

  // D) Open pause menu (legacy method for compatibility)
  openPauseMenu() {
    this.togglePauseMenu()
  }
}
