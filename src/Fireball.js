import Phaser from 'phaser'
import { computeRotation } from './utils.js'

// Fireball projectile shot by Gary enemy
export class Fireball extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, velocityX, velocityY) {
    super(scene, x, y, 'fireball_projectile')
    
    scene.add.existing(this)
    scene.physics.add.existing(this)
    
    // 💎 COCAINE BEAR: Make fireballs BIGGER and more visible!
    const targetHeight = 50  // Increased from 30 to 50 (66% bigger!)
    const actualHeight = 723
    const targetScale = targetHeight / actualHeight
    this.setScale(targetScale)

    // Set origin to center
    this.setOrigin(0.5, 0.5)

    // Set depth to ensure visibility
    this.setDepth(200)

    // 💎 COCAINE BEAR: Add red tint so fireballs are SUPER visible!
    this.setTint(0xff3300)  // Bright red-orange tint
    
    // Disable gravity
    this.body.setAllowGravity(false)
    
    // Set velocity
    this.body.setVelocity(velocityX, velocityY)
    
    // Calculate rotation based on direction
    const assetDirection = new Phaser.Math.Vector2(1, 0) // Fireball faces right
    const targetDirection = new Phaser.Math.Vector2(velocityX, velocityY).normalize()
    this.rotation = computeRotation(assetDirection, targetDirection)
    
    // Fireball lifetime - destroy after 3 seconds
    scene.time.delayedCall(3000, () => {
      if (this.active) {
        this.destroy()
      }
    })
  }
  
  update() {
    // Destroy if off screen
    const bounds = this.scene.cameras.main.worldView
    if (this.x < bounds.x - 100 || this.x > bounds.right + 100 ||
        this.y < bounds.y - 100 || this.y > bounds.bottom + 100) {
      this.destroy()
    }
  }
}
