export type View = 'home' | 'today' | 'live' | 'favorites' | 'profile' | 'activity' | 'transactions' | 'admin';

export interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  score: string;
  time: string;
  status: 'live' | 'upcoming' | 'completed';
  league: string;
  odds: { home: number; draw: number; away: number };
  probability: { home: number; draw: number; away: number };
  stats?: {
    possession: { home: number; away: number };
    shots: { home: number; away: number };
    corners: { home: number; away: number };
  };
  pastPerformance?: {
    home: string[];
    away: string[];
  };
  h2h?: {
    homeWins: number;
    awayWins: number;
    draws: number;
    lastMatches: { date: string; score: string; winner: string }[];
  };
}

export interface UserStats {
  balance: number;
  winRate: number;
  rank: number;
  predictions: number;
}

export interface Prediction {
  id: string;
  match: string;
  prediction: string;
  odds: number;
  stake: number;
  outcome: 'won' | 'lost' | 'pending';
  profit?: number;
  date: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'prediction_win' | 'prediction_stake';
  amount: number;
  date: string;
  status: 'completed' | 'pending';
  description: string;
}
