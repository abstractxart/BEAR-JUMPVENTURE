import Phaser from 'phaser'
import { Fireball } from './Fireball.js'

export class GaryEnemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'gary_enemy')
    
    scene.add.existing(this)
    scene.physics.add.existing(this)
    
    // Set scale - Gary's head is 3x bigger than normal enemies
    const targetHeight = 180
    const actualHeight = 1280
    const targetScale = targetHeight / actualHeight
    this.setScale(targetScale)
    
    // Set origin to center for erratic movement
    this.setOrigin(0.5, 0.5)
    
    // Disable gravity - floats in air
    this.body.setAllowGravity(false)
    
    // Set collision size
    const bodyWidth = 1279 * targetScale * 0.7
    const bodyHeight = 1280 * targetScale * 0.7
    this.body.setSize(bodyWidth, bodyHeight)
    
    // Erratic bouncing properties
    this.bounceSpeed = 250
    this.maxSpeed = 300
    this.changeDirectionTime = 500 // Change direction every 500ms
    this.lastDirectionChange = 0
    
    // Shooting properties
    this.shootCooldown = 2000 // Shoot every 2 seconds
    this.lastShootTime = 0
    this.fireballs = scene.add.group({
      classType: Fireball,
      runChildUpdate: true
    })
    
    // Start with random velocity
    this.changeDirection()
    
    // Health
    this.health = 3
    this.isDead = false
    
    // Flash effect when hit
    this.isFlashing = false
  }
  
  changeDirection() {
    // Random erratic movement in all directions
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
    const speed = Phaser.Math.FloatBetween(this.bounceSpeed * 0.7, this.bounceSpeed * 1.3)
    
    this.body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    )
  }
  
  shootFireball(playerX, playerY) {
    if (this.isDead) return
    
    const currentTime = this.scene.time.now
    if (currentTime - this.lastShootTime < this.shootCooldown) return
    
    this.lastShootTime = currentTime
    
    // Calculate direction to player
    const dx = playerX - this.x
    const dy = playerY - this.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) return
    
    // Normalize and set fireball speed
    const fireballSpeed = 200
    const velocityX = (dx / distance) * fireballSpeed
    const velocityY = (dy / distance) * fireballSpeed
    
    // Create fireball
    const fireball = new Fireball(this.scene, this.x, this.y, velocityX, velocityY)
    this.fireballs.add(fireball)
  }
  
  takeDamage() {
    if (this.isDead || this.isFlashing) return
    
    this.health -= 1
    
    if (this.health <= 0) {
      this.die()
    } else {
      // Flash effect
      this.isFlashing = true
      this.setTint(0xff0000)
      
      this.scene.time.delayedCall(200, () => {
        this.clearTint()
        this.isFlashing = false
      })
    }
  }
  
  die() {
    this.isDead = true

    // 💎 COCAINE BEAR: Disable physics body IMMEDIATELY so dead Gary can't hurt player!
    if (this.body) {
      this.body.enable = false
    }

    // 💎 COCAINE BEAR: Destroy all fireballs IMMEDIATELY when Gary dies!
    this.fireballs.clear(true, true)

    // Play defeat sound if available
    if (this.scene.sound.get('enemy_defeat')) {
      this.scene.sound.play('enemy_defeat', { volume: 0.3 })
    }

    // Fade out and destroy
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: 360,
      duration: 500,
      onComplete: () => {
        this.destroy()
      }
    })
  }
  
  update(time, player) {
    if (this.isDead) return
    
    // Erratic direction changes
    if (time - this.lastDirectionChange > this.changeDirectionTime) {
      this.lastDirectionChange = time
      this.changeDirection()
    }
    
    // Limit max speed
    const currentSpeed = Math.sqrt(
      this.body.velocity.x * this.body.velocity.x +
      this.body.velocity.y * this.body.velocity.y
    )
    
    if (currentSpeed > this.maxSpeed) {
      const scale = this.maxSpeed / currentSpeed
      this.body.setVelocity(
        this.body.velocity.x * scale,
        this.body.velocity.y * scale
      )
    }
    
    // Bounce off screen edges
    const bounds = this.scene.cameras.main.worldView
    const margin = 50
    
    if (this.x < bounds.x + margin) {
      this.body.setVelocityX(Math.abs(this.body.velocity.x))
    } else if (this.x > bounds.right - margin) {
      this.body.setVelocityX(-Math.abs(this.body.velocity.x))
    }
    
    if (this.y < bounds.y + margin) {
      this.body.setVelocityY(Math.abs(this.body.velocity.y))
    } else if (this.y > bounds.bottom - margin) {
      this.body.setVelocityY(-Math.abs(this.body.velocity.y))
    }
    
    // Shoot at player
    if (player && player.active) {
      this.shootFireball(player.x, player.y)
    }
    
    // Update all fireballs
    this.fireballs.children.entries.forEach(fireball => {
      if (fireball.active) {
        fireball.update()
      }
    })
  }
}
