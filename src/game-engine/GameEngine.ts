import { PokerState } from '../poker-state/PokerState';
import { PotManager } from '../pot-manager/PotManager';
import { HandResolver } from '../hand-resolver/HandResolver';
import { ActionValidator } from '../action-validator/ActionValidator';
import { Deck } from '../deck/Deck';
import { Card } from '../card/Card';
import { Action, ActionResult, HandResult, Distribution, Player } from '../types/core';
import { ActionType, BettingRound, HandCategory } from '../types/enums';

/**
 * GameEngine orchestrates the complete poker game flow.
 * 
 * Responsibilities:
 * - Deal cards (2 hole cards per player, then flop/turn/river)
 * - Process player actions using ActionValidator
 * - Advance through betting rounds (preflop → flop → turn → river)
 * - Resolve hands and distribute pots using HandResolver and PotManager
 * - Integrate with all existing components
 * 
 * Validates: Requirements 1.2, 1.3, 1.4, 1.5, 2.1-2.6, 7.1, 7.2, 10.1, 10.2, 10.5
 */
export class GameEngine {
  private pokerState: PokerState;
  private potManager: PotManager;
  private handResolver: HandResolver;
  private actionValidator: ActionValidator;
  private deck: Deck;
  private smallBlind: number;
  private bigBlind: number;

  constructor(
    numPlayers: number = 8,
    startingStack: number = 1000,
    smallBlind: number = 5,
    bigBlind: number = 10
  ) {
    this.pokerState = new PokerState(numPlayers, startingStack, smallBlind, bigBlind);
    this.potManager = new PotManager();
    this.handResolver = new HandResolver();
    this.actionValidator = new ActionValidator();
    this.deck = new Deck();
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
  }

  /**
   * Deals a new hand to all players.
   * - Posts blinds
   * - Deals 2 hole cards to each player
   * - Sets up action queue for preflop betting
   * 
   * Validates: Requirements 1.2, 1.7
   */
  dealHand(): void {
    // Start a new hand
    this.pokerState.startNewHand();
    this.potManager.reset();
    
    // Shuffle and reset deck
    this.deck.reset();
    this.deck.shuffle();

    // Post blinds
    this.postBlinds();

    // Deal 2 hole cards to each player
    const gameState = this.pokerState.getGameState();
    for (const player of gameState.players) {
      if (player.stack > 0) {
        const holeCards = this.deck.dealMultiple(2);
        this.pokerState.dealHoleCards(player.id, holeCards);
      }
    }

    // Set up action queue for preflop
    // Action starts after big blind (UTG position)
    this.setupActionQueue();
  }

  /**
   * Posts small blind and big blind at the start of a hand.
   * Validates: Requirement 1.7
   */
  private postBlinds(): void {
    const gameState = this.pokerState.getGameState();
    const sbPlayer = this.pokerState.getPlayerByPosition(gameState.smallBlindPosition);
    const bbPlayer = this.pokerState.getPlayerByPosition(gameState.bigBlindPosition);

    if (!sbPlayer || !bbPlayer) {
      throw new Error('Cannot find blind positions');
    }

    // Post small blind
    const sbAmount = Math.min(this.smallBlind, sbPlayer.stack);
    this.pokerState.subtractFromPlayerStack(sbPlayer.id, sbAmount);
    this.pokerState.setPlayerBet(sbPlayer.id, sbAmount);
    this.potManager.addToPot(sbAmount, sbPlayer.id);
    
    if (sbAmount === sbPlayer.stack) {
      this.pokerState.setPlayerAllIn(sbPlayer.id, true);
    }

    // Post big blind
    const bbAmount = Math.min(this.bigBlind, bbPlayer.stack);
    this.pokerState.subtractFromPlayerStack(bbPlayer.id, bbAmount);
    this.pokerState.setPlayerBet(bbPlayer.id, bbAmount);
    this.potManager.addToPot(bbAmount, bbPlayer.id);
    
    if (bbAmount === bbPlayer.stack) {
      this.pokerState.setPlayerAllIn(bbPlayer.id, true);
    }

    // Set current bet to big blind
    this.pokerState.setCurrentBet(this.bigBlind);
    this.pokerState.setMinimumRaise(this.bigBlind);
  }

