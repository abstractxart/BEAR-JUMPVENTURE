import Phaser from 'phaser'

export class JetpackUI {
  constructor(scene) {
    this.scene = scene

    // Layout constants
    this.W = 140  // bar width
    this.H = 16   // bar height
    this.PAD = 8  // padding around bar

    const x = 12
    const y = 12

    // Create graphics
    this.bg = scene.add.graphics().setScrollFactor(0).setDepth(10000)
    this.bar = scene.add.graphics().setScrollFactor(0).setDepth(10001)
    this.label = scene.add.text(x, y + this.H + this.PAD + 2, 'JETPACK: 100%', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setScrollFactor(0).setDepth(10002)

    this.container = scene.add.container(x, y, [this.bg, this.bar, this.label])
    this.container.setScrollFactor(0).setDepth(10000)

    this.drawBackground()
    this.updateFuel(1)
    this.setVisible(false)
  }

  drawBackground() {
    this.bg.clear()
    // Back panel
    this.bg.fillStyle(0x000000, 0.45)
    this.bg.fillRoundedRect(-this.PAD, -this.PAD, this.W + this.PAD * 2, this.H + this.PAD * 2, 6)

    // Border for bar
    this.bg.lineStyle(2, 0xffffff, 0.9)
    this.bg.strokeRoundedRect(0, 0, this.W, this.H, 4)
  }

  updateFuel(ratio) {
    const clamped = Phaser.Math.Clamp(ratio, 0, 1)
    this.bar.clear()

    // Fill color: green -> yellow -> red based on fuel
    const col =
      clamped > 0.5 ? 0x35d04f :
      clamped > 0.25 ? 0xf4d03f : 0xe74c3c

    this.bar.fillStyle(col, 1)
    this.bar.fillRoundedRect(0, 0, this.W * clamped, this.H, 3)

    this.label.setText(`JETPACK: ${Math.round(clamped * 100)}%`)
  }

  setVisible(v) {
    this.container.setVisible(v)
  }
}
