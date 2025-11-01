import Phaser from 'phaser'
import { coinConfig } from './gameConfig.json'

export class Coin extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = 'xrp') {
    const textures = {
      'xrp': 'xrp_coin',
      'bear': 'golden_bear_coin'
    }

    super(scene, x, y, textures[type])

    // Add to scene and physics system
    scene.add.existing(this)
    scene.physics.add.existing(this)

    // Coin properties
    this.coinType = type
    this.isCollected = false

    // Set physics properties
    this.body.setAllowGravity(false) // Coins float
    this.body.setImmovable(true)

    // Set coin scale based on type
    this.setCoinScale()

    // Set origin
    this.setOrigin(0.5, 0.5)

    // Add floating and spinning animation
    this.addFloatingAnimation()
  }

  setCoinScale() {
    const targetSize = this.coinType === 'xrp' ? 35 : 45 // Bear coins are slightly larger
    let originalSize
    
    switch(this.coinType) {
      case 'xrp':
        originalSize = 2500 // XRP logo size
        break
      case 'bear':
        originalSize = 940 // Bear coin size
        break
      default:
        originalSize = 2500
    }

    this.coinScale = targetSize / originalSize
    this.setScale(this.coinScale)
  }

  addFloatingAnimation() {
    // Add up-down floating animation
    this.scene.tweens.add({
      targets: this,
      y: this.y - 8,
      duration: 1200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })

    // Add subtle spin/pulse for Bear coins
    if (this.coinType === 'bear') {
      this.scene.tweens.add({
        targets: this,
        scaleX: this.coinScale * 1.1,
        scaleY: this.coinScale * 1.1,
        duration: 800,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      })
    } else {
      // XRP coins spin
      this.scene.tweens.add({
        targets: this,
        angle: 360,
        duration: 2500,
        repeat: -1
      })
    }
  }

  update() {
    if (this.isCollected) return

    // If coin falls too far below screen, destroy it
    if (this.y > this.scene.cameras.main.scrollY + this.scene.cameras.main.height + 300) {
      this.destroy()
    }
  }

  // Collected by player
  collect(player) {
    if (this.isCollected) return 0

    this.isCollected = true
    
    // Player collects coin
    let points = 0
    if (this.coinType === 'xrp') {
      points = player.collectXRPCoin()
    } else {
      points = player.collectBearCoin()
    }

    // Play collection effect
    this.scene.tweens.add({
      targets: this,
      scaleX: this.coinScale * 2,
      scaleY: this.coinScale * 2,
      alpha: 0,
      duration: 250,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.destroy()
      }
    })

    return points
  }

  // Static method: random coin type generation
  static getRandomCoinType() {
    const rand = Phaser.Math.Between(1, 100)
    const xrpChance = coinConfig.xrpCoinChance.value
    const bearChance = coinConfig.bearCoinChance.value
    
    if (rand <= xrpChance) {
      return 'xrp'
    } else if (rand <= xrpChance + bearChance) {
      return 'bear'
    } else {
      return null // Do not generate coin
    }
  }
}
