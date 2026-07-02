
export interface Player {
  id: string;
  name: string;
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

  /** Currency the game was created in (defaults to user preference at game time) */
  currency?: string;

  /** Cash rounding unit in the game's currency. Default 5. 0 (or <=0) = Exact (no rounding). */
  cashUnit?: number;

  // Settlement cache
  cachedSettlements?: SettlementResult;
  transactionHash?: string;

  // Cloud sync — set by Firestore serverTimestamp on each write
  syncedAt?: Date;
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
  /** Forwarded to the solver. Default 5. <= 0 = Exact (no rounding). */
  cashRoundingUnit?: number;
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
