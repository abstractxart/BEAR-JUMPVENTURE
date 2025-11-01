import Phaser from 'phaser'

export class DifficultyManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {{
   *   graceMs?: number,          // time before difficulty starts ramping
   *   rampMs?: number,           // time to reach max difficulty
   *   maxLevel?: number,         // optional, if you prefer discrete "levels"
   *   useDiscreteLevels?: boolean
   * }} opts
   */
  constructor(scene, opts = {}) {
    this.scene = scene
    this.startTime = 0
    this.elapsed = 0

    this.graceMs = opts.graceMs ?? 5000       // 5s of chill at the start
    this.rampMs = opts.rampMs ?? 120000       // 2 minutes to hit max
    this.maxLevel = opts.maxLevel ?? 20
    this.useDiscrete = !!opts.useDiscreteLevels
    this.level = 0
  }

  start() {
    this.startTime = this.scene.time.now
  }

  /**
   * Call every frame from update()
   */
  update() {
    this.elapsed = this.scene.time.now - this.startTime
    const f = this.factor() // 0..1

    // If you want discrete "levels", map factor -> level here
    if (this.useDiscrete) {
      this.level = Math.min(this.maxLevel, Math.floor(f * this.maxLevel))
    }
  }

  /**
   * A smooth 0..1 difficulty factor over time.
   * - 0 during grace period
   * - Eases in over rampMs using an easeInQuad feel
   */
  factor() {
    const t = Math.max(0, this.elapsed - this.graceMs)
    const u = Phaser.Math.Clamp(t / Math.max(1, this.rampMs), 0, 1)
    // easeInQuad
    return u * u
  }

  /**
   * Handy getters for scaling various game systems.
   * Feel free to tune the coefficients to taste.
   */
  get scales() {
    const f = this.factor()

    return {
      // Spawn platforms a bit farther apart as it gets harder
      platformGap: {
        t: Phaser.Math.Clamp(f * 1.0, 0, 1) // 0..1 blend
      },

      // Increase chance/proportion of trickier platform types
      breakingChance: Phaser.Math.Clamp(0.10 + 0.50 * f, 0.10, 0.60), // 10% -> 60% (more breaking platforms over time)
      movingChance: Phaser.Math.Clamp(0.08 + 0.17 * f, 0.08, 0.25),   // 8% -> 25%
      springChance: Phaser.Math.Clamp(0.05, 0.05, 0.05),              // keep spring constant

      // Enemies appear more often and move faster
      enemySpawnChanceMul: 1.0 + 1.5 * f,                             // spawn chance increases
      enemySpeedMul: 1.0 + 0.8 * f,                                   // up to +80% speed

      // Coins: keep rarer coins rare or make them rarer still
      bearCoinChanceMul: Phaser.Math.Clamp(1.0 - 0.3 * f, 0.7, 1.0),
      
      // Jetpack becomes rarer as difficulty increases
      jetpackChanceMul: Phaser.Math.Clamp(1.0 - 0.5 * f, 0.5, 1.0),

      // Moving platform speed increases
      movingPlatformSpeedMul: 1.0 + 0.6 * f,                          // up to +60% speed
      
      // Normal platforms become fragile over time (2 touches -> 1 touch at max difficulty)
      normalPlatformMaxTouches: f < 0.5 ? 2 : 1,                      // Becomes 1-touch at 50% difficulty
    }
  }
}
