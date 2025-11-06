import Phaser from 'phaser'
import { screenSize } from '../gameConfig.json'
import { BEARParkAPI } from '../BEARParkAPI'

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
  }

  create() {
    // Load mute state from localStorage
    const audioMuted = localStorage.getItem('audioMuted') === 'true'
    this.sound.mute = audioMuted

    // Create semi-transparent black background overlay
    this.add.rectangle(0, 0, screenSize.width.value, screenSize.height.value, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1000) // Ensure overlay is on top

    this.createUI()
    this.setupInputs()
  }

  createUI() {
    // Get score information from game scene
    const gameScene = this.scene.get('GameScene')
    const finalScore = gameScene ? gameScene.score : 0
    const maxHeight = gameScene ? gameScene.highestY : 0

    // Submit score to BEAR Park central leaderboard
    if (gameScene && gameScene.score !== undefined) {
      BEARParkAPI.submitScore(gameScene.score, {
        max_height: gameScene.highestY
      }).then(result => {
        if (result.success && result.is_high_score) {
          console.log('🎉 New BEAR Park high score!');
        }
      }).catch(error => {
        console.error('Error submitting to BEAR Park:', error);
      });
    }

    // Load local leaderboard
    let leaderboard = [];
    try {
      const saved = localStorage.getItem('bearJumpventureLeaderboard');
      if (saved) {
        leaderboard = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }

    // Add current score to leaderboard
    leaderboard.push({
      score: finalScore,
      height: maxHeight,
      date: new Date().toLocaleDateString()
    });

    // Sort by score (descending) and keep top 10
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);

    // Save back to localStorage
    try {
      localStorage.setItem('bearJumpventureLeaderboard', JSON.stringify(leaderboard));
    } catch (error) {
      console.error('Error saving leaderboard:', error);
    }

    // BEAR Park Theme Colors
    const colors = {
      gold: '#edb723',
      purple: '#680cd9',
      yellow: '#feb501',
      green: '#07ae08',
      charcoal: '#141619',
      ink: '#0b0d0e'
    };

    // Generate leaderboard HTML
    const leaderboardHTML = leaderboard.map((entry, index) => {
      const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : ''));
      const borderColor = index === 0 ? '#FFD700' : (index === 1 ? '#C0C0C0' : (index === 2 ? '#CD7F32' : colors.gold));
      const borderWidth = index === 0 ? '5px' : (index === 1 ? '4px' : (index === 2 ? '4px' : '3px'));
      const bgGradient = index === 0
        ? 'linear-gradient(135deg, rgba(237, 183, 35, 0.3) 0%, rgba(255, 215, 0, 0.2) 100%)'
        : (index === 1
          ? 'linear-gradient(135deg, rgba(192, 192, 192, 0.2) 0%, rgba(169, 169, 169, 0.15) 100%)'
          : (index === 2
            ? 'linear-gradient(135deg, rgba(205, 127, 50, 0.2) 0%, rgba(184, 115, 51, 0.15) 100%)'
            : 'linear-gradient(135deg, rgba(104, 12, 217, 0.15) 0%, rgba(7, 174, 8, 0.15) 100%)'));

      return `
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          margin-bottom: 8px;
          border-radius: 8px;
          background: ${bgGradient};
          border-left: ${borderWidth} solid ${borderColor};
          transition: all 0.2s ease;
          font-family: 'Luckiest Guy', cursive;
        " onmouseover="this.style.transform='translateX(6px)'" onmouseout="this.style.transform='translateX(0)'">
          <div style="font-size: 20px; color: ${colors.gold}; text-shadow: 1px 1px 0px #000; min-width: 40px;">
            ${medal || `#${index + 1}`}
          </div>
          <div style="font-size: 18px; color: #fff; text-shadow: 1px 1px 0px #000; flex: 1; margin: 0 10px;">
            ${entry.score.toLocaleString()}
          </div>
          <div style="font-size: 13px; color: ${colors.yellow}; text-shadow: 1px 1px 0px #000;">
            ${entry.height}m
          </div>
        </div>
      `;
    }).join('') || '<div style="color: #fff; font-size: 16px; text-align: center; padding: 20px;">No scores yet!</div>';

    // Create DOM UI overlay
    const uiHTML = `
      <div id="game-over-container" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: linear-gradient(180deg, ${colors.charcoal} 0%, ${colors.ink} 100%);
        z-index: 10000;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Luckiest Guy', cursive;
      ">
        <div style="
          max-width: 600px;
          width: 100%;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 100vh;
        ">

          <!-- Game Over Title -->
          <div style="
            font-size: 48px;
            text-align: center;
            color: #ff3333;
            text-shadow: 4px 4px 0px #000000;
            animation: gameOverPulse 1s ease-in-out infinite alternate;
            font-family: 'Luckiest Guy', cursive;
          ">GAME OVER</div>

          <!-- Score Card with Tri-Color Border -->
          <div style="
            position: relative;
            background: radial-gradient(500px 200px at 50% -20%, rgba(118,174,255,.12), transparent 60%), ${colors.ink};
            border-radius: 20px;
            padding: 20px;
            isolation: isolate;
          ">
            <!-- Tri-color border -->
            <div style="
              content: '';
              position: absolute;
              inset: 0;
              border-radius: 20px;
              padding: 3px;
              background: linear-gradient(135deg, ${colors.purple} 0%, ${colors.purple} 33.33%, ${colors.yellow} 33.33%, ${colors.yellow} 66.66%, ${colors.green} 66.66%, ${colors.green} 100%);
              -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
              -webkit-mask-composite: xor;
              mask-composite: exclude;
              pointer-events: none;
              z-index: 0;
              opacity: 1;
            "></div>

            <div style="font-size: 18px; color: ${colors.gold}; text-shadow: 2px 2px 0px rgba(0,0,0,0.5); margin-bottom: 4px; text-transform: uppercase; text-align: center; position: relative; z-index: 1;">
              FINAL SCORE
            </div>
            <div style="font-size: 40px; color: #fff; text-shadow: 3px 3px 0px rgba(0,0,0,0.5); text-align: center; position: relative; z-index: 1;">
              ${finalScore.toLocaleString()}
            </div>
            <div style="font-size: 16px; color: #fff; text-align: center; margin-top: 4px; position: relative; z-index: 1;">Max Height: ${maxHeight}m</div>
          </div>

          <!-- Leaderboard Title -->
          <div style="
            font-size: 24px;
            color: ${colors.gold};
            text-shadow: 2px 2px 0px #000;
            text-align: center;
            text-transform: uppercase;
            font-family: 'Luckiest Guy', cursive;
          ">🏆 TOP 10 SCORES 🏆</div>

          <!-- Leaderboard (scrollable) -->
          <div style="
            background: radial-gradient(500px 200px at 50% -20%, rgba(118,174,255,.08), transparent 60%), ${colors.ink};
            border-radius: 16px;
            padding: 12px;
            max-height: 200px;
            overflow-y: auto;
          ">
            ${leaderboardHTML}
          </div>

          <!-- Retry Button -->
          <button
            id="restart-button"
            style="
              width: 100%;
              padding: 16px;
              font-size: 28px;
              font-family: 'Luckiest Guy', cursive;
              background: linear-gradient(135deg, #ff3333 0%, #cc0000 100%);
              color: #fff;
              border: 3px solid rgba(255,255,255,.3);
              border-radius: 12px;
              cursor: pointer;
              box-shadow: 0 4px 16px rgba(255,51,51,.5);
              transition: all 0.2s ease;
              text-shadow: 2px 2px 0px #000;
              animation: blink 1s ease-in-out infinite alternate;
            "
            onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(255,51,51,.7)';"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 16px rgba(255,51,51,.5)';"
            onmousedown="this.style.transform='scale(0.95)';"
            onmouseup="this.style.transform='scale(1.05)';"
          >
            TAP TO RESTART
          </button>

          <!-- Main Menu Button -->
          <button
            id="menu-button"
            style="
              width: 100%;
              padding: 12px;
              font-size: 20px;
              font-family: 'Luckiest Guy', cursive;
              background: rgba(255,255,255,0.1);
              color: #fff;
              border: 2px solid rgba(255,255,255,.3);
              border-radius: 10px;
              cursor: pointer;
              transition: all 0.2s ease;
              text-shadow: 2px 2px 0px #000;
            "
            onmouseover="this.style.background='rgba(255,255,255,0.2)'; this.style.borderColor='${colors.gold}';"
            onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='rgba(255,255,255,.3)';"
          >
            MAIN MENU
          </button>

        </div>

        <!-- Custom Animations -->
        <style>
          @keyframes gameOverPulse {
            from { transform: scale(1); }
            to { transform: scale(1.05); }
          }

          @keyframes blink {
            from { opacity: 0.8; }
            to { opacity: 1; }
          }

          @media (max-width: 600px) {
            #game-over-container > div:first-child {
              padding-top: 20px;
            }
          }
        </style>
      </div>
    `;

    // Create DOM element
    const gameOverDiv = document.createElement('div');
    gameOverDiv.innerHTML = uiHTML;
    document.body.appendChild(gameOverDiv.firstElementChild);

    // Store reference for cleanup
    this.gameOverContainer = document.getElementById('game-over-container');
  }

  setupInputs() {
    // Setup button click handlers
    const restartButton = document.getElementById('restart-button')
    const menuButton = document.getElementById('menu-button')

    if (restartButton) {
      restartButton.addEventListener('click', () => this.restartGame())
    }

    if (menuButton) {
      menuButton.addEventListener('click', () => this.backToMenu())
    }

    // Listen for keyboard events
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)

    this.enterKey.on('down', () => {
      this.restartGame()
    })

    this.spaceKey.on('down', () => {
      this.restartGame()
    })

    this.escKey.on('down', () => {
      this.backToMenu()
    })
  }

  restartGame() {
    // Play click sound effect
    this.sound.add("ui_click", { volume: 0.3 }).play()

    // Remove DOM element
    if (this.gameOverContainer && this.gameOverContainer.parentNode) {
      this.gameOverContainer.parentNode.removeChild(this.gameOverContainer)
    }

    // Stop background music from previous game
    const gameScene = this.scene.get('GameScene')
    if (gameScene && gameScene.backgroundMusic) {
      gameScene.backgroundMusic.stop()
    }

    // Stop all running scenes
    this.scene.stop('GameScene')
    this.scene.stop('UIScene')

    // Restart game and UI
    this.scene.start('GameScene')
    this.scene.stop()
  }

  backToMenu() {
    // Play click sound effect
    this.sound.add("ui_click", { volume: 0.3 }).play()

    // Remove DOM element
    if (this.gameOverContainer && this.gameOverContainer.parentNode) {
      this.gameOverContainer.parentNode.removeChild(this.gameOverContainer)
    }

    // Stop background music from game
    const gameScene = this.scene.get('GameScene')
    if (gameScene && gameScene.backgroundMusic) {
      gameScene.backgroundMusic.stop()
    }

    // Stop all game scenes
    this.scene.stop('GameScene')
    this.scene.stop('UIScene')

    // Return to title screen
    this.scene.start('TitleScene')
    this.scene.stop()
  }
}