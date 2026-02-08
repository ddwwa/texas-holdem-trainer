import { Pot, Player, Distribution } from '../types/core';

/**
 * PotManager handles all pot-related operations including:
 * - Adding chips to pots
 * - Creating side pots for all-in scenarios
 * - Distributing pots to winners
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.5, 7.5
 */
export class PotManager {
  private pots: Pot[];

  constructor() {
    this.pots = [this.createMainPot()];
  }

  /**
   * Creates a new main pot
   */
  private createMainPot(): Pot {
    return {
      amount: 0,
      eligiblePlayers: [],
      isMainPot: true
    };
  }

  /**
   * Gets all current pots
   */
  getPots(): Pot[] {
    // Return a deep copy to prevent external mutation
    return this.pots.map(pot => ({
      amount: pot.amount,
      eligiblePlayers: [...pot.eligiblePlayers],
      isMainPot: pot.isMainPot
    }));
  }

  /**
   * Gets the total amount across all pots
   */
  getTotalPotAmount(): number {
    return this.pots.reduce((total, pot) => total + pot.amount, 0);
  }

  /**
   * Adds chips to the main pot
   * Requirement 6.2: When a player bets or raises, add the wagered amount to the pot
   * 
   * @param amount - The amount to add to the pot
   * @param playerId - The ID of the player contributing
   */
  addToPot(amount: number, playerId: string): void {
    if (amount < 0) {
      throw new Error('Cannot add negative amount to pot');
    }

    // Add to the main pot (or the last pot if side pots exist)
    const targetPot = this.pots[this.pots.length - 1];
    const oldAmount = targetPot.amount;
    targetPot.amount += amount;

    console.log(`[PotManager] addToPot: ${playerId} adds ${amount}, pot ${oldAmount} -> ${targetPot.amount}, total: ${this.getTotalPotAmount()}`);

    // Add player to eligible players if not already there
    if (!targetPot.eligiblePlayers.includes(playerId)) {
      targetPot.eligiblePlayers.push(playerId);
    }
  }

  /**
   * Creates a side pot when a player goes all-in with less than the current bet
   * Requirement 6.3: When a player goes all-in with less than the current bet, create a side pot
   * 
   * @param players - All active players in the hand
   * @param allInPlayer - The player who went all-in
   * @param allInAmount - The amount the all-in player contributed
   */
  createSidePot(players: Player[], allInPlayer: Player, allInAmount: number): void {
    // In poker, when a player goes all-in for less than the current bet:
    // - A side pot is created for the amount the all-in player can contest
    // - The main pot contains the excess that only other players can win
    
    // Calculate how much should go into the side pot from each player
    let sidePotAmount = 0;
    const sidePotEligiblePlayers: string[] = [];
    const mainPotEligiblePlayers: string[] = [];

    for (const player of players) {
      if (player.hasFolded) {
        continue;
      }

      // The all-in player and anyone who contributed at least the all-in amount
      // are eligible for the side pot
      if (player.currentBet >= allInAmount) {
        sidePotEligiblePlayers.push(player.id);
        
        // Calculate contribution to side pot (capped at all-in amount)
        const contributionToSidePot = Math.min(player.currentBet, allInAmount);
        sidePotAmount += contributionToSidePot;
      }

      // Players who contributed more than the all-in amount are eligible for main pot
      if (player.currentBet > allInAmount) {
        mainPotEligiblePlayers.push(player.id);
      }
    }

    // Get the current pot
    const currentPot = this.pots[this.pots.length - 1];
    const remainingAmount = currentPot.amount - sidePotAmount;

    // Create the side pot with the calculated amount
    const sidePot: Pot = {
      amount: sidePotAmount,
      eligiblePlayers: sidePotEligiblePlayers,
      isMainPot: false
    };

    // Create a new main pot with the remaining amount
    const newMainPot: Pot = {
      amount: remainingAmount,
      eligiblePlayers: mainPotEligiblePlayers,
      isMainPot: true
    };

    // Replace the current pot structure with side pot first, then main pot
    this.pots = [sidePot, newMainPot];
  }

  /**
   * Distributes pots to winners
   * Requirement 7.5: Award side pots to eligible players based on hand strength
   * 
   * @param winners - Array of winners sorted by hand strength (best first)
   * @returns Array of distributions showing who gets what
   */
  distributePots(winners: { playerId: string; handRank?: any }[]): Distribution[] {
    const distributions: Distribution[] = [];

    // Process each pot (side pots first, then main pot)
    for (let potIndex = 0; potIndex < this.pots.length; potIndex++) {
      const pot = this.pots[potIndex];

      if (pot.amount === 0) {
        continue;
      }

      // Find eligible winners for this pot (in order of hand strength)
      const eligibleWinners = winners.filter(winner =>
        pot.eligiblePlayers.includes(winner.playerId)
      );

      if (eligibleWinners.length === 0) {
        // This shouldn't happen in normal play, but handle it gracefully
        continue;
      }

      // The best eligible winner(s) get the pot
      // If handRank is provided, check for ties among eligible winners
      // Otherwise, only the first eligible winner gets the pot
      let potWinners: typeof eligibleWinners;
      
      if (eligibleWinners.length > 0 && eligibleWinners[0].handRank !== undefined) {
        // Find all eligible winners with the same hand rank as the best
        const bestHandRank = eligibleWinners[0].handRank;
        potWinners = eligibleWinners.filter(w => 
          JSON.stringify(w.handRank) === JSON.stringify(bestHandRank)
        );
      } else {
        // No hand rank provided, so only the first eligible winner gets it
        potWinners = [eligibleWinners[0]];
      }

      if (potWinners.length === 1) {
        // Single winner gets the entire pot
        distributions.push({
          playerId: potWinners[0].playerId,
          amount: pot.amount,
          potIndex
        });
      } else {
        // Multiple winners split the pot
        // In case of odd chips, the extra chip goes to the first eligible winner
        const baseShare = Math.floor(pot.amount / potWinners.length);
        const remainder = pot.amount % potWinners.length;

        potWinners.forEach((winner, index) => {
          const share = baseShare + (index === 0 ? remainder : 0);
          distributions.push({
            playerId: winner.playerId,
            amount: share,
            potIndex
          });
        });
      }
    }

    return distributions;
  }

  /**
   * Resets all pots for a new hand
   */
  reset(): void {
    console.log(`[PotManager] reset: clearing all pots (was ${this.getTotalPotAmount()})`);
    this.pots = [this.createMainPot()];
  }

  /**
   * Gets the main pot
   */
  getMainPot(): Pot {
    return this.pots.find(pot => pot.isMainPot) || this.pots[this.pots.length - 1];
  }

  /**
   * Gets all side pots
   */
  getSidePots(): Pot[] {
    return this.pots.filter(pot => !pot.isMainPot);
  }
}
