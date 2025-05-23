export type Difficulty = "easy" | "medium" | "hard";

export interface PlayerStats {
  points: number;
  tasksCompleted: number;
  truthsAnswered: number;
  daresCompleted: number;
  achievements: string[];
  currentStreak: number;
  maxStreak: number;
  level: number;
  xp: number;
  activeQuests: string[];
  completedQuests: string[];
  badges: string[];
  hardTasksCompleted: number;
  sharedTasks: number;
  skipTokens?: number;
  xpBoostEndTime?: number;
}

export interface GameState {
  difficulty: Difficulty;
  playerStats: PlayerStats;
  lastTaskTimestamp: number | null;
  selectedCategory: string;
  surpriseMessage?: string;
  availableQuests: Quest[];
  communityQuests: Quest[];
}

export interface QuestReward {
  points?: number;
  xp?: number;
  items?: Array<{ itemId: string; quantity: number }>;
  badgeId?: string;
  tempBoost?: { 
    type: "XP_BOOST" | "POINT_BOOST"; 
    durationHours: number; 
    multiplier: number 
  };
  claimed?: boolean;
}

export interface Quest {
  id: string;
  type: "DAILY_PERSONAL" | "WEEKLY_PERSONAL" | "COMMUNITY_GOAL" | "EVENT_THEMED";
  title: string;
  description: string;
  targetValue: number;
  currentProgress: number;
  reward: QuestReward;
  isActive: boolean;
  isCompleted: boolean;
  startDate?: number;
  endDate?: number;
  relatedCategory?: string;
  relatedDifficulty?: Difficulty;
} 