  /**
   * Sets up the action queue based on the current betting round.
   * Preflop: starts after big blind (UTG)
   * Postflop: starts after dealer button (small blind)
   */
  private setupActionQueue(): void {
    const gameState = this.pokerState.getGameState();
    
    // Get fresh player data to ensure all-in flags are current
    const activePlayers = gameState.players.filter(p => !p.hasFolded && !p.isAllIn && p.stack > 0);
    
    console.log(`[GameEngine] setupActionQueue - active players:`, activePlayers.map(p => `${p.name} (stack=${p.stack}, allIn=${p.isAllIn})`));
    
    if (activePlayers.length === 0) {
      console.log(`[GameEngine] No active players - empty queue`);
      this.pokerState.setActionQueue([]);
      this.pokerState.resetActorIndex();
      return;
    }

    // Determine starting position based on betting round
    let startPosition: number;
    if (gameState.currentBettingRound === BettingRound.PREFLOP) {
      // Preflop: action starts after big blind (UTG)
      startPosition = (gameState.bigBlindPosition + 1) % gameState.players.length;
    } else {
      // Postflop: action starts after dealer button (small blind)
      startPosition = (gameState.dealerPosition + 1) % gameState.players.length;
    }

    // Build action queue in order from starting position
    const actionQueue: string[] = [];
    for (let i = 0; i < gameState.players.length; i++) {
      const position = (startPosition + i) % gameState.players.length;
      const player = gameState.players.find(p => p.position === position);
      
      if (player && !player.hasFolded && !player.isAllIn && player.stack > 0) {
        console.log(`[GameEngine] Adding ${player.name} to queue (stack=${player.stack}, allIn=${player.isAllIn})`);
        actionQueue.push(player.id);
      } else if (player) {
        console.log(`[GameEngine] Skipping ${player.name}: folded=${player.hasFolded}, allIn=${player.isAllIn}, stack=${player.stack}`);
      }
    }

    console.log(`[GameEngine] Final action queue:`, actionQueue.map(id => {
      const p = gameState.players.find(pl => pl.id === id);
      return p ? p.name : id;
    }));

    this.pokerState.setActionQueue(actionQueue);
    this.pokerState.resetActorIndex();
  }

