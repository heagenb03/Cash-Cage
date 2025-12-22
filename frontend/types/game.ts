// Core type definitions for the poker tracking app

export interface Player {
  id: string;
  name: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface Transaction {
  id: string;
  playerId: string;
  type: 'buyin' | 'cashout';
  amount: number;
  timestamp: Date;
}

export interface Game {
  id: string;
  name: string;
  date: Date;
  status: 'active' | 'completed';
  players: Player[];
  transactions: Transaction[];
  createdAt: Date;
  completedAt?: Date;

  // Settlement cache
  cachedSettlements?: SettlementResult;
  transactionHash?: string; // For cache invalidation
}

export interface PlayerBalance {
  playerId: string;
  playerName: string;
  totalBuyins: number;
  totalCashouts: number;
  netBalance: number;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export type SettlementSource = 'server' | 'client';

export interface SettlementMeta {
  algorithm: string;
  source: SettlementSource;
  generatedAt: string;
  serverRequestId?: string;
  warnings?: string[];
  error?: string;
}

export interface SettlementResult extends SettlementMeta {
  settlements: Settlement[];
}

export interface SettlementRequestSettings {
  maxTransfersPerPlayer?: number;
  minTransferAmount?: number;
}

export interface Validation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalBuyins: number;
  totalCashouts: number;
  netDifference: number;
}

export interface GameSummary {
  game: Game;
  balances: PlayerBalance[];
  settlements: Settlement[];
  totalPot: number;
  settlementMeta: SettlementMeta;
}
