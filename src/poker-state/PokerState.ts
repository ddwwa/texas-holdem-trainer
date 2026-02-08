import { Player, GameState, Card, Pot, ActionRecord } from '../types/core';
import { BettingRound } from '../types/enums';

/**
 * PokerState manages the complete state of a poker game.
 * 
 * Responsibilities:
 * - Player management (add, remove, update stacks)
 * - Position tracking (dealer button, blinds)
 * - Community card management
 * - Betting round tracking
 * 
 * Validates: Requirements 1.6, 1.7, 8.1-8.7, 9.1, 9.5
 */
export class PokerState {
  private gameState: GameState;
  private actionHistory: ActionRecord[];

  constructor(
    numPlayers: number = 8,
    startingStack: number = 1000,
    smallBlind: number = 5,
    bigBlind: number = 10
  ) {
    // Initialize players
    const players: Player[] = [];
    for (let i = 0; i < numPlayers; i++) {
      players.push({
        id: `player_${i}`,
        name: i === 0 ? 'You' : `AI ${i}`,
        stack: startingStack,
        holeCards: [],
        position: i,
        currentBet: 0,
        hasFolded: false,
        isAllIn: false,
        isAI: i !== 0 // First player is human, rest are AI
      });
    }

    // Initialize game state
    this.gameState = {
      handNumber: 0,
      dealerPosition: 0,
      smallBlindPosition: 1,
      bigBlindPosition: 2,
      players,
      communityCards: [],
      pots: [{
        amount: 0,
        eligiblePlayers: players.map(p => p.id),
        isMainPot: true
      }],
      currentBettingRound: BettingRound.PREFLOP,
      currentBet: bigBlind,
      minimumRaise: bigBlind,
      actionQueue: [],
      currentActorIndex: 0
    };

    this.actionHistory = [];
  }

  /**
   * Get the current game state (read-only copy)
   */
  getGameState(): GameState {
    return JSON.parse(JSON.stringify(this.gameState));
  }

  /**
   * Get action history
   */
  getActionHistory(): ActionRecord[] {
    return [...this.actionHistory];
  }

  /**
   * Add a player to the game
   */
  addPlayer(name: string, stack: number, isAI: boolean = true): string {
    const position = this.gameState.players.length;
    const playerId = `player_${position}`;
    
    const newPlayer: Player = {
      id: playerId,
      name,
      stack,
      holeCards: [],
      position,
      currentBet: 0,
      hasFolded: false,
      isAllIn: false,
      isAI
    };

    this.gameState.players.push(newPlayer);
    
    // Add to eligible players for main pot
    if (this.gameState.pots[0]) {
      this.gameState.pots[0].eligiblePlayers.push(playerId);
    }

    return playerId;
  }

  /**
   * Remove a player from the game
   */
  removePlayer(playerId: string): boolean {
    const index = this.gameState.players.findIndex(p => p.id === playerId);
    if (index === -1) {
      return false;
    }

    this.gameState.players.splice(index, 1);
    
    // Update positions for remaining players
    this.gameState.players.forEach((player, idx) => {
      player.position = idx;
    });

    // Remove from all pots
    this.gameState.pots.forEach(pot => {
      pot.eligiblePlayers = pot.eligiblePlayers.filter(id => id !== playerId);
    });

    return true;
  }

  /**
   * Get a player by ID
   */
  getPlayer(playerId: string): Player | undefined {
    return this.gameState.players.find(p => p.id === playerId);
  }

  /**
   * Get a player by position
   */
  getPlayerByPosition(position: number): Player | undefined {
    return this.gameState.players.find(p => p.position === position);
  }

  /**
   * Update a player's stack
   */
  updatePlayerStack(playerId: string, newStack: number): boolean {
    const player = this.getPlayer(playerId);
    if (!player) {
      return false;
    }

    player.stack = Math.max(0, newStack); // Stack cannot be negative
    return true;
  }

  /**
   * Add chips to a player's stack
   */
  addToPlayerStack(playerId: string, amount: number): boolean {
    const player = this.getPlayer(playerId);
    if (!player) {
      return false;
    }

    player.stack += amount;
    return true;
  }

  /**
   * Subtract chips from a player's stack
   */
  subtractFromPlayerStack(playerId: string, amount: number): boolean {
    const player = this.getPlayer(playerId);
    if (!player || player.stack < amount) {
      return false;
    }

    player.stack -= amount;
    return true;
  }

