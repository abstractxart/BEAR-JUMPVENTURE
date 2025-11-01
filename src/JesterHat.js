import Phaser from 'phaser'
import { gameConfig } from './gameConfig.json'

export class JesterHat extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'jester_hat_powerup')

    // Add to scene and physics system
    scene.add.existing(this)
    scene.physics.add.existing(this)

    // Jester Hat properties
    this.isCollected = false

    // Set physics properties
    this.body.setAllowGravity(false) // Float in air
    this.body.setImmovable(true)

    // Set scale
    this.setJesterHatScale()

    // Set origin
    this.setOrigin(0.5, 0.5)

    // Add floating and spinning animation
    this.addFloatingAnimation()
  }

  setJesterHatScale() {
    const targetSize = 40 // Target display size
    const originalSize = 614 // Asset height
    this.jesterHatScale = targetSize / originalSize
    this.setScale(this.jesterHatScale)
  }

  addFloatingAnimation() {
    // Add up-down floating animation
    this.scene.tweens.add({
      targets: this,
      y: this.y - 10,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })

    // Add rainbow glow effect
    this.scene.tweens.add({
      targets: this,
      scaleX: this.jesterHatScale * 1.15,
      scaleY: this.jesterHatScale * 1.15,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })

    // Add rotation for extra visibility
    this.scene.tweens.add({
      targets: this,
      angle: 10,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
  }

  update() {
    if (this.isCollected) return

    // If powerup falls too far below screen, destroy it
    if (this.y > this.scene.cameras.main.scrollY + this.scene.cameras.main.height + 300) {
      this.destroy()
    }
  }

  // Collected by player
  collect(player) {
    if (this.isCollected) return false

    this.isCollected = true
    
    // F) Grant jester hat powerup
    player.activateJesterHat()

    // Play collection effect
    this.scene.tweens.add({
      targets: this,
      scaleX: this.jesterHatScale * 3,
      scaleY: this.jesterHatScale * 3,
      alpha: 0,
      duration: 400,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.destroy()
      }
    })

    return true
  }
}
