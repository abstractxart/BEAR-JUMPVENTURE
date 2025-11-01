import Phaser from 'phaser'

export class RocketBooster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'jetpack_powerup')

    // Add to scene and physics system
    scene.add.existing(this)
    scene.physics.add.existing(this)

    // Rocket properties
    this.isCollected = false

    // Set physics properties
    this.body.setAllowGravity(false) // Rockets float
    this.body.setImmovable(true)

    // Set jetpack scale
    const targetSize = 45
    const originalSize = 620
    this.rocketScale = targetSize / originalSize
    this.setScale(this.rocketScale)

    // Set origin
    this.setOrigin(0.5, 0.5)

    // Add floating and spinning animation
    this.addFloatingAnimation()
  }

  addFloatingAnimation() {
    // Add up-down floating animation
    this.scene.tweens.add({
      targets: this,
      y: this.y - 10,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })

    // Add spin animation
    this.scene.tweens.add({
      targets: this,
      angle: 360,
      duration: 2000,
      repeat: -1
    })
    
    // Add pulse animation
    this.scene.tweens.add({
      targets: this,
      scaleX: this.rocketScale * 1.2,
      scaleY: this.rocketScale * 1.2,
      duration: 600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
  }

  update() {
    if (this.isCollected) return

    // If rocket falls too far below screen, destroy it
    if (this.y > this.scene.cameras.main.scrollY + this.scene.cameras.main.height + 300) {
      this.destroy()
    }
  }

  // Collected by player
  collect(player) {
    if (this.isCollected) return false

    this.isCollected = true
    
    // Play powerup collection sound
    this.scene.sound.add("bear_coin_pickup", { volume: 0.4 }).play()
    
    // Give player rocket boost (which grants jetpack)
    player.rocketBoost()

    // Play collection effect
    this.scene.tweens.add({
      targets: this,
      scaleX: this.rocketScale * 3,
      scaleY: this.rocketScale * 3,
      alpha: 0,
      duration: 300,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.destroy()
      }
    })

    return true
  }
}
