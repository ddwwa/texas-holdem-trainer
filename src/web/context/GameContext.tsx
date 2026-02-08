import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { GameManager } from '../../game-manager/GameManager';
import { GameState, Action, HandRank } from '../../types/core';
import { ActionType, HandCategory } from '../../types/enums';
import { GTOSolution, ActionComparison } from '../../gto-engine/GTOEngine';
import { HandResolver } from '../../hand-resolver/HandResolver';

interface SessionStats {
  handsPlayed: number;
  handsWon: number;
  totalWinnings: number;
  biggestPot: number;
}

interface ActionLog {
  playerName: string;
  action: string;
  amount?: number;
  timestamp: number;
}

interface PlayerHandResult {
  playerId: string;
  playerName: string;
  handRank: HandRank;
  handName: string;
  isWinner: boolean;
  potShare: number;
}

interface HandResult {
  players: PlayerHandResult[];
  winners: string[];
  message: string;
  totalPot: number;
  showdown: boolean;
}

interface GameContextType {
  gameState: GameState | null;
  manager: GameManager | null;
  sessionStats: SessionStats;
  lastHandResult: HandResult | null;
  lastGTOSolution: GTOSolution | null;
  lastComparison: ActionComparison | null;
  actionLog: ActionLog[];
  playerLastActions: Map<string, { type: string; amount?: number }>;
  countdown: number | null;
  startNewGame: () => void;
  startNewHand: () => void;
  executePlayerAction: (action: Action) => void;
  rebuyPlayer: (playerId: string) => void;
  isPlayerTurn: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [manager, setManager] = useState<GameManager | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastHandResult, setLastHandResult] = useState<HandResult | null>(null);
  const [lastGTOSolution, setLastGTOSolution] = useState<GTOSolution | null>(null);
  const [lastComparison, setLastComparison] = useState<ActionComparison | null>(null);
  const [actionLog, setActionLog] = useState<ActionLog[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    handsPlayed: 0,
    handsWon: 0,
    totalWinnings: 0,
    biggestPot: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [playerLastActions, setPlayerLastActions] = useState<Map<string, { type: string; amount?: number }>>(new Map());
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Create a HandResolver instance for evaluating hands at showdown
  const handResolver = new HandResolver();

  const getHandName = (category: HandCategory): string => {
    const names: Record<HandCategory, string> = {
      [HandCategory.HIGH_CARD]: 'High Card',
      [HandCategory.PAIR]: 'Pair',
      [HandCategory.TWO_PAIR]: 'Two Pair',
      [HandCategory.THREE_OF_A_KIND]: 'Three of a Kind',
      [HandCategory.STRAIGHT]: 'Straight',
      [HandCategory.FLUSH]: 'Flush',
      [HandCategory.FULL_HOUSE]: 'Full House',
      [HandCategory.FOUR_OF_A_KIND]: 'Four of a Kind',
      [HandCategory.STRAIGHT_FLUSH]: 'Straight Flush',
      [HandCategory.ROYAL_FLUSH]: 'Royal Flush'
    };
    return names[category];
  };

  const addActionToLog = (playerName: string, action: string, amount?: number) => {
    setActionLog(prev => {
      const newLog = [...prev, { playerName, action, amount, timestamp: Date.now() }];
      // Keep only last 10 actions
      return newLog.slice(-10);
    });
  };

  const processAITurns = (gameManager: GameManager) => {
    if (isProcessing) return; // Prevent multiple simultaneous processing
    setIsProcessing(true);
    
    let iterations = 0;
    const maxIterations = 100;
    let previousBettingRound = gameManager.getCurrentGameState().currentBettingRound;
    let previousCommunityCardCount = gameManager.getCurrentGameState().communityCards.length;
    let stuckCounter = 0;
    
    const processNext = () => {
      if (iterations >= maxIterations) {
        console.error('Max iterations reached in AI processing');
        setIsProcessing(false);
        return;
      }
      iterations++;
      
      // IMPORTANT: Always get fresh state from game manager
      const currentState = gameManager.getCurrentGameState();
      
      console.log(`[GameContext] processNext iteration ${iterations}`);
      console.log(`[GameContext] Action queue:`, currentState.actionQueue.map(id => {
        const p = currentState.players.find(pl => pl.id === id);
        return p ? `${p.name} (allIn=${p.isAllIn}, folded=${p.hasFolded}, stack=${p.stack})` : id;
      }));
      console.log(`[GameContext] Current actor index: ${currentState.currentActorIndex}`);
      
      // Check if community cards were added - pause to show them
      if (currentState.communityCards.length > previousCommunityCardCount) {
        const potTotal = currentState.pots?.reduce((sum, pot) => sum + pot.amount, 0) || 0;
        console.log(`Community cards changed: ${previousCommunityCardCount} -> ${currentState.communityCards.length}, pot = ${potTotal}`);
        previousCommunityCardCount = currentState.communityCards.length;
        previousBettingRound = currentState.currentBettingRound;
        stuckCounter = 0;
        setGameState(currentState);
        
        // Pause for 1.5 seconds to show the new community cards
        setTimeout(() => processNext(), 1500);
        return;
      }
      
      // Check if hand is complete
      if (currentState.actionQueue.length === 0) {
        console.log('Hand complete - action queue empty');
        console.log('Active players:', currentState.players.filter(p => !p.hasFolded).length);
        console.log('Community cards:', currentState.communityCards.length);
        
        handleHandComplete(gameManager, currentState);
        setIsProcessing(false);
        return;
      }
      
      // Check if it's the player's turn
      if (!gameManager.isCurrentActorAI()) {
        const currentActor = gameManager.getCurrentActor();
        if (currentActor) {
          const player = currentState.players.find(p => p.id === currentActor);
          if (player && (player.isAllIn || player.stack === 0)) {
            // Player is all-in, can't act - force hand completion
            console.log('Player is all-in but marked as current actor - forcing hand completion');
            stuckCounter++;
            if (stuckCounter > 3) {
              console.error('Stuck in player all-in state - forcing showdown');
              handleHandComplete(gameManager, currentState);
              setIsProcessing(false);
              return;
            }
            setTimeout(() => processNext(), 100);
            return;
          }
        }
        console.log('Player turn - stopping AI processing');
        setGameState(currentState);
        setIsProcessing(false);
        return;
      }
      
      // Process AI turn
      const currentActor = gameManager.getCurrentActor();
      if (!currentActor) {
        console.log('No current actor - stopping');
        setGameState(currentState);
        setIsProcessing(false);
        return;
      }
      
      const player = currentState.players.find(p => p.id === currentActor);
      if (!player) {
        console.error('Current actor not found');
        setGameState(currentState);
        setIsProcessing(false);
        return;
      }
      
      // CRITICAL: Check if player has already folded or is all-in BEFORE processing
      if (player.hasFolded) {
        console.error(`[GameContext] ${player.name} has already folded but is in action queue - this is a bug!`);
        console.error(`[GameContext] Queue:`, currentState.actionQueue);
        console.error(`[GameContext] Attempting to remove and continue...`);
        
        // Try to remove from queue and continue
        const newQueue = currentState.actionQueue.filter(id => id !== player.id);
        if (newQueue.length === currentState.actionQueue.length) {
          console.error(`[GameContext] Failed to remove player from queue - stopping to prevent infinite loop`);
          setIsProcessing(false);
          return;
        }
        
        // Update the queue in the game state
        currentState.actionQueue = newQueue;
        setTimeout(() => processNext(), 100);
        return;
      }
      
      if (player.isAllIn) {
        console.error(`[GameContext] ${player.name} is all-in but is in action queue - this is a bug!`);
        console.error(`[GameContext] Player state: stack=${player.stack}, currentBet=${player.currentBet}, isAllIn=${player.isAllIn}`);
        console.error(`[GameContext] Queue:`, currentState.actionQueue);
        console.error(`[GameContext] Attempting to remove and continue...`);
        
        // Try to remove from queue and continue
        const newQueue = currentState.actionQueue.filter(id => id !== player.id);
        if (newQueue.length === currentState.actionQueue.length) {
          console.error(`[GameContext] Failed to remove player from queue - stopping to prevent infinite loop`);
          setIsProcessing(false);
          return;
        }
        
        // Update the queue in the game state
        currentState.actionQueue = newQueue;
        setTimeout(() => processNext(), 100);
        return;
      }
      
      console.log(`Processing AI turn for ${player.name}`);
      
      // AI makes decision using GameManager
      const result = gameManager.processAITurn(currentActor);
      
      if (result.success && result.action) {
        console.log(`${player.name} action: ${result.action.type} ${result.action.amount || ''}`);
        addActionToLog(player.name, result.action.type, result.action.amount);
        
        // Store the action for display
        setPlayerLastActions(prev => {
          const newMap = new Map(prev);
          newMap.set(player.id, { type: result.action!.type, amount: result.action!.amount });
          return newMap;
        });
        
        // Update state to show the action was taken
        setGameState(result.gameState);
        
        // Log pot for debugging
        console.log(`[GameContext] After ${player.name} ${result.action.type}: pots array:`, JSON.stringify(result.gameState.pots));
        const potTotal = result.gameState.pots?.reduce((sum, pot) => sum + pot.amount, 0) || 0;
        console.log(`[GameContext] Calculated pot total: ${potTotal}`);
        
        // Clear the action display after 2 seconds
        setTimeout(() => {
          setPlayerLastActions(prev => {
            const newMap = new Map(prev);
            newMap.delete(player.id);
            return newMap;
          });
        }, 2000);
        
        // Continue processing with 1 second delay for better visibility
        setTimeout(() => processNext(), 1000);
      } else {
        console.error('AI turn failed:', result.error);
        console.error('Failed action:', result.action);
        console.error('Player state:', player);
        console.error('Current bet:', currentState.currentBet);
        console.error('Player current bet:', player.currentBet);
        setGameState(result.gameState);
        // Don't stop - try to continue with next player
        setTimeout(() => processNext(), 1000);
      }
    };
    
    processNext();
  };

  const handleHandComplete = (gameManager: GameManager, finalState: GameState) => {
    const activePlayers = finalState.players.filter(p => !p.hasFolded);
    const totalPot = finalState.pots.reduce((sum, pot) => sum + pot.amount, 0);
    
    // Determine if this was a showdown or everyone folded
    const showdown = activePlayers.length > 1;
    
    if (showdown) {
      // Evaluate all active players' hands
      const playerHandResults: PlayerHandResult[] = activePlayers.map(player => {
        const handRank = handResolver.evaluateHand(player.holeCards, finalState.communityCards);
        return {
          playerId: player.id,
          playerName: player.name,
          handRank,
          handName: getHandName(handRank.category),
          isWinner: false,
          potShare: 0
        };
      });
      
      // Sort by hand strength (best first)
      playerHandResults.sort((a, b) => handResolver.compareHands(b.handRank, a.handRank));
      
      // Determine winners (handle ties)
      const bestHand = playerHandResults[0].handRank;
      const winners: string[] = [];
      let winnerCount = 0;
      
      for (const result of playerHandResults) {
        if (handResolver.compareHands(result.handRank, bestHand) === 0) {
          result.isWinner = true;
          winners.push(result.playerId);
          winnerCount++;
        }
      }
      
      // Calculate pot shares
      for (const result of playerHandResults) {
        if (result.isWinner) {
          result.potShare = totalPot / winnerCount;
        }
      }
      
      // Create result message
      let message: string;
      if (winners.length === 1) {
        const winner = playerHandResults.find(r => r.isWinner)!;
        message = `${winner.playerName} wins with ${winner.handName}!`;
      } else {
        const winnerNames = playerHandResults.filter(r => r.isWinner).map(r => r.playerName).join(', ');
        message = `Pot split ${winners.length} ways: ${winnerNames}`;
      }
      
      setLastHandResult({
        players: playerHandResults,
        winners,
        message,
        totalPot,
        showdown: true
      });
    } else {
      // Single winner (everyone else folded)
      const winner = activePlayers[0];
      setLastHandResult({
        players: [],
        winners: [winner.id],
        message: `${winner.name} wins (everyone folded)`,
        totalPot,
        showdown: false
      });
    }
    
    // Update session stats
    const playerWon = activePlayers.some(p => p.id === finalState.players[0].id);
    const winAmount = finalState.players[0].stack - (gameState?.players[0].stack || 1000);
    
    setSessionStats(prev => ({
      ...prev,
      handsWon: playerWon ? prev.handsWon + 1 : prev.handsWon,
      totalWinnings: prev.totalWinnings + winAmount,
      biggestPot: Math.max(prev.biggestPot, totalPot)
    }));
    
    setGameState(finalState);
    
    // Start 10-second countdown
    setCountdown(10);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Auto-start new hand after 10 seconds
    const autoStartTimeout = setTimeout(() => {
      if (manager) {
        clearInterval(countdownInterval);
        setCountdown(null);
        setLastHandResult(null);
        setLastGTOSolution(null);
        setLastComparison(null);
        const newState = manager.startNewHand();
        setGameState(newState);
        setSessionStats(prev => ({ ...prev, handsPlayed: prev.handsPlayed + 1 }));
        setTimeout(() => processAITurns(manager), 1000);
      }
    }, 10000);
    
    // Store the timeout ID so we can cancel it if user clicks button
    (window as any).__autoStartTimeout = autoStartTimeout;
    (window as any).__countdownInterval = countdownInterval;
  };

  const startNewGame = useCallback(() => {
    if (isProcessing) return; // Prevent starting while processing
    
    console.log('Starting new game...');
    try {
      // Initialize game with 8 players, $1000 stacks, $5/$10 blinds
      console.log('Creating GameManager...');
      const newManager = new GameManager(5, 10, 8, 1000);
      console.log('GameManager created, starting hand...');
      const initialState = newManager.startNewHand();
      console.log('Initial state:', initialState);
      
      setManager(newManager);
      setGameState(initialState);
      setLastHandResult(null);
      setLastGTOSolution(null);
      setLastComparison(null);
      setActionLog([]);
      setSessionStats({
        handsPlayed: 1,
        handsWon: 0,
        totalWinnings: 0,
        biggestPot: 0
      });
      
      console.log('Game initialized successfully');
      
      // Process AI turns if player is not first to act
      setTimeout(() => {
        console.log('Checking if AI should act...');
        if (newManager.isCurrentActorAI()) {
          console.log('Processing AI turns...');
          processAITurns(newManager);
        } else {
          console.log('Player turn - not processing AI');
        }
      }, 1000);
    } catch (error) {
      console.error('Error starting new game:', error);
      alert('Failed to start game. Check console for details.');
    }
  }, [isProcessing]);

  const startNewHand = useCallback(() => {
    if (!manager || isProcessing) return;
    
    // Clear any pending auto-start
    if ((window as any).__autoStartTimeout) {
      clearTimeout((window as any).__autoStartTimeout);
    }
    if ((window as any).__countdownInterval) {
      clearInterval((window as any).__countdownInterval);
    }
    
    setCountdown(null);
    setLastHandResult(null);
    setLastGTOSolution(null);
    setLastComparison(null);
    setActionLog([]);
    
    const newState = manager.startNewHand();
    setGameState(newState);
    
    setSessionStats(prev => ({
      ...prev,
      handsPlayed: prev.handsPlayed + 1
    }));

    // Process AI turns if needed
    setTimeout(() => processAITurns(manager), 1000);
  }, [manager, isProcessing]);

  const executePlayerAction = useCallback((action: Action) => {
    if (!manager || !gameState || isProcessing) return;

    const currentActor = manager.getCurrentActor();
    if (!currentActor) return;
    
    const player = gameState.players.find(p => p.id === currentActor);
    if (!player) return;
    
    // Log player action
    addActionToLog(player.name, action.type, action.amount);
    
    // Process action through GameManager (includes GTO analysis)
    const result = manager.processPlayerAction(currentActor, action);

    if (result.success) {
      // Store GTO analysis
      if (result.gtoSolution) {
        setLastGTOSolution(result.gtoSolution);
      }
      if (result.comparison) {
        setLastComparison(result.comparison);
      }
      
      setGameState(result.gameState);
      
      // Process AI turns after 1 second delay
      setTimeout(() => processAITurns(manager), 1000);
    } else {
      console.error('Action failed:', result.error);
      alert(result.error);
    }
  }, [manager, gameState, isProcessing]);

  const rebuyPlayer = useCallback((playerId: string) => {
    if (!manager || !gameState) return;
    
    const player = gameState.players.find(p => p.id === playerId);
    if (player && player.stack === 0) {
      player.stack = 1000; // Rebuy for $1000
      setGameState({ ...gameState });
    }
  }, [manager, gameState]);

  const isPlayerTurn = gameState !== null && 
    gameState.actionQueue.length > 0 &&
    gameState.players[0].id === gameState.actionQueue[gameState.currentActorIndex];

  return (
    <GameContext.Provider value={{
      gameState,
      manager,
      sessionStats,
      lastHandResult,
      lastGTOSolution,
      lastComparison,
      actionLog,
      playerLastActions,
      countdown,
      startNewGame,
      startNewHand,
      executePlayerAction,
      rebuyPlayer,
      isPlayerTurn
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