  /**
   * Set a player's current bet
   */
  setPlayerBet(playerId: string, amount: number): boolean {
    const player = this.getPlayer(playerId);
    if (!player) {
      return false;
    }

    player.currentBet = amount;
    return true;
  }

  /**
   * Set a player's name
   */
  setPlayerName(playerId: string, name: string): boolean {
    const player = this.getPlayer(playerId);
    if (!player) {
      return false;
    }

    player.name = name;
    return true;
  }

  /**
   * Mark a player as folded
   */
  setPlayerFolded(playerId: string, folded: boolean = true): boolean {
    const player = this.getPlayer(playerId);
    if (!player) {
      return false;
    }

    player.hasFolded = folded;
    return true;
  }

  /**
   * Mark a player as all-in
   */
  setPlayerAllIn(playerId: string, allIn: boolean = true): boolean {
    const player = this.getPlayer(playerId);
    if (!player) {
      return false;
    }

    player.isAllIn = allIn;
    return true;
  }

  /**
   * Deal hole cards to a player
   */
  dealHoleCards(playerId: string, cards: Card[]): boolean {
    const player = this.getPlayer(playerId);
    if (!player) {
      return false;
    }

    player.holeCards = [...cards];
    return true;
  }

  /**
   * Clear all players' hole cards
   */
  clearAllHoleCards(): void {
    this.gameState.players.forEach(player => {
      player.holeCards = [];
    });
  }

  /**
   * Get active players (not folded, have chips)
   */
  getActivePlayers(): Player[] {
    return this.gameState.players.filter(p => !p.hasFolded && p.stack > 0);
  }

  /**
   * Get players still in the hand (not folded)
   */
  getPlayersInHand(): Player[] {
    return this.gameState.players.filter(p => !p.hasFolded);
  }

  /**
   * Rotate dealer button clockwise
   * Validates: Requirement 1.6
   */
  rotateDealer(): void {
    const numPlayers = this.gameState.players.length;
    this.gameState.dealerPosition = (this.gameState.dealerPosition + 1) % numPlayers;
    this.gameState.smallBlindPosition = (this.gameState.dealerPosition + 1) % numPlayers;
    this.gameState.bigBlindPosition = (this.gameState.dealerPosition + 2) % numPlayers;
  }

  /**
   * Set dealer position
   */
  setDealerPosition(position: number): void {
    const numPlayers = this.gameState.players.length;
    this.gameState.dealerPosition = position % numPlayers;
    this.gameState.smallBlindPosition = (position + 1) % numPlayers;
    this.gameState.bigBlindPosition = (position + 2) % numPlayers;
  }

  /**
   * Get dealer position
   */
  getDealerPosition(): number {
    return this.gameState.dealerPosition;
  }

  /**
   * Get small blind position
   */
  getSmallBlindPosition(): number {
    return this.gameState.smallBlindPosition;
  }

  /**
   * Get big blind position
   */
  getBigBlindPosition(): number {
    return this.gameState.bigBlindPosition;
  }

  /**
   * Add community cards
   */
  addCommunityCards(cards: Card[]): void {
    this.gameState.communityCards.push(...cards);
  }

  /**
   * Get community cards
   */
  getCommunityCards(): Card[] {
    return [...this.gameState.communityCards];
  }

  /**
   * Clear community cards
   */
  clearCommunityCards(): void {
    this.gameState.communityCards = [];
  }

  /**
   * Set the current betting round
   */
  setBettingRound(round: BettingRound): void {
    this.gameState.currentBettingRound = round;
  }

  /**
   * Get the current betting round
   */
  getBettingRound(): BettingRound {
    return this.gameState.currentBettingRound;
  }

  /**
   * Advance to the next betting round
   */
  advanceBettingRound(): boolean {
    const rounds = [BettingRound.PREFLOP, BettingRound.FLOP, BettingRound.TURN, BettingRound.RIVER];
    const currentIndex = rounds.indexOf(this.gameState.currentBettingRound);
    
    if (currentIndex === -1 || currentIndex === rounds.length - 1) {
      return false; // Already at river or invalid state
    }

    this.gameState.currentBettingRound = rounds[currentIndex + 1];
    return true;
  }