  /**
   * Executes a player action and updates game state.
   * - Validates the action
   * - Updates player stacks and bets
   * - Updates pots
   * - Handles side pot creation for all-ins
   * - Advances to next player or next betting round
   * 
   * Validates: Requirements 2.1-2.6, 6.1-6.3, 10.1
   */
  executeAction(playerId: string, action: Action): ActionResult {
    const gameState = this.pokerState.getGameState();
    
    const player = this.pokerState.getPlayer(playerId);
    console.log(`[GameEngine] executeAction: ${player?.name} attempting ${action.type} ${action.amount || ''}`);
    console.log(`[GameEngine] Current queue:`, gameState.actionQueue.map(id => {
      const p = gameState.players.find(pl => pl.id === id);
      return p ? p.name : id;
    }));
    console.log(`[GameEngine] Current actor index: ${gameState.currentActorIndex}`);
    
    // Validate the action
    const validation = this.actionValidator.validateAction(action, playerId, gameState);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        gameState: this.getGameState()
      };
    }

    if (!player) {
      return {
        success: false,
        error: 'Player not found',
        gameState: this.getGameState()
      };
    }

    // Store the current bet before executing the action (for ALL_IN logic)
    const currentBetBeforeAction = gameState.currentBet;

    // Execute the action based on type
    switch (action.type) {
      case ActionType.FOLD:
        this.executeFold(player);
        break;
      
      case ActionType.CHECK:
        this.executeCheck(player);
        break;
      
      case ActionType.CALL:
        this.executeCall(player);
        break;
      
      case ActionType.BET:
        this.executeBet(player, action.amount!);
        break;
      
      case ActionType.RAISE:
        this.executeRaise(player, action.amount!);
        break;
      
      case ActionType.ALL_IN:
        this.executeAllIn(player);
        break;
    }

    // Record the action
    this.pokerState.recordAction({
      handNumber: this.pokerState.getHandNumber(),
      bettingRound: this.pokerState.getBettingRound(),
      playerId: player.id,
      action,
      timestamp: Date.now(),
      potSizeAfter: this.potManager.getTotalPotAmount(),
      stackAfter: player.stack
    });

    // Advance to next player ONLY if we didn't rebuild the queue
    // BET, RAISE, and ALL_IN (when it's a raise) actions rebuild the queue and reset index to 0
    // FOLD removes the player from the queue and adjusts the index
    // For ALL_IN, we need to check if it was a raise or just a call
    let shouldAdvance = true;
    if (action.type === ActionType.BET || action.type === ActionType.RAISE || action.type === ActionType.FOLD) {
      shouldAdvance = false;
    } else if (action.type === ActionType.ALL_IN) {
      // Check if the all-in was a raise (player's new bet > current bet before the action)
      const updatedPlayer = this.pokerState.getPlayer(playerId)!;
      const wasRaise = updatedPlayer.currentBet > currentBetBeforeAction;
      shouldAdvance = !wasRaise;
    }
    
    console.log(`[GameEngine] Should advance: ${shouldAdvance}`);
    
    if (shouldAdvance) {
      this.pokerState.advanceActor();
    }

    // After advancing, check if any players went all-in and need to be removed from queue
    // This handles CALL and CHECK actions where players go all-in
    const updatedGameState = this.pokerState.getGameState();
    const currentActor = updatedGameState.actionQueue[updatedGameState.currentActorIndex];
    if (currentActor) {
      const currentPlayer = this.pokerState.getPlayer(currentActor);
      if (currentPlayer && currentPlayer.isAllIn) {
        // Current actor is all-in, remove them and adjust index
        const newQueue = updatedGameState.actionQueue.filter(id => id !== currentActor);
        this.pokerState.setActionQueue(newQueue);
        // Don't increment index since we removed the current player
        // The index now points to the next player
      }
    }
    
    // Also remove any other all-in players from the queue
    const finalGameState = this.pokerState.getGameState();
    const cleanedQueue = finalGameState.actionQueue.filter(id => {
      const p = this.pokerState.getPlayer(id);
      return p && !p.isAllIn;
    });
    if (cleanedQueue.length !== finalGameState.actionQueue.length) {
      const currentIndexBeforeClean = finalGameState.currentActorIndex;
      this.pokerState.setActionQueue(cleanedQueue);
      // If index is out of bounds after cleaning, reset it to 0 so remaining players can act
      if (currentIndexBeforeClean >= cleanedQueue.length && cleanedQueue.length > 0) {
        this.pokerState.resetActorIndex();
        console.log(`[GameEngine] Reset actor index to 0 after cleaning all-in players`);
      }
      console.log(`[GameEngine] Cleaned all-in players from queue, index ${this.pokerState.getGameState().currentActorIndex}, queue length ${cleanedQueue.length}`);
    }

    console.log(`[GameEngine] After action - queue:`, this.pokerState.getGameState().actionQueue.map(id => {
      const p = this.pokerState.getGameState().players.find(pl => pl.id === id);
      return p ? p.name : id;
    }));
    console.log(`[GameEngine] After action - actor index: ${this.pokerState.getGameState().currentActorIndex}`);

    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      console.log(`[GameEngine] Betting round complete`);
      this.completeBettingRound();
    }

    // CRITICAL: Return fresh state with synced pots from PotManager
    return {
      success: true,
      gameState: this.getGameState()
    };
  }

  /**
   * Executes a FOLD action
   */
  private executeFold(player: Player): void {
    this.pokerState.setPlayerFolded(player.id, true);
    
    // Remove the folded player from the action queue
    const gameState = this.pokerState.getGameState();
    const currentIndex = gameState.currentActorIndex;
    
    // Find the position of the folding player in the queue
    const foldingPlayerIndex = gameState.actionQueue.indexOf(player.id);
    
    console.log(`[GameEngine] executeFold: ${player.name} at queue index ${foldingPlayerIndex}, current actor index ${currentIndex}`);
    
    // Filter out the folded player AND any all-in players
    const newQueue = gameState.actionQueue.filter(id => {
      if (id === player.id) return false;
      const p = this.pokerState.getPlayer(id);
      return p && !p.isAllIn;
    });
    
    // Update the queue
    this.pokerState.setActionQueue(newQueue);
    
    // Adjust the current actor index based on where the fold happened
    // If the folding player was before the current actor, we need to decrement the index
    // If the folding player was the current actor, the index stays the same (points to next player)
    // If the folding player was after the current actor, no adjustment needed
    
    if (foldingPlayerIndex < currentIndex) {
      // Player before current actor folded, decrement index
      console.log(`[GameEngine] Folded player was before current actor, decrementing index from ${currentIndex} to ${currentIndex - 1}`);
      this.pokerState.setActorIndex(currentIndex - 1);
    } else if (foldingPlayerIndex === currentIndex) {
      // Current actor folded, index stays the same (now points to next player)
      // But if we're now past the end, leave it (will trigger betting round complete)
      console.log(`[GameEngine] Current actor folded, keeping index at ${currentIndex} (queue length now ${newQueue.length})`);
      if (currentIndex >= newQueue.length) {
        // Index is out of bounds, which is correct - betting round will complete
        console.log(`[GameEngine] Index ${currentIndex} >= queue length ${newQueue.length}, betting round should complete`);
      } else {
        // Index is valid, explicitly set it to maintain position
        this.pokerState.setActorIndex(currentIndex);
      }
    } else {
      // Folding player was after current actor, no adjustment needed
      console.log(`[GameEngine] Folded player was after current actor, no index adjustment needed`);
    }
  }

  /**
   * Executes a CHECK action
   */
  private executeCheck(player: Player): void {
    // No state changes needed for check
  }

  /**
   * Executes a CALL action
   */
  private executeCall(player: Player): void {
    const gameState = this.pokerState.getGameState();
    const amountToCall = gameState.currentBet - player.currentBet;
    
    // Deduct from player's stack
    this.pokerState.subtractFromPlayerStack(player.id, amountToCall);
    
    // Update player's current bet
    this.pokerState.setPlayerBet(player.id, gameState.currentBet);
    
    // Add to pot
    this.potManager.addToPot(amountToCall, player.id);
    
    // Check if player is now all-in
    const updatedPlayer = this.pokerState.getPlayer(player.id)!;
    if (updatedPlayer.stack === 0) {
      this.pokerState.setPlayerAllIn(player.id, true);
    }
  }

  /**
   * Executes a BET action
   */
  private executeBet(player: Player, amount: number): void {
    // Deduct from player's stack
    this.pokerState.subtractFromPlayerStack(player.id, amount);
    
    // Update player's current bet
    this.pokerState.setPlayerBet(player.id, amount);
    
    // Set current bet
    this.pokerState.setCurrentBet(amount);
    
    // Set minimum raise (equal to the bet size)
    this.pokerState.setMinimumRaise(amount);
    
    // Check if player is now all-in
    const updatedPlayer = this.pokerState.getPlayer(player.id)!;
    if (updatedPlayer.stack === 0) {
      this.pokerState.setPlayerAllIn(player.id, true);
    }
    
    // Add to pot
    this.potManager.addToPot(amount, player.id);
    
    // IMPORTANT: After a bet, rebuild action queue for players who need to act
    this.rebuildActionQueueAfterAggression(player.id);
    // Reset actor index since we rebuilt the queue
    this.pokerState.resetActorIndex();
  }

  /**
   * Executes a RAISE action
   */
  private executeRaise(player: Player, totalAmount: number): void {
    const gameState = this.pokerState.getGameState();
    const raiseAmount = totalAmount - player.currentBet;
    const raiseSize = totalAmount - gameState.currentBet;
    
    // Deduct from player's stack
    this.pokerState.subtractFromPlayerStack(player.id, raiseAmount);
    
    // Update player's current bet
    this.pokerState.setPlayerBet(player.id, totalAmount);
    
    // Update current bet
    this.pokerState.setCurrentBet(totalAmount);
    
    // Update minimum raise (equal to the raise size)
    this.pokerState.setMinimumRaise(raiseSize);
    
    // Check if player is now all-in
    const updatedPlayer = this.pokerState.getPlayer(player.id)!;
    if (updatedPlayer.stack === 0) {
      this.pokerState.setPlayerAllIn(player.id, true);
    }
    
    // Add to pot
    this.potManager.addToPot(raiseAmount, player.id);
    
    // IMPORTANT: After a raise, rebuild action queue for players who need to act
    this.rebuildActionQueueAfterAggression(player.id);
    // Reset actor index since we rebuilt the queue
    this.pokerState.resetActorIndex();
  }

  /**
   * Rebuilds the action queue after a bet or raise.
   * All players who haven't matched the new bet need to act again.
   */
  private rebuildActionQueueAfterAggression(aggressorId: string): void {
    const gameState = this.pokerState.getGameState();
    
    console.log(`[GameEngine] Rebuilding queue after aggression by ${aggressorId}`);
    console.log(`[GameEngine] Current bet: ${gameState.currentBet}`);
    
    // Find the aggressor's position
    const aggressor = gameState.players.find(p => p.id === aggressorId);
    if (!aggressor) return;
    
    // Build new action queue starting from next player after aggressor
    const actionQueue: string[] = [];
    const startPosition = (aggressor.position + 1) % gameState.players.length;
    
    for (let i = 0; i < gameState.players.length; i++) {
      const position = (startPosition + i) % gameState.players.length;
      const player = this.pokerState.getPlayerByPosition(position);
      
      if (player) {
        console.log(`[GameEngine] Checking ${player.name}: folded=${player.hasFolded}, allIn=${player.isAllIn}, stack=${player.stack}, currentBet=${player.currentBet}`);
      }
      
      // Only add players who:
      // 1. Haven't folded
      // 2. Aren't all-in
      // 3. Have chips remaining
      // 4. Aren't the aggressor
      // 5. Haven't matched the current bet (need to act)
      if (player && 
          !player.hasFolded && 
          !player.isAllIn && 
          player.stack > 0 &&
          player.id !== aggressorId &&
          player.currentBet < gameState.currentBet) {
        console.log(`[GameEngine] Adding ${player.name} to queue`);
        actionQueue.push(player.id);
      }
    }
    
    console.log(`[GameEngine] New action queue:`, actionQueue.map(id => {
      const p = gameState.players.find(pl => pl.id === id);
      return p ? p.name : id;
    }));
    
    this.pokerState.setActionQueue(actionQueue);
  }

  /**
   * Executes an ALL_IN action
   */
  private executeAllIn(player: Player): void {
    const gameState = this.pokerState.getGameState();
    const allInAmount = player.stack;
    const newTotalBet = player.currentBet + allInAmount;
    
    // Deduct entire stack
    this.pokerState.subtractFromPlayerStack(player.id, allInAmount);
    
    // Update player's current bet
    this.pokerState.setPlayerBet(player.id, newTotalBet);
    
    // Mark player as all-in
    this.pokerState.setPlayerAllIn(player.id, true);
    
    // Add to pot
    this.potManager.addToPot(allInAmount, player.id);
    
    // Check if we need to create a side pot
    if (newTotalBet < gameState.currentBet) {
      // Player went all-in for less than the current bet - create side pot
      const updatedGameState = this.pokerState.getGameState();
      const updatedPlayer = this.pokerState.getPlayer(player.id)!;
      this.potManager.createSidePot(
        updatedGameState.players,
        updatedPlayer,
        newTotalBet
      );
    } else if (newTotalBet > gameState.currentBet) {
      // Player raised all-in - update current bet and minimum raise
      const raiseSize = newTotalBet - gameState.currentBet;
      this.pokerState.setCurrentBet(newTotalBet);
      this.pokerState.setMinimumRaise(raiseSize);
      
      // IMPORTANT: After a raise all-in, rebuild action queue for players who need to act
      this.rebuildActionQueueAfterAggression(player.id);
      // Reset actor index since we rebuilt the queue
      this.pokerState.resetActorIndex();
    }
  }

  /**
   * Checks if the current betting round is complete.
   * A betting round is complete when:
   * - All active players have acted at least once
   * - All active players have either folded or matched the current bet
   * - Only one player remains (all others folded)
   * 
   * Validates: Requirement 10.1
   */
  private isBettingRoundComplete(): boolean {
    const gameState = this.pokerState.getGameState();
    const playersInHand = this.pokerState.getPlayersInHand();
    
    // If only one player remains, betting is complete
    if (playersInHand.length <= 1) {
      console.log(`[GameEngine] Betting complete: only ${playersInHand.length} player(s) remain`);
      return true;
    }

    // If action queue is empty, round is complete
    if (gameState.actionQueue.length === 0) {
      console.log(`[GameEngine] Betting complete: action queue empty`);
      return true;
    }

    // Check if we've gone through the entire action queue
    if (gameState.currentActorIndex >= gameState.actionQueue.length) {
      console.log(`[GameEngine] Actor index ${gameState.currentActorIndex} >= queue length ${gameState.actionQueue.length}`);
      
      // Check if all active players have matched the current bet
      const activePlayers = playersInHand.filter(p => !p.isAllIn);
      
      if (activePlayers.length === 0) {
        // All remaining players are all-in
        console.log(`[GameEngine] Betting complete: all remaining players are all-in`);
        return true;
      }

      // All active players must have matched the current bet
      const allMatched = activePlayers.every(p => 
        p.currentBet === gameState.currentBet || p.stack === 0
      );
      
      console.log(`[GameEngine] All active players matched bet: ${allMatched}`);
      console.log(`[GameEngine] Current bet: ${gameState.currentBet}`);
      console.log(`[GameEngine] Active players:`, activePlayers.map(p => `${p.name} (bet=${p.currentBet}, stack=${p.stack})`));
      
      return allMatched;
    }

    return false;
  }

  /**
   * Completes the current betting round and advances to the next round or showdown.
   * - Resets player bets
   * - Deals community cards if needed
   * - Sets up action queue for next round
   * - Resolves hand if betting is complete
   * 
   * Validates: Requirements 1.3, 1.4, 1.5, 10.2, 10.3
   */
  private completeBettingRound(): void {
    const gameState = this.pokerState.getGameState();
    const playersInHand = this.pokerState.getPlayersInHand();

    console.log(`[GameEngine] completeBettingRound - players in hand: ${playersInHand.length}`);
    console.log(`[GameEngine] Players:`, playersInHand.map(p => `${p.name} (folded=${p.hasFolded}, allIn=${p.isAllIn}, stack=${p.stack})`));

    // If only one player remains, resolve hand immediately
    if (playersInHand.length === 1) {
      console.log(`[GameEngine] Only one player remains - resolving hand`);
      this.resolveHand();
      return;
    }

    // Check if all remaining players are all-in
    const activePlayers = playersInHand.filter(p => !p.isAllIn);
    console.log(`[GameEngine] Active players (not all-in): ${activePlayers.length}`);
    
    if (activePlayers.length === 0) {
      // All remaining players are all-in - deal all remaining community cards and go to showdown
      console.log(`[GameEngine] All players all-in - dealing remaining cards and going to showdown`);
      this.dealRemainingCommunityCards();
      this.resolveHand();
      return;
    }
    
    // Check if only 1 active player remains (others are all-in)
    if (activePlayers.length === 1) {
      console.log(`[GameEngine] Only 1 active player remains - dealing remaining cards and going to showdown`);
      this.dealRemainingCommunityCards();
      this.resolveHand();
      return;
    }

    // Reset player bets for next round
    this.pokerState.resetPlayerBets();
    this.pokerState.setCurrentBet(0);
    this.pokerState.setMinimumRaise(this.bigBlind);

    // Advance to next betting round
    const currentRound = this.pokerState.getBettingRound();
    console.log(`[GameEngine] Current round: ${currentRound}`);
    
    if (currentRound === BettingRound.RIVER) {
      // After river, go to showdown
      console.log(`[GameEngine] River complete - going to showdown`);
      this.resolveHand();
      return;
    }

    // Advance betting round
    this.pokerState.advanceBettingRound();
    const newRound = this.pokerState.getBettingRound();
    console.log(`[GameEngine] Advanced to: ${newRound}`);
    
    // Deal community cards based on new round
    this.dealCommunityCards(newRound);

    // Set up action queue for next round
    this.setupActionQueue();
  }

  /**
   * Deals all remaining community cards when all players are all-in.
   * This is called when there are no more betting rounds to complete.
   */
  private dealRemainingCommunityCards(): void {
    const currentRound = this.pokerState.getBettingRound();
    const communityCards = this.pokerState.getCommunityCards();
    
    // Deal cards based on what's missing
    if (currentRound === BettingRound.PREFLOP) {
      // Deal flop (3), turn (1), and river (1) = 5 cards total
      const cards = this.deck.dealMultiple(5);
      this.pokerState.addCommunityCards(cards);
    } else if (currentRound === BettingRound.FLOP) {
      // Deal turn (1) and river (1) = 2 cards total
      const cards = this.deck.dealMultiple(2);
      this.pokerState.addCommunityCards(cards);
    } else if (currentRound === BettingRound.TURN) {
      // Deal river (1) = 1 card
      const card = this.deck.deal();
      this.pokerState.addCommunityCards([card]);
    }
    // If already on river, no cards to deal
  }

  /**
   * Deals community cards based on the betting round.
   * - Flop: 3 cards
   * - Turn: 1 card
   * - River: 1 card
   * 
   * Validates: Requirements 1.3, 1.4, 1.5
   */
  private dealCommunityCards(round: BettingRound): void {
    switch (round) {
      case BettingRound.FLOP:
        // Deal 3 cards for the flop
        const flopCards = this.deck.dealMultiple(3);
        this.pokerState.addCommunityCards(flopCards);
        break;
      
      case BettingRound.TURN:
        // Deal 1 card for the turn
        const turnCard = this.deck.deal();
        this.pokerState.addCommunityCards([turnCard]);
        break;
      
      case BettingRound.RIVER:
        // Deal 1 card for the river
        const riverCard = this.deck.deal();
        this.pokerState.addCommunityCards([riverCard]);
        break;
      
      case BettingRound.PREFLOP:
        // No community cards for preflop
        break;
    }
  }

  /**
   * Advances the betting round manually (for testing or special cases).
   * 
   * Validates: Requirement 10.2
   */
  advanceBettingRound(): boolean {
    const success = this.pokerState.advanceBettingRound();
    if (success) {
      const newRound = this.pokerState.getBettingRound();
      this.dealCommunityCards(newRound);
      this.setupActionQueue();
    }
    return success;
  }

  /**
   * Resolves the hand and distributes pots to winners.
   * - Determines winners using HandResolver
   * - Distributes pots using PotManager
   * - Updates player stacks
   * - Rotates dealer button
   * 
   * Validates: Requirements 7.1, 7.2, 7.4, 7.5, 9.2
   */
  resolveHand(): HandResult {
    const gameState = this.pokerState.getGameState();
    const playersInHand = this.pokerState.getPlayersInHand();
    
    // If only one player remains, they win all pots
    if (playersInHand.length === 1) {
      const winner = playersInHand[0];
      const totalPot = this.potManager.getTotalPotAmount();
      
      // Award all pots to the winner
      this.pokerState.addToPlayerStack(winner.id, totalPot);
      
      // Reset player bets since hand is complete
      this.pokerState.resetPlayerBets();
      
      // Don't rotate dealer here - it's done in startNewHand()
      
      // Clear action queue since hand is complete
      this.pokerState.setActionQueue([]);
      this.pokerState.resetActorIndex();

      return {
        winners: [{
          playerId: winner.id,
          handRank: {
            category: HandCategory.HIGH_CARD,
            value: 0,
            kickers: []
          },
          potShare: totalPot
        }],
        distributions: [{
          playerId: winner.id,
          amount: totalPot,
          potIndex: 0
        }]
      };
    }

    // Multiple players remain - evaluate hands
    const communityCards = this.pokerState.getCommunityCards();
    const playerHandRanks = playersInHand.map(player => ({
      playerId: player.id,
      handRank: this.handResolver.evaluateHand(player.holeCards, communityCards)
    }));

    // Sort by hand strength (best first)
    playerHandRanks.sort((a, b) => 
      this.handResolver.compareHands(b.handRank, a.handRank)
    );

    // Distribute pots
    const distributions = this.potManager.distributePots(playerHandRanks);

    // Update player stacks
    for (const distribution of distributions) {
      this.pokerState.addToPlayerStack(distribution.playerId, distribution.amount);
    }

    // Reset player bets since hand is complete
    this.pokerState.resetPlayerBets();

    // Calculate winners and their shares
    const winnerMap = new Map<string, number>();
    for (const distribution of distributions) {
      const current = winnerMap.get(distribution.playerId) || 0;
      winnerMap.set(distribution.playerId, current + distribution.amount);
    }

    const winners = Array.from(winnerMap.entries()).map(([playerId, potShare]) => {
      const playerHandRank = playerHandRanks.find(p => p.playerId === playerId);
      return {
        playerId,
        handRank: playerHandRank!.handRank,
        potShare
      };
    });

    // Don't rotate dealer here - it's done in startNewHand()
    
    // Clear action queue since hand is complete
    this.pokerState.setActionQueue([]);
    this.pokerState.resetActorIndex();

    return {
      winners,
      distributions
    };
  }

  /**
   * Gets the current game state
   */
  getGameState() {
    const state = this.pokerState.getGameState();
    // Sync pots from PotManager - deep copy to prevent mutation
    const pots = this.potManager.getPots();
    state.pots = pots.map(pot => ({
      amount: pot.amount,
      eligiblePlayers: [...pot.eligiblePlayers],
      isMainPot: pot.isMainPot
    }));
    const potTotal = state.pots.reduce((sum, pot) => sum + pot.amount, 0);
    console.log(`[GameEngine] getGameState: returning state with pot total = ${potTotal}, pots:`, state.pots);
    return state;
  }

  /**
   * Sets a player's name
   */
  setPlayerName(playerId: string, name: string): boolean {
    return this.pokerState.setPlayerName(playerId, name);
  }

  /**
   * Gets the current betting round
   */
  getCurrentBettingRound(): BettingRound {
    return this.pokerState.getBettingRound();
  }

  /**
   * Gets active players (not folded, have chips)
   */
  getActivePlayers(): Player[] {
    return this.pokerState.getActivePlayers();
  }

  /**
   * Gets the poker state instance (for testing)
   */
  getPokerState(): PokerState {
    return this.pokerState;
  }

  /**
   * Gets the pot manager instance (for testing)
   */
  getPotManager(): PotManager {
    return this.potManager;
  }

  /**
   * Gets the hand resolver instance (for testing)
   */
  getHandResolver(): HandResolver {
    return this.handResolver;
  }

  /**
   * Gets the action validator instance (for testing)
   */
  getActionValidator(): ActionValidator {
    return this.actionValidator;
  }
}
