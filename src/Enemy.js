import Phaser from 'phaser'
import { enemyConfig } from './gameConfig.json'

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = 'pepe', platform = null) {
    const textures = {
      'pepe': 'pepe_flying_frame1',
      'doge': 'doge_walk_frame1',
      'bouncer': 'blue_bouncer_enemy'
    }

    super(scene, x, y, textures[type])

    // Add to scene and physics system
    scene.add.existing(this)
    scene.physics.add.existing(this)

    // Enemy properties
    this.enemyType = type
    this.isDead = false
    this.direction = Phaser.Math.Between(0, 1) ? -1 : 1 // Random initial direction
    this.speedMultiplier = 1.0 // Can be set by difficulty manager
    
    // Platform for Doge to patrol on
    this.platform = platform

    // Set collision box and scale based on enemy type
    if (type === 'pepe') {
      const scaleRatio = 0.8
      this.collisionBoxWidth = 491 * scaleRatio
      this.collisionBoxHeight = 536 * scaleRatio
      this.body.setSize(this.collisionBoxWidth, this.collisionBoxHeight)
      
      const targetHeight = 50
      this.enemyScale = targetHeight / 536
      this.setScale(this.enemyScale)
      
      // Pepe flies - no gravity, free movement
      this.body.setAllowGravity(false)
      this.moveSpeed = enemyConfig.pepeSpeed.value
      this.verticalSpeed = enemyConfig.pepeVerticalSpeed.value
      
      // Set initial flying velocity (multiplier applied in update)
      this.baseHorizontalSpeed = this.moveSpeed
      this.body.setVelocity(
        this.direction * this.moveSpeed,
        Phaser.Math.Between(-this.verticalSpeed, this.verticalSpeed)
      )
      
      // Create wing flapping animation
      this.createPepeFlappingAnimation()
      
      // Play the flapping animation
      this.play('pepe_flying_anim')
      
    } else if (type === 'doge') {
      // Doge walks on platforms
      const scaleRatio = 0.75
      this.collisionBoxWidth = 575 * scaleRatio
      this.collisionBoxHeight = 520 * scaleRatio
      this.body.setSize(this.collisionBoxWidth, this.collisionBoxHeight)
      
      const targetHeight = 45
      this.enemyScale = targetHeight / 520
      this.setScale(this.enemyScale)
      
      // Doge has gravity and walks on platforms
      this.body.setAllowGravity(true)
      this.body.setGravityY(700) // Same gravity as game
      this.moveSpeed = enemyConfig.dogeSpeed.value
      this.baseHorizontalSpeed = this.moveSpeed
      
      // Start walking (multiplier applied in update)
      this.body.setVelocityX(this.direction * this.moveSpeed)
      
      // Create and play walking animation
      this.createDogeWalkAnimation()
      this.play('doge_walk_anim')
      
      // Store platform bounds for patrolling
      if (this.platform) {
        this.platformLeft = this.platform.x - (this.platform.width * this.platform.platformScale) / 2 + 20
        this.platformRight = this.platform.x + (this.platform.width * this.platform.platformScale) / 2 - 20
      }
    } else if (type === 'bouncer') {
      // Blue bouncer - bounces on platforms
      const scaleRatio = 0.85
      this.collisionBoxWidth = 75 * scaleRatio
      this.collisionBoxHeight = 84 * scaleRatio
      this.body.setSize(this.collisionBoxWidth, this.collisionBoxHeight)
      
      const targetHeight = 42
      this.enemyScale = targetHeight / 84
      this.setScale(this.enemyScale)
      
      // Bouncer has gravity and bounces
      this.body.setAllowGravity(true)
      this.body.setGravityY(700)
      this.body.setBounce(0.85) // High bounce
      this.moveSpeed = 70
      this.baseHorizontalSpeed = this.moveSpeed
      this.bounceForce = 500
      
      // Start moving horizontally
      this.body.setVelocityX(this.direction * this.moveSpeed)
      
      // Store platform for tracking
      this.platform = platform
    }

    // Set initial origin
    this.setOrigin(0.5, 1.0)

    // Initialize sound effects
    this.initializeSounds()
  }
  
  createPepeFlappingAnimation() {
    // Create wing flapping animation if it doesn't exist
    if (!this.scene.anims.exists('pepe_flying_anim')) {
      this.scene.anims.create({
        key: 'pepe_flying_anim',
        frames: [
          { key: 'pepe_flying_frame1', duration: 200 },
          { key: 'pepe_flying_frame2', duration: 200 }
        ],
        repeat: -1
      })
    }
  }

  createDogeWalkAnimation() {
    // Create walking animation if it doesn't exist
    if (!this.scene.anims.exists('doge_walk_anim')) {
      this.scene.anims.create({
        key: 'doge_walk_anim',
        frames: [
          { key: 'doge_walk_frame1', duration: 300 },
          { key: 'doge_walk_frame2', duration: 300 }
        ],
        repeat: -1
      })
    }
  }

  initializeSounds() {
    this.enemyDefeatSound = this.scene.sound.add("enemy_defeat", { volume: 0.3 })
    if (this.enemyType === 'doge') {
      this.dogeBarkSound = this.scene.sound.add("doge_bark", { volume: 0.25 })
    }
  }

  update() {
    if (this.isDead || !this.active) return

    if (this.enemyType === 'pepe') {
      // Pepe flies around - reverse direction at screen edges
      const screenWidth = this.scene.cameras.main.width
      const halfWidth = (this.width * this.enemyScale) / 2
      
      // Apply speed multiplier from difficulty
      const currentSpeed = this.baseHorizontalSpeed * this.speedMultiplier
      
      // Horizontal boundary check
      if (this.x <= halfWidth + 10) {
        this.direction = 1
        this.body.setVelocityX(this.direction * currentSpeed)
        this.setFlipX(false)
      } else if (this.x >= screenWidth - halfWidth - 10) {
        this.direction = -1
        this.body.setVelocityX(this.direction * currentSpeed)
        this.setFlipX(true)
      }
      
      // Occasionally change vertical direction for more dynamic movement
      if (Phaser.Math.Between(1, 100) <= 2) { // 2% chance each frame
        this.body.setVelocityY(Phaser.Math.Between(-this.verticalSpeed, this.verticalSpeed))
      }
      
    } else if (this.enemyType === 'doge') {
      // Apply speed multiplier from difficulty
      const currentSpeed = this.baseHorizontalSpeed * this.speedMultiplier
      
      // Doge walks back and forth on platform
      if (this.platform && this.platform.active) {
        const halfWidth = (this.width * this.enemyScale) / 2
        
        // Check if reaching platform edge
        if (this.x - halfWidth <= this.platformLeft) {
          this.direction = 1
          this.body.setVelocityX(this.direction * currentSpeed)
          this.setFlipX(false)
        } else if (this.x + halfWidth >= this.platformRight) {
          this.direction = -1
          this.body.setVelocityX(this.direction * currentSpeed)
          this.setFlipX(true)
        }
        
        // If platform is moving, follow it
        if (this.platform.platformType === 'moving') {
          // Stick to platform by matching its x movement
          this.x += this.platform.body.velocity.x * (1/60) // Approximate frame delta
        }
      } else {
        // If no platform or platform destroyed, fall
        this.body.setVelocityX(0)
      }
    } else if (this.enemyType === 'bouncer') {
      // Apply speed multiplier from difficulty
      const currentSpeed = this.baseHorizontalSpeed * this.speedMultiplier
      
      // Blue bouncer bounces on platforms
      const screenWidth = this.scene.cameras.main.width
      const halfWidth = (this.width * this.enemyScale) / 2
      
      // Maintain horizontal speed
      if (Math.abs(this.body.velocity.x) < 5) {
        this.body.setVelocityX(this.direction * currentSpeed)
      }
      
      // Reverse at screen edges
      if (this.x <= halfWidth + 10) {
        this.direction = 1
        this.body.setVelocityX(this.direction * currentSpeed)
        this.setFlipX(false)
      } else if (this.x >= screenWidth - halfWidth - 10) {
        this.direction = -1
        this.body.setVelocityX(this.direction * currentSpeed)
        this.setFlipX(true)
      }
      
      // Add continuous bouncing when on ground
      if (this.body.blocked.down || this.body.touching.down) {
        this.body.setVelocityY(-this.bounceForce)
      }
    }

    // If enemy falls too far below screen, destroy it
    if (this.y > this.scene.cameras.main.scrollY + this.scene.cameras.main.height + 200) {
      this.destroy()
    }
  }

  // Stomped by player
  stepOn() {
    if (this.isDead) return false

    this.isDead = true
    this.enemyDefeatSound.play()

    // Play defeat animation effect
    this.scene.tweens.add({
      targets: this,
      scaleX: this.enemyScale * 1.2,
      scaleY: this.enemyScale * 0.8,
      alpha: 0.5,
      duration: 150,
      yoyo: false,
      onComplete: () => {
        this.destroy()
      }
    })

    return true
  }

  // Player bounces near Doge
  playerNearby() {
    if (this.enemyType === 'doge' && !this.isDead) {
      // Play bark sound
      if (this.dogeBarkSound && !this.dogeBarkSound.isPlaying) {
        this.dogeBarkSound.play()
      }
    }
  }

  // Generate random enemy type
  static getRandomEnemyType() {
    // 70% Pepe, 30% Doge
    return Phaser.Math.Between(1, 100) <= 70 ? 'pepe' : 'doge'
  }

  // Generate random enemy type with difficulty factor
  static getRandomEnemyTypeWithDifficulty(difficultyFactor) {
    // Gary enemy appears at difficulty > 0.6 (15% chance when available) - HARDEST
    if (difficultyFactor > 0.6 && Phaser.Math.Between(1, 100) <= 15) {
      return 'gary'
    }
    // Blue bouncer appears at difficulty > 0.3 (20% chance when available)
    if (difficultyFactor > 0.3 && Phaser.Math.Between(1, 100) <= 20) {
      return 'bouncer'
    }
    // Otherwise normal enemy distribution
    return Phaser.Math.Between(1, 100) <= 70 ? 'pepe' : 'doge'
  }
}
