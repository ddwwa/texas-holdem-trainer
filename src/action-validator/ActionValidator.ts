import { Action, GameState, Player, ValidationResult } from '../types/core';
import { ActionType } from '../types/enums';

/**
 * ActionValidator validates player actions against game rules.
 * 
 * Responsibilities:
 * - Validate turn order (correct player's turn)
 * - Validate available actions based on game state
 * - Validate chip amounts (minimum raise, bet limits, stack constraints)
 * - Return detailed error messages for invalid actions
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 9.4
 */
export class ActionValidator {
  /**
   * Validate an action for a given player and game state
   * 
   * @param action The action to validate
   * @param playerId The ID of the player attempting the action
   * @param gameState The current game state
   * @returns ValidationResult indicating if the action is valid and any error message
   */
  validateAction(action: Action, playerId: string, gameState: GameState): ValidationResult {
    // Get the player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      return {
        valid: false,
        error: 'Player not found'
      };
    }

    // Check if it's the player's turn
    const currentActor = gameState.actionQueue[gameState.currentActorIndex];
    if (currentActor !== playerId) {
      return {
        valid: false,
        error: 'Not your turn'
      };
    }

    // Check if player has already folded
    if (player.hasFolded) {
      return {
        valid: false,
        error: 'Cannot act after folding'
      };
    }

    // Check if player is all-in
    if (player.isAllIn && action.type !== ActionType.ALL_IN) {
      return {
        valid: false,
        error: 'Player is already all-in'
      };
    }

    // Get available actions for this player
    const availableActions = this.getAvailableActions(player, gameState);

    // Check if the action type is available
    if (!availableActions.includes(action.type)) {
      return {
        valid: false,
        error: `Action not available. Available actions: ${availableActions.join(', ')}`
      };
    }

    // Validate specific action types
    switch (action.type) {
      case ActionType.FOLD:
        return this.validateFold(player, gameState);
      
      case ActionType.CHECK:
        return this.validateCheck(player, gameState);
      
      case ActionType.CALL:
        return this.validateCall(player, gameState);
      
      case ActionType.BET:
        return this.validateBet(action, player, gameState);
      
      case ActionType.RAISE:
        return this.validateRaise(action, player, gameState);
      
      case ActionType.ALL_IN:
        return this.validateAllIn(player, gameState);
      
      default:
        return {
          valid: false,
          error: 'Unknown action type'
        };
    }
  }

  /**
   * Get available actions for a player based on game state
   * Validates: Requirements 2.1, 2.2, 2.4, 2.5
   * 
   * @param player The player
   * @param gameState The current game state
   * @returns Array of available action types
   */
  getAvailableActions(player: Player, gameState: GameState): ActionType[] {
    const actions: ActionType[] = [];

    // If player has folded, no actions are available
    if (player.hasFolded) {
      return [];
    }

    // If player is already all-in, no actions are available
    if (player.isAllIn) {
      return [];
    }

    // If player has no chips, they can only fold
    if (player.stack === 0) {
      return [ActionType.FOLD];
    }

    const amountToCall = gameState.currentBet - player.currentBet;

    // ALL_IN is always available (Requirement 2.5)
    actions.push(ActionType.ALL_IN);

    // FOLD is always available unless there's no bet to call
    if (gameState.currentBet > player.currentBet) {
      actions.push(ActionType.FOLD);
    }

    // If no bet has been made (Requirement 2.1)
    if (gameState.currentBet === 0 || gameState.currentBet === player.currentBet) {
      actions.push(ActionType.CHECK);
      
      // Can bet if player has chips
      if (player.stack > 0) {
        actions.push(ActionType.BET);
      }
    } 
    // If a bet has been made (Requirement 2.2)
    else {
      // Can call if player has enough chips (Requirement 2.4)
      if (player.stack >= amountToCall) {
        actions.push(ActionType.CALL);
      }
      
      // Can raise if player has enough chips for more than a call
      if (player.stack > amountToCall) {
        actions.push(ActionType.RAISE);
      }
    }

    return actions;
  }

  /**
   * Validate a FOLD action
   */
  private validateFold(player: Player, gameState: GameState): ValidationResult {
    // Fold is always valid when it's available
    return { valid: true };
  }

  /**
   * Validate a CHECK action
   * Validates: Requirement 2.1
   */
  private validateCheck(player: Player, gameState: GameState): ValidationResult {
    // Can only check if no bet has been made or player has already matched the bet
    if (gameState.currentBet > player.currentBet) {
      return {
        valid: false,
        error: `Cannot check. Current bet is ${gameState.currentBet}, you must call ${gameState.currentBet - player.currentBet} or fold`
      };
    }

    return { valid: true };
  }

  /**
   * Validate a CALL action
   * Validates: Requirement 2.2, 2.4
   */
  private validateCall(player: Player, gameState: GameState): ValidationResult {
    const amountToCall = gameState.currentBet - player.currentBet;

    // Cannot call if there's no bet to call
    if (amountToCall === 0) {
      return {
        valid: false,
        error: 'Cannot call. No bet to call. Use CHECK instead'
      };
    }

    // Check if player has enough chips to call (Requirement 2.4)
    if (player.stack < amountToCall) {
      return {
        valid: false,
        error: `Insufficient chips to call. Need ${amountToCall}, have ${player.stack}. Use ALL_IN instead`
      };
    }

    return { valid: true };
  }

  /**
   * Validate a BET action
   * Validates: Requirement 2.1, 9.4
   */
  private validateBet(action: Action, player: Player, gameState: GameState): ValidationResult {
    // Cannot bet if there's already a bet
    if (gameState.currentBet > 0) {
      return {
        valid: false,
        error: 'Cannot bet. There is already a bet. Use RAISE instead'
      };
    }

    // Bet amount must be specified
    if (action.amount === undefined || action.amount <= 0) {
      return {
        valid: false,
        error: 'Bet amount must be greater than 0'
      };
    }

    // Cannot bet more than stack (Requirement 9.4)
    if (action.amount > player.stack) {
      return {
        valid: false,
        error: `Insufficient chips. Cannot bet ${action.amount}, you only have ${player.stack}`
      };
    }

    // Bet must be at least the big blind (minimum bet)
    // In a typical game, minimum bet is the big blind or the previous bet/raise size
    const minimumBet = gameState.minimumRaise || 1;
    if (action.amount < minimumBet) {
      return {
        valid: false,
        error: `Bet must be at least ${minimumBet}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate a RAISE action
   * Validates: Requirement 2.2, 2.3, 9.4
   */
  private validateRaise(action: Action, player: Player, gameState: GameState): ValidationResult {
    // Cannot raise if there's no bet
    if (gameState.currentBet === 0) {
      return {
        valid: false,
        error: 'Cannot raise. No bet to raise. Use BET instead'
      };
    }

    // Raise amount must be specified
    if (action.amount === undefined || action.amount <= 0) {
      return {
        valid: false,
        error: 'Raise amount must be greater than 0'
      };
    }

    const amountToCall = gameState.currentBet - player.currentBet;
    const totalAmount = action.amount; // Total amount player will have bet after raise

    // Total bet must be more than current bet
    if (totalAmount <= gameState.currentBet) {
      return {
        valid: false,
        error: `Raise must be more than current bet of ${gameState.currentBet}`
      };
    }

    // Cannot raise more than stack (Requirement 9.4)
    const raiseAmount = totalAmount - player.currentBet;
    if (raiseAmount > player.stack) {
      return {
        valid: false,
        error: `Insufficient chips. Cannot raise to ${totalAmount}, you only have ${player.stack} remaining`
      };
    }

    // Minimum raise enforcement (Requirement 2.3)
    // The raise must be at least the size of the previous bet or raise
    const minimumRaiseTotal = gameState.currentBet + gameState.minimumRaise;
    if (totalAmount < minimumRaiseTotal) {
      return {
        valid: false,
        error: `Raise must be at least ${minimumRaiseTotal} (current bet ${gameState.currentBet} + minimum raise ${gameState.minimumRaise})`
      };
    }

    return { valid: true };
  }

  /**
   * Validate an ALL_IN action
   * Validates: Requirement 2.4, 2.5
   */
  private validateAllIn(player: Player, gameState: GameState): ValidationResult {
    // Cannot go all-in with no chips
    if (player.stack === 0) {
      return {
        valid: false,
        error: 'Cannot go all-in with no chips'
      };
    }

    // All-in is always valid if player has chips (Requirement 2.5)
    return { valid: true };
  }
}
