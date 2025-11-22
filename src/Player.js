import Phaser from 'phaser'
import { playerConfig, gameConfig, coinConfig } from './gameConfig.json'

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "bear_hero_idle")
    
    // Narrow the body type for better autocomplete (no runtime effect)
    /** @type {Phaser.Physics.Arcade.Body} */
    this.body

    // Add to scene and physics system
    scene.add.existing(this)
    scene.physics.add.existing(this)

    // Character properties
    this.facingDirection = "right"
    this.moveSpeed = playerConfig.moveSpeed.value
    this.jumpPower = playerConfig.jumpPower.value

    // Status flags
    this.isDead = false
    this.isJumping = false
    this.isFalling = false

    // Honey Jet boost (from Bear coins)
    this.hasHoneyJetBoost = false
    this.honeyJetBoostStartTime = 0
    this.honeyJetBoostDuration = coinConfig.bearCoinBoostDuration.value
    this.honeyJetBoostPower = playerConfig.honeyJetBoostPower.value
    
    // Invincibility grace period at game start
    this.isInvincible = true
    this.gracePeriodDuration = 1500 // 1.5 seconds of invincibility at start
    
    // Visual blink effect during invincibility
    this.invincibilityBlink = scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 150,
      yoyo: true,
      repeat: -1
    })
    
    scene.time.delayedCall(this.gracePeriodDuration, () => {
      this.isInvincible = false
      // Stop blinking and restore full opacity
      if (this.invincibilityBlink) {
        this.invincibilityBlink.stop()
        this.setAlpha(1)
      }
    })

    // Jetpack system (cap at 1.2s total, cannot stack)
    this.jetpack = {
      hasBooster: false,
      fuelMs: 0,
      totalMs: 1200, // 1.2 seconds of fuel (cannot exceed)
      active: false,
      wasActive: false, // 💎 COCAINE BEAR: Track previous frame state for press detection
      thrust: 650,
      thrustParticles: null
    }

    // Set physics properties
    this.body.setGravityY(gameConfig.gravity.value)

    // Set collision box (based on idle sprite)
    const scaleRatio = 0.85
    this.collisionBoxWidth = 671 * scaleRatio
    this.collisionBoxHeight = 801 * scaleRatio
    this.body.setSize(this.collisionBoxWidth, this.collisionBoxHeight)

    // Store body dimensions for consistent physics (unscaled values)
    this.idleBodyWidth = this.collisionBoxWidth
    this.idleBodyHeight = this.collisionBoxHeight

    // Store original sprite dimensions for different states
    this.idleSpriteHeight = 801
    this.jetpackSpriteHeight = 1131

    // Set character scale - Bear is about 2.5 tiles high for pixel-perfect look
    const targetHeight = 70
    this.characterScale = targetHeight / this.idleSpriteHeight
    this.setScale(this.characterScale)

    // Set initial origin
    this.setOrigin(0.5, 1.0)

    // Initialize all sound effects
    this.initializeSounds()
  }

  initializeSounds() {
    this.jumpSound = this.scene.sound.add("jump_sound", { volume: 0.3 })
    this.xrpCoinSound = this.scene.sound.add("xrp_coin_pickup", { volume: 0.3 })
    this.bearCoinSound = this.scene.sound.add("bear_coin_pickup", { volume: 0.3 })
    this.springBounceSound = this.scene.sound.add("spring_boing", { volume: 0.3 })
    this.jetpackSound = this.scene.sound.add("jetpack_thrust", { volume: 0.4, loop: true })
  }

  update(cursors) {
    if (!this.body || !this.active || this.isDead) {
      return
    }

    // Handle Honey Jet boost status
    this.updateHoneyJetBoost()
    
    // F) Update jester hat status
    this.updateJesterHat()

    // Handle jetpack
    this.updateJetpack(cursors)

    // Handle movement
    this.handleMovement(cursors)

    // Update animation based on velocity
    this.updateAnimations()

    // Check if fell out of screen
    this.checkFallOffScreen()
  }

  updateHoneyJetBoost() {
    const currentTime = this.scene.time.now
    if (this.hasHoneyJetBoost) {
      if (currentTime - this.honeyJetBoostStartTime > this.honeyJetBoostDuration) {
        this.hasHoneyJetBoost = false
      }
    }
  }

  updateJetpack(cursors) {
    const delta = this.scene.game.loop.delta

    // Handle jetpack activation with SPACE key
    if (this.jetpack.hasBooster && this.jetpack.fuelMs > 0 && cursors.space.isDown) {
      // 💎 COCAINE BEAR: Anti-exploit - consume 25% fuel on each NEW press
      const isNewPress = !this.jetpack.wasActive
      if (isNewPress) {
        const minimumFuelCost = this.jetpack.totalMs * 0.25 // 25% of total fuel
        this.jetpack.fuelMs = Math.max(0, this.jetpack.fuelMs - minimumFuelCost)
        console.log(`🚀 Jetpack pressed - consumed 25% fuel (${minimumFuelCost}ms)`)
      }

      // Activate jetpack
      this.jetpack.active = true

      // Apply upward thrust
      this.body.setVelocityY(-this.jetpack.thrust)

      // Consume fuel per frame (in addition to press cost)
      this.jetpack.fuelMs = Math.max(0, this.jetpack.fuelMs - delta)

      // Play jetpack sound
      if (!this.jetpackSound.isPlaying) {
        this.jetpackSound.play()
      }

      // Update UI
      if (this.scene.jetpackUI) {
        this.scene.jetpackUI.updateFuel(this.jetpack.fuelMs / this.jetpack.totalMs)
      }
    } else {
      this.jetpack.active = false

      // Stop jetpack sound
      if (this.jetpackSound.isPlaying) {
        this.jetpackSound.stop()
      }

      // If fuel depleted, remove booster
      if (this.jetpack.hasBooster && this.jetpack.fuelMs <= 0) {
        this.jetpack.hasBooster = false
        if (this.scene.jetpackUI) {
          this.scene.jetpackUI.setVisible(false)
        }

        // Hide mobile jetpack button
        if (this.scene.hideJetpackButton) {
          this.scene.hideJetpackButton()
        }

        // Clean up particles
        if (this.jetpack.thrustParticles) {
          this.jetpack.thrustParticles.destroy()
          this.jetpack.thrustParticles = null
        }
      }
    }

    // 💎 COCAINE BEAR: Track state for next frame's press detection
    this.jetpack.wasActive = this.jetpack.active

    // Update particle effects
    this.updateJetpackParticles()
  }

  grantJetpackBooster() {
    const now = this.scene.time.now
    this.jetpack.hasBooster = true
    
    // Cap fuel to 1.2s total, cannot stack beyond that
    this.jetpack.fuelMs = Math.min(this.jetpack.totalMs, this.jetpack.fuelMs + this.jetpack.totalMs)
    
    if (this.scene.jetpackUI) {
      this.scene.jetpackUI.setVisible(true)
      this.scene.jetpackUI.updateFuel(this.jetpack.fuelMs / this.jetpack.totalMs)
    }

    // Show mobile jetpack button
    if (this.scene.showJetpackButton) {
      this.scene.showJetpackButton()
    }

    // Create jetpack thrust particle emitter
    this.createJetpackParticles()
  }

  createJetpackParticles() {
    // Create simple particle emitter for jetpack thrust
    if (!this.jetpack.thrustParticles) {
      // Use a small existing sprite as particle texture (the tiny bullet works well)
      this.jetpack.thrustParticles = this.scene.add.particles(this.x, this.y, 'ultra_tiny_bullet_dot', {
        speed: { min: 50, max: 100 },
        angle: { min: 70, max: 110 }, // Downward
        scale: { start: 0.15, end: 0 },
        blendMode: 'ADD',
        lifespan: 300,
        gravityY: -100,
        frequency: 20,
        tint: [0xff6600, 0x00aaff, 0xffaa00],
        emitting: false
      })
    }
  }

  updateJetpackParticles() {
    if (this.jetpack.thrustParticles) {
      // Position particles at player's feet (jetpack exhaust point)
      this.jetpack.thrustParticles.setPosition(this.x, this.y - 5)
      
      // Toggle particles based on active thrust
      if (this.jetpack.active) {
        this.jetpack.thrustParticles.emitting = true
      } else {
        this.jetpack.thrustParticles.emitting = false
      }
    }
  }

  handleMovement(cursors) {
    // Horizontal movement - tilt controls
    if (cursors.left.isDown) {
      this.body.setVelocityX(-this.moveSpeed)
      this.facingDirection = "left"
    } else if (cursors.right.isDown) {
      this.body.setVelocityX(this.moveSpeed)
      this.facingDirection = "right"
    } else {
      this.body.setVelocityX(0)
    }

    // Update facing direction
    this.setFlipX(this.facingDirection === "left")

    // Screen boundary wrapping - appear on opposite side
    const screenWidth = this.scene.cameras.main.width
    const halfWidth = this.width * this.characterScale / 2

    if (this.x < -halfWidth) {
      this.x = screenWidth + halfWidth
    } else if (this.x > screenWidth + halfWidth) {
      this.x = -halfWidth
    }
  }

  updateAnimations() {
    // Priority 1: If wearing BOTH jester hat AND jetpack, use combined sprite
    if (this.jesterHatActive && this.jetpack.hasBooster && this.scene.textures.exists('bear_jester_hat_jetpack')) {
      this.setTexture('bear_jester_hat_jetpack')
      const targetHeight = 70
      const comboSpriteHeight = 1262 // 934w x 1262h
      const comboScale = targetHeight / comboSpriteHeight
      this.setScale(comboScale)
      
      // Maintain consistent body size
      this.body.setSize(this.idleBodyWidth, this.idleBodyHeight)
      const offsetX = (934 * comboScale * 0.5) - (this.idleBodyWidth * comboScale / 2)
      const offsetY = (1262 * comboScale * 1.0) - (this.idleBodyHeight * comboScale)
      this.body.setOffset(offsetX / comboScale, offsetY / comboScale)
      return
    }
    
    // Priority 2: If wearing jester hat only, use jester hat sprite
    if (this.jesterHatActive && this.hasJesterHatSprite) {
      this.setTexture('bear_hero_with_jester_hat')
      this.setScale(this.jesterHatScale)
      
      // Ensure body size remains consistent
      this.body.setSize(this.idleBodyWidth, this.idleBodyHeight)
      const offsetX = (876 * this.jesterHatScale * 0.5) - (this.idleBodyWidth * this.jesterHatScale / 2)
      const offsetY = (1293 * this.jesterHatScale * 1.0) - (this.idleBodyHeight * this.jesterHatScale)
      this.body.setOffset(offsetX / this.jesterHatScale, offsetY / this.jesterHatScale)
      return
    }
    
    // Priority 3: If wearing jetpack only, use jetpack sprite
    if (this.jetpack.hasBooster) {
      this.setTexture("bear_hero_jetpack")
      // Adjust scale for jetpack sprite (it's taller)
      const targetHeight = 70
      const jetpackScale = targetHeight / this.jetpackSpriteHeight
      this.setScale(jetpackScale)

      // 💎 COCAINE BEAR: FIX JETPACK COLLISION - Maintain consistent body size!
      // Keep the same body size as idle state for consistent collision
      this.body.setSize(this.idleBodyWidth, this.idleBodyHeight)

      return
    }

    // Reset to normal scale when not using jetpack
    this.setScale(this.characterScale)

    // Determine animation based on vertical velocity
    if (this.body.velocity.y < -50) {
      // Jumping up
      this.setTexture("bear_hero_jumping")
      this.isJumping = true
      this.isFalling = false
    } else if (this.body.velocity.y > 50) {
      // Falling down
      this.setTexture("bear_hero_falling")
      this.isJumping = false
      this.isFalling = true
    } else {
      // Idle/moving horizontally
      this.setTexture("bear_hero_idle")
      this.isJumping = false
      this.isFalling = false
    }
  }

  jump(velocityY = null) {
    // Apply all jump multipliers (jester hat + honey jet boost)
    let multiplier = this.jesterHatActive ? gameConfig.jesterHatJumpMultiplier.value : 1.0

    // 💎 COCAINE BEAR: Apply Honey Jet boost multiplier once on jump
    if (this.hasHoneyJetBoost) {
      multiplier *= this.honeyJetBoostPower
    }

    const jumpVelocity = velocityY || -(this.jumpPower * multiplier)
    this.body.setVelocityY(jumpVelocity)
    this.jumpSound.play()
  }

  springJump() {
    // Apply all jump multipliers (jester hat + honey jet boost)
    let multiplier = this.jesterHatActive ? gameConfig.jesterHatJumpMultiplier.value : 1.0

    // 💎 COCAINE BEAR: Apply Honey Jet boost multiplier once on jump
    if (this.hasHoneyJetBoost) {
      multiplier *= this.honeyJetBoostPower
    }

    const springVelocity = -(this.jumpPower * playerConfig.springBounceMultiplier.value * multiplier)
    this.body.setVelocityY(springVelocity)
    this.springBounceSound.play()
  }

  rocketBoost() {
    // Grant jetpack booster instead of instant boost
    this.grantJetpackBooster()
  }

  collectXRPCoin() {
    this.xrpCoinSound.play()
    const points = coinConfig.xrpCoinValue.value
    console.log(`XRP coin value from config: ${points}`)
    return points
  }

  collectBearCoin() {
    this.bearCoinSound.play()
    
    // Activate Honey Jet boost
    this.hasHoneyJetBoost = true
    this.honeyJetBoostStartTime = this.scene.time.now
    
    const points = coinConfig.bearCoinValue.value
    console.log(`Bear coin value from config: ${points}`)
    return points
  }

  checkFallOffScreen() {
    // If fall too far below camera view, game over
    if (this.y > this.scene.cameras.main.scrollY + this.scene.cameras.main.height + 200) {
      this.die()
    }
    
    // If fall off the bottom of the world/map, game over
    const worldBottom = this.scene.physics.world.bounds.height
    if (this.y > worldBottom) {
      this.die()
    }
  }

  // Jester Hat powerup - 7.5s duration with sprite swap
  activateJesterHat() {
    if (this.jesterHatActive) return // Already active
    
    const now = this.scene.time.now
    this.jesterHatActive = true
    this.isInvincible = true
    this.jesterHatEndTime = now + gameConfig.jesterHatDuration.value
    
    // Sprite swap: switch to bear wearing jester hat
    this.hasJesterHatSprite = this.scene.textures.exists('bear_hero_with_jester_hat')
    
    if (this.hasJesterHatSprite) {
      // Get current texture key to restore later
      this.preJesterTexture = this.texture.key
      
      // Swap to jester hat sprite (876w x 1293h)
      this.setTexture('bear_hero_with_jester_hat')
      
      // Match the scale of the normal bear sprite (same visual size)
      const targetHeight = 70
      const hatSpriteHeight = 1293 // actual height with hat
      this.jesterHatScale = targetHeight / hatSpriteHeight
      this.setScale(this.jesterHatScale)
      
      // CRITICAL: Maintain the exact same physics body as idle state
      // Use unscaled body size values (setSize expects unscaled dimensions)
      this.body.setSize(this.idleBodyWidth, this.idleBodyHeight)
      
      // Center the body horizontally and align bottom (origin is 0.5, 1.0)
      const offsetX = (876 * this.jesterHatScale * 0.5) - (this.idleBodyWidth * this.jesterHatScale / 2)
      const offsetY = (1293 * this.jesterHatScale * 1.0) - (this.idleBodyHeight * this.jesterHatScale)
      this.body.setOffset(offsetX / this.jesterHatScale, offsetY / this.jesterHatScale)
    }
    
    // Golden glow effect for invincibility
    this.jesterHatGlow = this.scene.add.circle(this.x, this.y, 40, 0xFFD700, 0.3)
    this.jesterHatGlow.setDepth(this.depth - 1)
    this.jesterHatGlow.setBlendMode(Phaser.BlendModes.ADD)
    
    // Pulse animation
    this.scene.tweens.add({
      targets: this.jesterHatGlow,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0.5,
      duration: 600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
    
    // Play powerup sound
    this.scene.sound.add('xrp_coin_pickup', { volume: 0.4 }).play()
    
    // Schedule end of powerup
    this.scene.time.delayedCall(gameConfig.jesterHatDuration.value, () => {
      this.deactivateJesterHat()
    })
  }
  
  updateJesterHat() {
    if (!this.jesterHatActive) return
    
    // Update glow position
    if (this.jesterHatGlow) {
      this.jesterHatGlow.x = this.x
      this.jesterHatGlow.y = this.y
    }
  }
  
  deactivateJesterHat() {
    this.jesterHatActive = false
    this.isInvincible = false
    
    // Restore original sprite
    if (this.hasJesterHatSprite && this.preJesterTexture) {
      this.setTexture(this.preJesterTexture)
      this.setScale(this.characterScale)
    }
    
    // Fade out glow
    if (this.jesterHatGlow) {
      this.scene.tweens.add({
        targets: this.jesterHatGlow,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.jesterHatGlow?.destroy()
          this.jesterHatGlow = null
        }
      })
    }
    
    // Play end sound
    this.scene.sound.add('platform_break', { volume: 0.2 }).play()
  }

  die() {
    if (this.isDead) return
    
    this.isDead = true
    this.body.setVelocity(0, 0)
    
    // Clean up jester hat visuals and restore sprite
    if (this.jesterHatActive) {
      this.jesterHatActive = false
      if (this.hasJesterHatSprite && this.preJesterTexture) {
        this.setTexture(this.preJesterTexture)
        this.setScale(this.characterScale)
      }
    }
    if (this.jesterHatGlow) {
      this.jesterHatGlow.destroy()
      this.jesterHatGlow = null
    }
    
    // H) Stop all looping sounds
    if (this.jetpackSound && this.jetpackSound.isPlaying) {
      this.jetpackSound.stop()
    }
    
    if (this.scene.backgroundMusic) {
      this.scene.backgroundMusic.stop()
    }
    
    // Play game over sound effect
    this.scene.sound.add("game_over", { volume: 0.3 }).play()

    // Award honey points using game-points-helper (shows popup)
    if (window.awardGamePoints && this.scene.gameStartTime) {
      const gameEndTime = this.scene.time.now
      const durationMs = gameEndTime - this.scene.gameStartTime
      const minutesPlayed = durationMs / 60000 // Convert ms to minutes
      console.log(`🍯 Game duration: ${minutesPlayed.toFixed(2)} minutes`)
      window.awardGamePoints('bear-jumpventure', minutesPlayed)
    }

    // Start high score scene with both score and height
    this.scene.scene.start("HighScoreScene", {
      totalScore: this.scene.score,
      maxHeight: Math.round(this.scene.maxHeightClimbed)
    })
  }
}
