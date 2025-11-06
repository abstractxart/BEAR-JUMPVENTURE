/**
 * BEAR Park Leaderboard API Integration
 * Submits scores to central bearpark.xyz leaderboard
 */

const BEAR_API_URL = 'https://bearpark.xyz/api';
const GAME_ID = 'bear-jumpventure';

export class BEARParkAPI {
  /**
   * Get the wallet address from localStorage (set by bearpark.xyz)
   */
  static getWalletAddress() {
    return localStorage.getItem('xaman_wallet_address');
  }

  /**
   * Get the user's display name from localStorage
   */
  static getDisplayName() {
    return localStorage.getItem('display_name') || 'Anonymous';
  }

  /**
   * Check if user is authenticated with XAMAN wallet
   */
  static isAuthenticated() {
    return !!this.getWalletAddress();
  }

  /**
   * Submit a score to the leaderboard
   * @param {number} score - The player's score
   * @param {object} metadata - Optional metadata (height, jumps, etc)
   * @returns {Promise<object>} Promise with submission result
   */
  static async submitScore(score, metadata = {}) {
    const walletAddress = this.getWalletAddress();

    if (!walletAddress) {
      console.log('ℹ️ Score not submitted - user not authenticated with XAMAN wallet');
      return {
        success: false,
        error: 'Not authenticated',
        message: 'Connect your XAMAN wallet at bearpark.xyz to save scores!'
      };
    }

    try {
      console.log(`📤 Submitting score to BEAR Park: ${score}`);

      const response = await fetch(`${BEAR_API_URL}/leaderboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          game_id: GAME_ID,
          score: score,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            display_name: this.getDisplayName()
          }
        })
      });

      const data = await response.json();

      if (data.success && data.is_high_score) {
        console.log('🎉 NEW BEAR PARK HIGH SCORE!', score);
      } else if (data.success) {
        console.log('✅ Score submitted to BEAR Park (not a high score)');
      }

      return data;
    } catch (error) {
      console.error('❌ Error submitting score to BEAR Park:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get the leaderboard for this game
   * @param {number} limit - Number of top scores to retrieve
   * @returns {Promise<Array>} Promise with array of leaderboard entries
   */
  static async getLeaderboard(limit = 10) {
    try {
      const response = await fetch(`${BEAR_API_URL}/leaderboard/${GAME_ID}?limit=${limit}`);
      const data = await response.json();
      return data.leaderboard || [];
    } catch (error) {
      console.error('❌ Error fetching BEAR Park leaderboard:', error);
      return [];
    }
  }

  /**
   * Get the current user's best score for this game
   * @returns {Promise<object|null>} Promise with user's score entry or null
   */
  static async getMyScore() {
    const walletAddress = this.getWalletAddress();

    if (!walletAddress) {
      return null;
    }

    try {
      const response = await fetch(`${BEAR_API_URL}/leaderboard/${GAME_ID}/${walletAddress}`);
      const data = await response.json();
      return data.entry || null;
    } catch (error) {
      console.error('❌ Error fetching user score from BEAR Park:', error);
      return null;
    }
  }
}
