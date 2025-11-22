import Phaser from 'phaser'
import { platformConfig } from './gameConfig.json'

export class Platform extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = 'normal') {
    const textures = {
      'normal': 'golden_platform_normal',
      'breaking': 'golden_platform_breaking',
      'moving': 'golden_platform_normal', // Moving uses same texture as normal
      'spring': 'golden_platform_spring'
    }

    super(scene, x, y, textures[type])

    // Add to scene
    scene.add.existing(this)
    
    // Platform properties
    this.scene = scene
    this.platformType = type
    this.hasBeenStepped = false
    this.isDestroyed = false
    this.touchCount = 0 // Track how many times platform has been touched
    // Get max touches from difficulty manager (starts at 2, scales down to 1 at high difficulty)
    this.maxTouches = scene.difficulty ? scene.difficulty.scales.normalPlatformMaxTouches : 2

    // Moving platform properties
    this.direction = Phaser.Math.Between(0, 1) ? -1 : 1
    // Apply difficulty scaling to moving platform speed
    const speedMultiplier = scene.difficulty ? scene.difficulty.scales.movingPlatformSpeedMul : 1.0
    this.moveSpeed = platformConfig.movingPlatformSpeed.value * speedMultiplier

    // Set platform scale
    this.setPlatformScale()

    // Set origin
    this.setOrigin(0.5, 0.5)

    // Initialize sound effects
    this.initializeSounds()

    // Set physics body based on platform type
    if (type === 'moving') {
      // Moving platform needs dynamic body
      scene.physics.add.existing(this) // Dynamic body
      this.body.setImmovable(true) // Set as immovable (but can set velocity)
      this.body.setAllowGravity(false)
      this.body.setVelocityX(this.direction * this.moveSpeed)
    } else {
      // Other platforms use static bodies
      scene.physics.add.existing(this, true) // true means static body
    }

    // 💎 COCAINE BEAR: Apply BearPark brand colors to platforms
    const platformColors = {
      'normal': 0x680cd9,    // Purple
      'breaking': 0xfeb501,  // Yellow
      'moving': 0x07ae08,    // Green
      'spring': 0xfeb501     // Yellow (spring uses yellow like breaking)
    }
    this.setTint(platformColors[type])
  }

  setPlatformScale() {
    const targetWidth = 110 // Target width for golden platforms
    let originalWidth
    
    // Golden platform original sizes
    switch(this.platformType) {
      case 'normal':
        originalWidth = 645
        break
      case 'breaking':
        originalWidth = 898
        break
      case 'moving':
        originalWidth = 645 // Same as normal
        break
      case 'spring':
        originalWidth = 716
        break
      default:
        originalWidth = 645
    }

    this.platformScale = targetWidth / originalWidth
    this.setScale(this.platformScale)
  }

  initializeSounds() {
    this.platformBreakSound = this.scene.sound.add("platform_break", { volume: 0.3 })
    this.springBounceSound = this.scene.sound.add("spring_boing", { volume: 0.3 })
  }

  update() {
    if (this.isDestroyed) return

    // Moving platform logic
    if (this.platformType === 'moving') {
      const screenWidth = this.scene.cameras.main.width
      const halfWidth = (this.width * this.platformScale) / 2
      const leftBound = halfWidth + 10
      const rightBound = screenWidth - halfWidth - 10
      
      // Simple boundary detection and reversal
      if (this.x <= leftBound) {
        this.x = leftBound // Ensure does not go beyond boundaries
        this.direction = 1 // Move right
        this.body.setVelocityX(this.direction * this.moveSpeed)
      } else if (this.x >= rightBound) {
        this.x = rightBound // Ensure does not go beyond boundaries
        this.direction = -1 // Move left
        this.body.setVelocityX(this.direction * this.moveSpeed)
      }
      
      // Ensure velocity is always set correctly
      if (this.body.velocity.x === 0) {
        this.body.setVelocityX(this.direction * this.moveSpeed)
      }
    }

    // If platform falls too far below screen, destroy it
    if (this.y > this.scene.cameras.main.scrollY + this.scene.cameras.main.height + 300) {
      this.destroy()
    }
  }

  // Player steps on platform
  onPlayerLand(player) {
    switch(this.platformType) {
      case 'normal':
        this.handleNormalPlatform(player)
        break
      case 'breaking':
        this.handleBreakingPlatform(player)
        break
      case 'moving':
        this.handleMovingPlatform(player)
        break
      case 'spring':
        this.handleSpringPlatform(player)
        break
    }
  }

  handleNormalPlatform(player) {
    // Normal platform only needs to make player jump
    player.jump()
    
    // Track touches and may break after max touches
    this.touchCount++
    
    // Visual feedback - flash red when close to breaking
    if (this.touchCount >= this.maxTouches - 1) {
      this.setTint(0xff6666) // Red tint warning
      this.scene.time.delayedCall(100, () => {
        if (!this.isDestroyed) {
          this.clearTint()
        }
      })
    }
    
    // Break after reaching max touches
    if (this.touchCount >= this.maxTouches) {
      this.scene.time.delayedCall(150, () => {
        this.breakPlatform()
      })
    }
  }

  handleBreakingPlatform(player) {
    if (this.hasBeenStepped) return

    this.hasBeenStepped = true
    player.jump()

    // Breaking platform breaks after delay when stepped on
    this.scene.time.delayedCall(100, () => {
      this.breakPlatform()
    })
  }

  handleMovingPlatform(player) {
    // Moving platform normal jump
    player.jump()
  }

  handleSpringPlatform(player) {
    // Spring platform provides higher jump
    player.springJump()

    // Play spring sound effect
    this.springBounceSound.play()

    // 💎 COCAINE BEAR: SCREEN SHAKE ON SPRING BOUNCE
    this.scene.cameras.main.shake(100, 0.004)

    // 💎 COCAINE BEAR: PARTICLE EXPLOSION ON SPRING JUMP
    const particles = this.scene.add.particles(this.x, this.y, 'golden_platform_spring', {
      speed: { min: 100, max: 300 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.15, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      gravityY: 300,
      quantity: 15,
      tint: [0xfeb501, 0xffd700, 0xffff00] // Yellow spring particles (BearPark yellow)
    })
    particles.explode()
    this.scene.time.delayedCall(500, () => particles.destroy())

    // Switch to compressed state texture
    this.setTexture('golden_platform_spring_compressed')

    // Switch back to normal state after delay
    this.scene.time.delayedCall(200, () => {
      this.setTexture('golden_platform_spring')
    })
  }

  breakPlatform() {
    if (this.isDestroyed) return

    this.isDestroyed = true
    this.platformBreakSound.play()

    // 💎 COCAINE BEAR: SCREEN SHAKE ON BREAK
    this.scene.cameras.main.shake(150, 0.003)

    // Play breaking animation
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: this.platformScale * 1.2,
      scaleY: this.platformScale * 0.8,
      duration: 300,
      onComplete: () => {
        this.destroy()
      }
    })
  }

  // Create static method for random platform type generation
  static getRandomPlatformType() {
    const rand = Phaser.Math.Between(1, 100)
    
    if (rand <= platformConfig.normalPlatformChance.value) {
      return 'normal'
    } else if (rand <= platformConfig.normalPlatformChance.value + platformConfig.breakingPlatformChance.value) {
      return 'breaking'
    } else if (rand <= platformConfig.normalPlatformChance.value + platformConfig.breakingPlatformChance.value + platformConfig.movingPlatformChance.value) {
      return 'moving'
    } else {
      return 'spring'
    }
  }
}