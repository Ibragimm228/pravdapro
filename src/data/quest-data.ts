import { Quest, Difficulty, PlayerStats } from "@/types/game";
import { gameData } from "./game-data";

interface QuestTemplate {
  title: string;
  description: string;
  targetValue: number[];
  reward: {
    points: number[];
    xp: number[];
    tempBoost?: {
      type: "XP_BOOST" | "POINT_BOOST";
      durationHours: number;
      multiplier: number;
    };
    badgeId?: string;
    items?: Array<{ itemId: string; quantity: number }>;
  };
  condition: (stats: PlayerStats) => number;
  type: "DAILY_PERSONAL" | "WEEKLY_PERSONAL" | "COMMUNITY_GOAL" | "EVENT_THEMED";
}

export const QUEST_TEMPLATES: Record<string, QuestTemplate[]> = {
  DAILY_PERSONAL: [
    {
      title: "Мастер Правды",
      description: "Ответь на {count} вопросов правды",
      targetValue: [3, 5, 7],
      reward: {
        points: [50, 100, 150],
        xp: [100, 200, 300]
      },
      condition: (stats: PlayerStats) => stats.truthsAnswered || 0,
      type: "DAILY_PERSONAL"
    },
    {
      title: "Смельчак",
      description: "Выполни {count} действий",
      targetValue: [3, 5, 7],
      reward: {
        points: [50, 100, 150],
        xp: [100, 200, 300]
      },
      condition: (stats: PlayerStats) => stats.daresCompleted || 0,
      type: "DAILY_PERSONAL"
    },
    {
      title: "Серийный Игрок",
      description: "Достигни серии из {count} выполненных заданий",
      targetValue: [3, 5, 7],
      reward: {
        points: [75, 150, 250],
        xp: [150, 300, 500],
        tempBoost: { type: "XP_BOOST", durationHours: 1, multiplier: 1.5 }
      },
      condition: (stats: PlayerStats) => stats.currentStreak || 0,
      type: "DAILY_PERSONAL"
    }
  ],
  WEEKLY_PERSONAL: [
    {
      title: "Эксперт Недели",
      description: "Выполни {count} заданий на сложном уровне",
      targetValue: [10, 15, 20],
      reward: {
        points: [300, 500, 750],
        xp: [600, 1000, 1500],
        badgeId: "expert_weekly"
      },
      condition: (stats: PlayerStats) => stats.hardTasksCompleted || 0,
      type: "WEEKLY_PERSONAL"
    },
    {
      title: "Социальная Бабочка",
      description: "Поделись {count} заданиями с друзьями",
      targetValue: [5, 10, 15],
      reward: {
        points: [200, 400, 600],
        xp: [400, 800, 1200],
        items: [{ itemId: "skip", quantity: 1 }]
      },
      condition: (stats: PlayerStats) => stats.sharedTasks || 0,
      type: "WEEKLY_PERSONAL"
    }
  ],
  COMMUNITY_GOAL: [
    {
      title: "Общественный Вызов",
      description: "Всем сообществом выполнить {count} заданий",
      targetValue: [1000, 5000, 10000],
      reward: {
        points: [100, 300, 500],
        xp: [200, 600, 1000],
        badgeId: "community_champion"
      },
      condition: (stats: PlayerStats) => stats.tasksCompleted || 0,
      type: "COMMUNITY_GOAL"
    }
  ]
} as const;

export const BADGES = {
  daily_master: {
    id: "daily_master",
    name: "Мастер Дня",
    description: "Выполни все ежедневные квесты",
    icon: "🌟"
  },
  weekly_champion: {
    id: "weekly_champion",
    name: "Чемпион Недели",
    description: "Выполни все еженедельные квесты",
    icon: "🏆"
  },
  expert_weekly: {
    id: "expert_weekly",
    name: "Эксперт Недели",
    description: "Выполни сложные задания",
    icon: "👑"
  },
  community_champion: {
    id: "community_champion",
    name: "Чемпион Сообщества",
    description: "Внеси значительный вклад в общественный квест",
    icon: "🌍"
  }
};

export function generateDailyQuests(): Quest[] {
  const templates = QUEST_TEMPLATES.DAILY_PERSONAL;
  const quests: Quest[] = [];

  templates.forEach(template => {
    const difficultyIndex = Math.floor(Math.random() * template.targetValue.length);
    const quest: Quest = {
      id: `${template.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: template.type,
      title: template.title,
      description: template.description.replace("{count}", template.targetValue[difficultyIndex].toString()),
      targetValue: template.targetValue[difficultyIndex],
      currentProgress: 0,
      reward: {
        points: template.reward.points[difficultyIndex],
        xp: template.reward.xp[difficultyIndex],
        tempBoost: template.reward.tempBoost
      },
      isActive: true,
      isCompleted: false,
      startDate: Date.now(),
      endDate: Date.now() + 24 * 60 * 60 * 1000 // 24 часа, аавоаовоавоав пипец я устал час ночи столько багов столько мороки. всего лишь одна новая функция не знаю как но нужно написать пост будто бы там что то еще кроме одной новой функции
    };
    quests.push(quest);
  });

  return quests;
}

export function generateWeeklyQuests(): Quest[] {
  const templates = QUEST_TEMPLATES.WEEKLY_PERSONAL;
  const quests: Quest[] = [];

  templates.forEach(template => {
    const difficultyIndex = Math.floor(Math.random() * template.targetValue.length);
    const quest: Quest = {
      id: `${template.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: template.type,
      title: template.title,
      description: template.description.replace("{count}", template.targetValue[difficultyIndex].toString()),
      targetValue: template.targetValue[difficultyIndex],
      currentProgress: 0,
      reward: {
        points: template.reward.points[difficultyIndex],
        xp: template.reward.xp[difficultyIndex],
        badgeId: template.reward.badgeId,
        items: template.reward.items
      },
      isActive: true,
      isCompleted: false,
      startDate: Date.now(),
      endDate: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 дня
    };
    quests.push(quest);
  });

  return quests;
}

export function generateCommunityQuest(): Quest {
  const templates = QUEST_TEMPLATES.COMMUNITY_GOAL;
  const template = templates[Math.floor(Math.random() * templates.length)];
  const difficultyIndex = Math.floor(Math.random() * template.targetValue.length);

  return {
    id: `${template.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: template.type,
    title: template.title,
    description: template.description.replace("{count}", template.targetValue[difficultyIndex].toString()),
    targetValue: template.targetValue[difficultyIndex],
    currentProgress: 0,
    reward: {
      points: template.reward.points[difficultyIndex],
      xp: template.reward.xp[difficultyIndex],
      badgeId: template.reward.badgeId
    },
    isActive: true,
    isCompleted: false,
    startDate: Date.now(),
    endDate: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 дня
  };
} 