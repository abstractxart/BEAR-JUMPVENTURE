import Phaser from 'phaser'
import { screenSize } from '../gameConfig.json'
import { BEARParkAPI } from '../BEARParkAPI'

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
    this.leaderboard = []
    this.nameSubmitted = false
  }

  async create() {
    // Load mute state from localStorage
    const audioMuted = localStorage.getItem('audioMuted') === 'true'
    this.sound.mute = audioMuted

    // Create semi-transparent black background overlay
    this.add.rectangle(0, 0, screenSize.width.value, screenSize.height.value, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1000) // Ensure overlay is on top

    // Load leaderboard first
    await this.loadLeaderboard()

    this.createUI()
    this.setupInputs()

    // Auto-submit score if user is authenticated
    if (BEARParkAPI.isAuthenticated()) {
      const displayName = BEARParkAPI.getCurrentUserDisplayName()
      console.log(`🔐 User authenticated as: ${displayName} - auto-submitting score`)
      this.submitScore(displayName)
    }
  }

  createUI() {
    // Get score information from game scene
    const gameScene = this.scene.get('GameScene')
    const finalScore = gameScene ? gameScene.score : 0
    const maxHeight = gameScene ? gameScene.highestY : 0

    // BEAR Park Theme Colors
    const colors = {
      gold: '#edb723',
      purple: '#680cd9',
      yellow: '#feb501',
      green: '#07ae08',
      charcoal: '#141619',
      ink: '#0b0d0e'
    };

    // Generate leaderboard HTML with avatars (top 5 only)
    const leaderboardHTML = this.leaderboard.slice(0, 5).map((entry, index) => {
      const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : ''));
      const borderColor = index === 0 ? '#FFD700' : (index === 1 ? '#C0C0C0' : (index === 2 ? '#CD7F32' : colors.gold));
      const borderWidth = index === 0 ? '4px' : (index === 1 ? '3px' : (index === 2 ? '3px' : '2px'));
      const bgGradient = index === 0
        ? 'linear-gradient(135deg, rgba(237, 183, 35, 0.3) 0%, rgba(255, 215, 0, 0.2) 100%)'
        : (index === 1
          ? 'linear-gradient(135deg, rgba(192, 192, 192, 0.2) 0%, rgba(169, 169, 169, 0.15) 100%)'
          : (index === 2
            ? 'linear-gradient(135deg, rgba(205, 127, 50, 0.2) 0%, rgba(184, 115, 51, 0.15) 100%)'
            : 'linear-gradient(135deg, rgba(104, 12, 217, 0.15) 0%, rgba(7, 174, 8, 0.15) 100%)'));

      // Avatar URL with fallback
      const avatarUrl = entry.avatar || 'https://files.catbox.moe/25ekkd.png';
      const displayName = entry.name || 'Anonymous';

      return `
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          margin-bottom: 6px;
          border-radius: 8px;
          background: ${bgGradient};
          border-left: ${borderWidth} solid ${borderColor};
          transition: all 0.2s ease;
          font-family: 'Luckiest Guy', cursive;
        " onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
          <div style="font-size: 18px; color: ${colors.gold}; text-shadow: 1px 1px 0px #000; min-width: 36px;">
            ${medal || `#${index + 1}`}
          </div>
          <img src="${avatarUrl}" alt="${displayName}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid ${colors.gold}; margin: 0 8px;" onerror="this.src='https://files.catbox.moe/25ekkd.png'">
          <div style="font-size: 16px; color: #fff; text-shadow: 1px 1px 0px #000; flex: 1; margin: 0 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${displayName}
          </div>
          <div style="font-size: 18px; color: ${colors.yellow}; text-shadow: 1px 1px 0px #000;">
            ${entry.score.toLocaleString()}
          </div>
        </div>
      `;
    }).join('') || '<div style="color: #fff; font-size: 14px; text-align: center;">No scores yet!</div>';

    // Create DOM UI overlay
    const uiHTML = `
      <div id="game-over-container" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(180deg, ${colors.charcoal} 0%, ${colors.ink} 100%);
        z-index: 999999;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Luckiest Guy', cursive;
        pointer-events: auto;
        touch-action: auto;
      ">
        <div style="
          max-width: 600px;
          width: 100%;
          padding: 16px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom));
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 100vh;
          overflow-y: auto;
        ">

          <!-- Game Over Title -->
          <div style="
            font-size: 40px;
            text-align: center;
            color: #ff3333;
            text-shadow: 3px 3px 0px #000000;
            animation: gameOverPulse 1s ease-in-out infinite alternate;
            font-family: 'Luckiest Guy', cursive;
            line-height: 1;
          ">GAME OVER</div>

          <!-- Score Card with Tri-Color Border -->
          <div style="
            position: relative;
            background: radial-gradient(500px 200px at 50% -20%, rgba(118,174,255,.12), transparent 60%), ${colors.ink};
            border-radius: 16px;
            padding: 16px;
            isolation: isolate;
          ">
            <!-- Tri-color border -->
            <div style="
              content: '';
              position: absolute;
              inset: 0;
              border-radius: 16px;
              padding: 3px;
              background: linear-gradient(135deg, ${colors.purple} 0%, ${colors.purple} 33.33%, ${colors.yellow} 33.33%, ${colors.yellow} 66.66%, ${colors.green} 66.66%, ${colors.green} 100%);
              -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
              -webkit-mask-composite: xor;
              mask-composite: exclude;
              pointer-events: none;
              z-index: 0;
              opacity: 1;
            "></div>

            <div style="position: relative; z-index: 1;">
              <div style="font-size: 16px; color: ${colors.gold}; text-shadow: 1px 1px 0px rgba(0,0,0,0.5); margin-bottom: 4px; text-transform: uppercase; text-align: center;">
                YOUR SCORE
              </div>
              <div style="font-size: 36px; color: #fff; text-shadow: 2px 2px 0px rgba(0,0,0,0.5); text-align: center; line-height: 1;">
                ${finalScore.toLocaleString()}
              </div>
              <div style="font-size: 14px; color: #fff; text-align: center; margin-top: 4px;">Max Height: ${maxHeight}m</div>
            </div>
          </div>

          <!-- Name Entry Form (only shown if NOT authenticated) -->
          ${BEARParkAPI.isAuthenticated() ? '' : `
          <div id="name-entry-container" style="
            background: linear-gradient(180deg, rgba(237,183,35,0.12) 0%, #1a1d22 100%);
            border-radius: 12px;
            padding: 12px;
            border-bottom: 3px solid;
            border-image: linear-gradient(to right, ${colors.purple} 0%, ${colors.purple} 33.33%, ${colors.yellow} 33.33%, ${colors.yellow} 66.66%, ${colors.green} 66.66%, ${colors.green} 100%) 1;
          ">
            <div style="
              font-size: 14px;
              color: ${colors.gold};
              text-shadow: 1px 1px 0px #000;
              margin-bottom: 8px;
              text-align: center;
              font-family: 'Luckiest Guy', cursive;
            ">ENTER YOUR NAME</div>

            <input
              id="player-name-input"
              type="text"
              maxlength="12"
              placeholder="Your Name"
              style="
                width: 100%;
                padding: 10px;
                font-size: 18px;
                font-family: 'Luckiest Guy', cursive;
                text-align: center;
                background: rgba(255, 255, 255, 0.9);
                border: 3px solid ${colors.gold};
                border-radius: 8px;
                outline: none;
                color: #000;
                margin-bottom: 8px;
                box-sizing: border-box;
                pointer-events: auto;
                touch-action: manipulation;
              "
            />

            <button
              id="submit-name-btn"
              style="
                width: 100%;
                padding: 10px;
                font-size: 18px;
                font-family: 'Luckiest Guy', cursive;
                background: linear-gradient(135deg, ${colors.gold} 0%, #d4a617 100%);
                color: #000;
                border: 2px solid rgba(255,255,255,.5);
                border-radius: 8px;
                cursor: pointer;
                box-shadow: 0 3px 12px rgba(237,183,35,.5);
                transition: all 0.2s ease;
                text-shadow: 1px 1px 0px rgba(255,255,255,0.3);
                pointer-events: auto;
                touch-action: manipulation;
              "
              onmouseover="this.style.transform='scale(1.03)'; this.style.boxShadow='0 4px 16px rgba(237,183,35,.7)';"
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 3px 12px rgba(237,183,35,.5)';"
              onmousedown="this.style.transform='scale(0.97)';"
              onmouseup="this.style.transform='scale(1.03)';"
              ontouchstart="this.style.transform='scale(0.97)';"
              ontouchend="this.style.transform='scale(1)';"
            >
              SUBMIT SCORE
            </button>

            <div style="
              font-size: 11px;
              color: rgba(255,255,255,0.6);
              text-align: center;
              margin-top: 8px;
              font-family: Arial, sans-serif;
            ">
              Connect your wallet at <a href="https://bearpark.xyz" target="_blank" style="color: ${colors.gold}; text-decoration: underline;">bearpark.xyz</a> to save your scores!
            </div>
          </div>
          `}

          <!-- Leaderboard Title -->
          <div style="
            font-size: 20px;
            color: ${colors.gold};
            text-shadow: 2px 2px 0px #000;
            text-align: center;
            text-transform: uppercase;
            font-family: 'Luckiest Guy', cursive;
          ">🏆 TOP 5 PLAYERS 🏆</div>

          <!-- Leaderboard -->
          <div style="
            background: radial-gradient(500px 200px at 50% -20%, rgba(118,174,255,.08), transparent 60%), ${colors.ink};
            border-radius: 12px;
            padding: 10px;
            max-height: 140px;
            overflow-y: auto;
          ">
            ${leaderboardHTML}
          </div>

          <!-- Retry Button -->
          <button
            id="restart-button"
            style="
              width: 100%;
              padding: 12px;
              font-size: 24px;
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
              pointer-events: auto;
              touch-action: manipulation;
            "
            onmouseover="this.style.transform='scale(1.03)'; this.style.boxShadow='0 5px 20px rgba(255,51,51,.7)';"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 16px rgba(255,51,51,.5)';"
            onmousedown="this.style.transform='scale(0.97)';"
            onmouseup="this.style.transform='scale(1.03)';"
            ontouchstart="this.style.transform='scale(0.97)';"
            ontouchend="this.style.transform='scale(1)';"
          >
            TAP TO RETRY
          </button>

          <!-- Main Menu Button -->
          <button
            id="menu-button"
            style="
              width: 100%;
              padding: 10px;
              font-size: 18px;
              font-family: 'Luckiest Guy', cursive;
              background: rgba(255,255,255,0.1);
              color: #fff;
              border: 2px solid rgba(255,255,255,.3);
              border-radius: 10px;
              cursor: pointer;
              transition: all 0.2s ease;
              text-shadow: 2px 2px 0px #000;
              pointer-events: auto;
              touch-action: manipulation;
            "
            onmouseover="this.style.background='rgba(255,255,255,0.2)'; this.style.borderColor='${colors.gold}';"
            onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='rgba(255,255,255,.3)';"
            ontouchstart="this.style.background='rgba(255,255,255,0.2)'; this.style.borderColor='${colors.gold}';"
            ontouchend="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='rgba(255,255,255,.3)';"
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

          input:focus {
            border-color: ${colors.purple} !important;
            box-shadow: 0 0 0 4px rgba(104, 12, 217, 0.3) !important;
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

    // Setup name submission if not authenticated
    this.setupNameSubmission();
  }

  setupInputs() {
    // Setup button click handlers
    const restartButton = document.getElementById('restart-button')
    const menuButton = document.getElementById('menu-button')

    if (restartButton) {
      restartButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.restartGame();
      })
    }

    if (menuButton) {
      menuButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.backToMenu();
      })
    }

    // Listen for keyboard events
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)

    this.enterKey.on('down', () => {
      // Check if input is focused
      const input = document.getElementById('player-name-input')
      if (input && document.activeElement === input) {
        return; // Don't restart if typing
      }
      this.restartGame()
    })

    this.spaceKey.on('down', () => {
      // Check if input is focused
      const input = document.getElementById('player-name-input')
      if (input && document.activeElement === input) {
        return; // Don't restart if typing
      }
      this.restartGame()
    })

    this.escKey.on('down', () => {
      this.backToMenu()
    })
  }

  setupNameSubmission() {
    const submitBtn = document.getElementById('submit-name-btn')
    const nameInput = document.getElementById('player-name-input')

    if (submitBtn && nameInput) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const name = nameInput.value.trim();
        if (name.length > 0) {
          this.submitScore(name);
        }
      });

      // Handle keyboard events
      nameInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
      });

      nameInput.addEventListener('keypress', (e) => {
        e.stopPropagation();

        if (e.key === 'Enter') {
          e.preventDefault();
          const name = nameInput.value.trim();
          if (name.length > 0) {
            this.submitScore(name);
          }
        }
      });

      nameInput.addEventListener('keyup', (e) => {
        e.stopPropagation();
      });
    }
  }

  async loadLeaderboard() {
    // Fetch leaderboard from BEAR Park central API
    console.log('🔍 Loading leaderboard from BEAR Park API...');
    try {
      const centralLeaderboard = await BEARParkAPI.getLeaderboard(10);
      console.log('✅ Central leaderboard response:', centralLeaderboard);

      if (centralLeaderboard && centralLeaderboard.length > 0) {
        // Transform central leaderboard entries to match local format
        this.leaderboard = centralLeaderboard.map(entry => {
          const displayName = BEARParkAPI.formatDisplayName(entry);

          // Parse avatar_nft JSON to get imageUrl
          let avatarUrl = 'https://files.catbox.moe/25ekkd.png'; // Default BEAR logo
          if (entry.avatar_nft) {
            try {
              const avatarData = typeof entry.avatar_nft === 'string' ? JSON.parse(entry.avatar_nft) : entry.avatar_nft;
              if (avatarData.imageUrl) {
                avatarUrl = avatarData.imageUrl;
              }
            } catch (e) {
              console.warn('Failed to parse avatar_nft for', displayName, e);
            }
          }

          return {
            name: displayName,
            score: entry.score,
            height: entry.metadata?.max_height || 0,
            date: entry.created_at || new Date().toISOString(),
            avatar: avatarUrl
          };
        });
        console.log('✅ Loaded BEAR Park central leaderboard:', this.leaderboard);
      } else {
        this.leaderboard = [];
        console.log('⚠️ Central leaderboard is empty');
      }
    } catch (error) {
      console.error('❌ Error loading central leaderboard:', error);
      this.leaderboard = [];
    }
  }

  async submitScore(name) {
    if (this.nameSubmitted) return;

    console.log('🔍 submitScore called with name:', name);
    this.nameSubmitted = true;

    const gameScene = this.scene.get('GameScene')
    const finalScore = gameScene ? gameScene.score : 0
    const maxHeight = gameScene ? gameScene.highestY : 0

    // Submit score to BEAR Park central leaderboard
    try {
      console.log('🔍 Submitting score to BEAR Park API...');
      const result = await BEARParkAPI.submitScore(finalScore, {
        max_height: maxHeight,
        player_name: name
      });
      console.log('🔍 Submit score result:', result);

      if (result.success && result.is_high_score) {
        console.log('🎉 New BEAR Park high score!');
      } else if (result.success) {
        console.log('✅ Score submitted successfully');
      }

      // Reload leaderboard from central API to show updated rankings
      console.log('🔍 Reloading leaderboard after submission...');
      await this.loadLeaderboard();

      // Recreate UI to show updated leaderboard
      console.log('🔍 Recreating UI...');
      if (this.gameOverContainer && this.gameOverContainer.parentNode) {
        this.gameOverContainer.parentNode.removeChild(this.gameOverContainer);
      }
      this.createUI();
      this.setupInputs();
      console.log('🔍 UI recreated successfully');
    } catch (error) {
      console.error('❌ Error submitting to BEAR Park:', error);
    }

    // Play UI click sound (only if manual submission)
    if (!BEARParkAPI.isAuthenticated()) {
      this.sound.add("ui_click", { volume: 0.3 }).play();
    }

    // Hide name entry form (if it exists)
    const nameContainer = document.getElementById('name-entry-container');
    if (nameContainer) {
      nameContainer.style.display = 'none';
    }
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