  /**
   * Set the current bet amount
   */
  setCurrentBet(amount: number): void {
    this.gameState.currentBet = Math.max(0, amount);
  }

  /**
   * Get the current bet amount
   */
  getCurrentBet(): number {
    return this.gameState.currentBet;
  }

  /**
   * Set the minimum raise amount
   */
  setMinimumRaise(amount: number): void {
    this.gameState.minimumRaise = Math.max(0, amount);
  }

  /**
   * Get the minimum raise amount
   */
  getMinimumRaise(): number {
    return this.gameState.minimumRaise;
  }

  /**
   * Get all pots
   */
  getPots(): Pot[] {
    return [...this.gameState.pots];
  }

  /**
   * Get the main pot
   */
  getMainPot(): Pot | undefined {
    return this.gameState.pots.find(p => p.isMainPot);
  }

  /**
   * Get total pot amount (all pots combined)
   */
  getTotalPot(): number {
    return this.gameState.pots.reduce((sum, pot) => sum + pot.amount, 0);
  }

  /**
   * Add amount to the main pot
   */
  addToMainPot(amount: number): void {
    const mainPot = this.getMainPot();
    if (mainPot) {
      mainPot.amount += amount;
    }
  }

  /**
   * Create a side pot
   */
  createSidePot(amount: number, eligiblePlayers: string[]): void {
    this.gameState.pots.push({
      amount,
      eligiblePlayers: [...eligiblePlayers],
      isMainPot: false
    });
  }

  /**
   * Clear all pots and reset to a single main pot
   */
  clearPots(): void {
    this.gameState.pots = [{
      amount: 0,
      eligiblePlayers: this.gameState.players.map(p => p.id),
      isMainPot: true
    }];
  }

  /**
   * Set the action queue (order of players to act)
   */
  setActionQueue(playerIds: string[]): void {
    this.gameState.actionQueue = [...playerIds];
    // Don't reset index here - let the caller manage the index
    // This prevents bugs where we rebuild the queue mid-round and lose track of position
  }

  /**
   * Get the current actor (player whose turn it is)
   */
  getCurrentActor(): string | undefined {
    if (this.gameState.currentActorIndex >= this.gameState.actionQueue.length) {
      return undefined;
    }
    return this.gameState.actionQueue[this.gameState.currentActorIndex];
  }

  /**
   * Advance to the next actor in the queue
   */
  advanceActor(): boolean {
    // Always increment the index to allow detection of round completion
    // The index can go past the queue length to signal all players have acted
    this.gameState.currentActorIndex++;
    return this.gameState.currentActorIndex < this.gameState.actionQueue.length;
  }

  /**
   * Reset the actor index to 0 (used after rebuilding action queue)
   */
  resetActorIndex(): void {
    this.gameState.currentActorIndex = 0;
  }

  /**
   * Set the actor index to a specific value
   */
  setActorIndex(index: number): void {
    this.gameState.currentActorIndex = index;
  }

  /**
   * Record an action in the history
   */
  recordAction(record: ActionRecord): void {
    this.actionHistory.push(record);
  }

  /**
   * Start a new hand
   */
  startNewHand(): void {
    this.gameState.handNumber++;
    
    // Rotate dealer button (Requirement 1.6)
    if (this.gameState.handNumber > 1) {
      this.rotateDealer();
    }
    
    // Clear cards
    this.clearAllHoleCards();
    this.clearCommunityCards();
    
    // Reset betting state
    this.gameState.currentBettingRound = BettingRound.PREFLOP;
    this.gameState.currentBet = 0;
    this.gameState.minimumRaise = 0;
    
    // Reset player states
    this.gameState.players.forEach(player => {
      player.currentBet = 0;
      player.hasFolded = false;
      player.isAllIn = false;
    });
    
    // Clear pots
    this.clearPots();
    
    // Clear action queue
    this.gameState.actionQueue = [];
    this.gameState.currentActorIndex = 0;
  }

  /**
   * Reset all player bets (typically done at the start of a new betting round)
   */
  resetPlayerBets(): void {
    this.gameState.players.forEach(player => {
      player.currentBet = 0;
    });
  }

  /**
   * Get the hand number
   */
  getHandNumber(): number {
    return this.gameState.handNumber;
  }
}
