import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { gameData } from "@/data/game-data";
import confetti from 'canvas-confetti';
import { Share, Settings, ArrowRight, Send, Trophy, Timer, Star, Flame, Plus, X, Gift, Sparkles, Award, Zap } from "lucide-react";
import { Difficulty, PlayerStats, GameState, Quest } from "@/types/game";
import { calculateLevel, calculateProgress, calculateXpForNextLevel, getXpReward } from "@/utils/level-utils";
import { generateDailyQuests, generateWeeklyQuests, generateCommunityQuest } from "@/data/quest-data";
import QuestsPanel from "@/components/QuestsPanel";

interface CustomTask {
  type: "ПРАВДА" | "ДЕЙСТВИЕ";
  text: string;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  action: (gameState: GameState) => GameState;
}

const INITIAL_PLAYER_STATS: PlayerStats = {
  points: 0,
  tasksCompleted: 0,
  truthsAnswered: 0,
  daresCompleted: 0,
  achievements: [],
  currentStreak: 0,
  maxStreak: 0,
  level: 1,
  xp: 0,
  activeQuests: [],
  completedQuests: [],
  badges: [],
  hardTasksCompleted: 0,
  sharedTasks: 0,
  skipTokens: 0,
  xpBoostEndTime: null
};

const INITIAL_GAME_STATE: GameState = {
  difficulty: 'medium',
  playerStats: INITIAL_PLAYER_STATS,
  lastTaskTimestamp: null,
  selectedCategory: gameData.categories[0].id,
  availableQuests: [...generateDailyQuests(), ...generateWeeklyQuests()],
  communityQuests: [generateCommunityQuest()]
};

const DIFFICULTY_POINTS = {
  easy: 10,
  medium: 25,
  hard: 50,
};

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'theme',
    name: 'Новая тема',
    description: 'Измените внешний вид игры',
    icon: '🎨',
    price: 500,
    action: (state) => ({
      ...state,
      playerStats: {
        ...state.playerStats,
        points: state.playerStats.points - 500
      }
    })
  },
  {
    id: 'xp_boost',
    name: 'Буст опыта',
    description: 'x2 опыт на 1 час',
    icon: '⚡️',
    price: 300,
    action: (state) => ({
      ...state,
      playerStats: {
        ...state.playerStats,
        points: state.playerStats.points - 300,
        xpBoostEndTime: Date.now() + 3600000
      }
    })
  },
  {
    id: 'skip',
    name: 'Пропуск',
    description: 'Пропустить задание без штрафа',
    icon: '🎲',
    price: 200,
    action: (state) => ({
      ...state,
      playerStats: {
        ...state.playerStats,
        points: state.playerStats.points - 200,
        skipTokens: (state.playerStats.skipTokens || 0) + 1
      }
    })
  },
  {
    id: 'surprise',
    name: 'Сюрприз',
    description: 'Случайный бонус',
    icon: '🎁',
    price: 100,
    action: (state) => {
      const surprises = [
        { xp: 100, message: '+100 XP' },
        { points: 200, message: '+200 очков' },
        { skipTokens: 1, message: '+1 пропуск' },
        { xpBoost: 1800000, message: '30 минут x2 опыта' }
      ];
      const surprise = surprises[Math.floor(Math.random() * surprises.length)];
      return {
        ...state,
        playerStats: {
          ...state.playerStats,
          points: state.playerStats.points - 100 + (surprise.points || 0),
          xp: state.playerStats.xp + (surprise.xp || 0),
          skipTokens: (state.playerStats.skipTokens || 0) + (surprise.skipTokens || 0),
          xpBoostEndTime: surprise.xpBoost ? Date.now() + surprise.xpBoost : state.playerStats.xpBoostEndTime
        },
        surpriseMessage: surprise.message
      };
    }
  }
];

interface CustomTaskFormProps {
  onClose: () => void;
  customTask: CustomTask;
  setCustomTask: (task: CustomTask | ((prev: CustomTask) => CustomTask)) => void;
}

const CustomTaskForm = ({ onClose, customTask, setCustomTask }: CustomTaskFormProps) => {
  const { toast } = useToast();

  const handleShare = async () => {
    const taskText = `${customTask.type}: ${customTask.text}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Правда или Действие - Новое задание',
          text: taskText,
        });
        toast({
          title: "Успешно!",
          description: "Задание отправлено",
        });
      } catch (error) {
        console.error('Ошибка при отправке:', error);
      }
    } else {
      navigator.clipboard.writeText(taskText);
      toast({
        title: "Скопировано!",
        description: "Задание скопировано в буфер обмена",
      });
    }
  };

  const shareToTelegram = () => {
    const encodedResult = encodeURIComponent(customTask.type);
    const encodedTask = encodeURIComponent(customTask.text);
    const shareUrl = `${window.location.href.split('?')[0]}?result=${encodedResult}&task=${encodedTask}`;
    
    const shareText = encodeURIComponent(`Правда или Действие: Я создал новое задание "${customTask.type}" - ${customTask.text}. Нажми на ссылку, чтобы ответить на вопрос или выполнить действие вместе со мной!`);
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${shareText}`;
    
    window.open(telegramUrl, '_blank');
    
    toast({
      title: "Telegram",
      description: "Открываем Telegram для отправки",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-lg border border-slate-700/50 relative overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl animate-pulse"></div>
        <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-3xl animate-pulse"></div>
        
        <div className="flex justify-between items-center mb-8 relative z-10">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Создать задание
          </h2>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </motion.button>
        </div>
        
        <div className="space-y-8 relative z-10">
          <div>
            <label className="block text-sm text-slate-300 mb-4 font-medium">Тип задания</label>
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCustomTask(prev => ({ ...prev, type: "ПРАВДА" }))}
                className={`relative py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 overflow-hidden ${
                  customTask.type === "ПРАВДА"
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.5)] border border-blue-400"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 border border-slate-600"
                }`}
              >
                <span className="relative z-10">Правда</span>
                {customTask.type === "ПРАВДА" && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  />
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCustomTask(prev => ({ ...prev, type: "ДЕЙСТВИЕ" }))}
                className={`relative py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 overflow-hidden ${
                  customTask.type === "ДЕЙСТВИЕ"
                    ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)] border border-red-400"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 border border-slate-600"
                }`}
              >
                <span className="relative z-10">Действие</span>
                {customTask.type === "ДЕЙСТВИЕ" && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  />
                )}
              </motion.button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-slate-300 mb-4 font-medium">Текст задания</label>
            <textarea
              value={customTask.text}
              onChange={(e) => setCustomTask(prev => ({ ...prev, text: e.target.value }))}
              className="w-full p-5 rounded-2xl bg-white/5 border border-slate-600/50 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-500 resize-none transition-all text-white backdrop-blur-sm"
              rows={5}
              placeholder={customTask.type === "ПРАВДА" ? "Например: Расскажи о своем самом неловком моменте..." : "Например: Изобрази животное, а остальные пусть угадывают..."}
            />
          </div>
          
          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleShare}
              disabled={!customTask.text.trim()}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-purple-500/25 transition-all disabled:hover:scale-100"
            >
              <Share className="w-5 h-5 inline-block mr-2" />
              Поделиться
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={shareToTelegram}
              disabled={!customTask.text.trim()}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25 transition-all disabled:hover:scale-100"
            >
              <Send className="w-5 h-5 inline-block mr-2" />
              Telegram
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Index = () => {
  const [result, setResult] = useState<"ПРАВДА" | "ДЕЙСТВИЕ" | null>(null);
  const [task, setTask] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<"default" | "dark" | "party">("default");
  const [history, setHistory] = useState<Array<{result: string, task: string}>>([]);
  const [sharedContent, setSharedContent] = useState<{result: string, task: string} | null>(null);
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCustomTaskForm, setShowCustomTaskForm] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [customTask, setCustomTask] = useState<CustomTask>({
    type: "ПРАВДА",
    text: ""
  });
  const { toast } = useToast();
  const [xpGainedNotification, setXpGainedNotification] = useState<number | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);
  const [showQuests, setShowQuests] = useState(false);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedResult = urlParams.get('result');
    const sharedTask = urlParams.get('task');
    
    if (sharedResult && sharedTask) {
      setSharedContent({
        result: decodeURIComponent(sharedResult),
        task: decodeURIComponent(sharedTask)
      });
      return;
    }
    
    const storedSharedContent = localStorage.getItem('truthOrDareShared');
    if (storedSharedContent) {
      try {
        const parsed = JSON.parse(storedSharedContent);
        setSharedContent(parsed);
        localStorage.removeItem('truthOrDareShared');
      } catch (e) {
        console.error("Error parsing shared content", e);
        localStorage.removeItem('truthOrDareShared');
      }
    }
  }, []);

  useEffect(() => {
    const now = new Date();
    const savedState = localStorage.getItem('truthOrDareGameState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setGameState({ 
          ...INITIAL_GAME_STATE,
          ...parsed,
          selectedCategory: parsed.selectedCategory || gameData.categories[0].id 
        });
      } catch (e) {
        console.error("Error parsing game state", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('truthOrDareGameState', JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    if (timeLeft === null) return;
    
    if (timeLeft > 0) {
      const timerId = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else {
      toast({
        title: "Время вышло!",
        description: "Задание не выполнено вовремя",
      });
      setTimeLeft(null);
    }
  }, [timeLeft]);

  useEffect(() => {
    const savedCompletedTasks = localStorage.getItem('truthOrDareCompletedTasks');
    if (savedCompletedTasks) {
      try {
        const parsed = JSON.parse(savedCompletedTasks);
        setCompletedTasks(new Set(parsed));
      } catch (e) {
        console.error("Error parsing completed tasks", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('truthOrDareCompletedTasks', 
      JSON.stringify(Array.from(completedTasks)));
  }, [completedTasks]);

  useEffect(() => {
    const now = Date.now();
    const dailyQuests = gameState.availableQuests.filter(q => q.type === "DAILY_PERSONAL");
    const weeklyQuests = gameState.availableQuests.filter(q => q.type === "WEEKLY_PERSONAL");
    
    let needsUpdate = false;
    if (dailyQuests.length === 0 || dailyQuests.some(q => q.endDate && q.endDate < now)) {
      needsUpdate = true;
    }
    if (weeklyQuests.length === 0 || weeklyQuests.some(q => q.endDate && q.endDate < now)) {
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      setGameState(prev => ({
        ...prev,
        availableQuests: [
          ...prev.availableQuests.filter(q => q.endDate && q.endDate >= now),
          ...generateDailyQuests(),
          ...generateWeeklyQuests()
        ]
      }));
    }
  }, [gameState.lastTaskTimestamp]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: theme === "party" ? ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'] : ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981']
    });
  };

  const getBackgroundClass = () => {
    switch(theme) {
      case "dark":
        return "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900";
      case "party":
        return "bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-600";
      default:
        return "bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900";
    }
  };

  const dismissSharedContent = () => {
    setSharedContent(null);
  };

  const updatePlayerStats = (isCompleted: boolean, taskType: "ПРАВДА" | "ДЕЙСТВИЕ") => {
    setGameState(prev => {
      const newStreak = isCompleted ? prev.playerStats.currentStreak + 1 : 0;
      const points = isCompleted ? DIFFICULTY_POINTS[prev.difficulty] : 0;
      const xpGained = isCompleted ? getXpReward(prev.difficulty) : 0;
      const currentXp = prev.playerStats.xp || 0;
      const newXp = currentXp + xpGained;
      
      if (isCompleted && xpGained > 0) {
        setXpGainedNotification(xpGained);
        setTimeout(() => setXpGainedNotification(null), 3000);
      } 
      const updatedQuests = prev.availableQuests.map(quest => {
        if (quest.isCompleted) return quest;

        let shouldUpdate = false;
        let newProgress = quest.currentProgress;

        switch (quest.type) {
          case "DAILY_PERSONAL":
          case "WEEKLY_PERSONAL":
            if (taskType === "ПРАВДА" && quest.title === "Мастер Правды") {
              shouldUpdate = true;
              newProgress = quest.currentProgress + 1;
            } else if (taskType === "ДЕЙСТВИЕ" && quest.title === "Смельчак") {
              shouldUpdate = true;
              newProgress = quest.currentProgress + 1;
            } else if (quest.title === "Серийный Игрок") {
              shouldUpdate = true;
              newProgress = newStreak;
            }
            break;
          case "COMMUNITY_GOAL":
            if (isCompleted) {
              shouldUpdate = true;
              newProgress = quest.currentProgress + 1;
            }
            break;
        }

        if (!shouldUpdate) return quest;

        const isNowCompleted = newProgress >= quest.targetValue;
        return {
          ...quest,
          currentProgress: newProgress,
          isCompleted: isNowCompleted
        };
      });
      const updatedCommunityQuests = prev.communityQuests.map(quest => {
        if (quest.isCompleted || !isCompleted) return quest;

        const newProgress = quest.currentProgress + 1;
        const isNowCompleted = newProgress >= quest.targetValue;
        
        return {
          ...quest,
          currentProgress: newProgress,
          isCompleted: isNowCompleted
        };
      });

      const newStats: PlayerStats = {
        ...prev.playerStats,
        points: (prev.playerStats.points || 0) + points,
        xp: newXp,
        tasksCompleted: isCompleted ? (prev.playerStats.tasksCompleted || 0) + 1 : prev.playerStats.tasksCompleted || 0,
        truthsAnswered: isCompleted && taskType === "ПРАВДА" ? (prev.playerStats.truthsAnswered || 0) + 1 : prev.playerStats.truthsAnswered || 0,
        daresCompleted: isCompleted && taskType === "ДЕЙСТВИЕ" ? (prev.playerStats.daresCompleted || 0) + 1 : prev.playerStats.daresCompleted || 0,
        currentStreak: newStreak,
        maxStreak: Math.max(newStreak, prev.playerStats.maxStreak || 0),
        level: calculateLevel(newXp),
        hardTasksCompleted: isCompleted && prev.difficulty === "hard" ? (prev.playerStats.hardTasksCompleted || 0) + 1 : prev.playerStats.hardTasksCompleted || 0
      };

      return {
        ...prev,
        playerStats: newStats,
        lastTaskTimestamp: Date.now(),
        availableQuests: updatedQuests,
        communityQuests: updatedCommunityQuests
      };
    });
  };

  const generateTaskId = (result: string, task: string) => {
    return `${result}-${task}-${Date.now()}`;
  };

  const playGame = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setResult(null);
    setTask(null);
    setTimeLeft(null);
    setCurrentTaskId(null);
    
    const timeoutId = setTimeout(() => {
      const random = Math.random();
      const newResult = random < 0.8 ? "ПРАВДА" : "ДЕЙСТВИЕ";
      
      const selectedCategoryData = gameData.categories.find(cat => cat.id === gameState.selectedCategory);
      const tasksPool = selectedCategoryData ? (newResult === "ПРАВДА" ? selectedCategoryData.truths : selectedCategoryData.actions) : [];

      if (tasksPool.length === 0) {
        toast({
          title: "Нет заданий",
          description: `В категории "${selectedCategoryData?.name || 'выбранной категории'}" нет заданий для "${newResult}"`, 
        });
        setIsAnimating(false);
        return;
      }

      const randomTask = tasksPool[Math.floor(Math.random() * tasksPool.length)];
      const newTaskId = generateTaskId(newResult, randomTask);
      
      setResult(newResult);
      setTask(randomTask);
      setCurrentTaskId(newTaskId);
      setHistory(prev => [...prev, {result: newResult, task: randomTask}]);
      setIsAnimating(false);
      
      if (newResult === "ДЕЙСТВИЕ") {
        setTimeLeft(60);
      }
      
      triggerConfetti();
      
      toast({
        title: "Результат",
        description: `Вам выпало: ${newResult}`,
      });
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  };

  const selectManually = (choice: "ПРАВДА" | "ДЕЙСТВИЕ") => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setResult(null);
    setTask(null);
    setTimeLeft(null);
    setCurrentTaskId(null);
    
    const timeoutId = setTimeout(() => {
      const selectedCategoryData = gameData.categories.find(cat => cat.id === gameState.selectedCategory);
      const tasksPool = selectedCategoryData ? (choice === "ПРАВДА" ? selectedCategoryData.truths : selectedCategoryData.actions) : [];

       if (tasksPool.length === 0) {
        toast({
          title: "Нет заданий",
          description: `В категории "${selectedCategoryData?.name || 'выбранной категории'}" нет заданий для "${choice}"`, 
        });
        setIsAnimating(false);
        return;
      }

      const randomTask = tasksPool[Math.floor(Math.random() * tasksPool.length)];
      const newTaskId = generateTaskId(choice, randomTask);
      
      setResult(choice);
      setTask(randomTask);
      setCurrentTaskId(newTaskId);
      setHistory(prev => [...prev, {result: choice, task: randomTask}]);
      setIsAnimating(false);
      
      if (choice === "ДЕЙСТВИЕ") {
        setTimeLeft(60);
      }
      
      triggerConfetti();
      
      toast({
        title: "Результат",
        description: `Вы выбрали: ${choice}`,
      });
    }, 1500);
    
    return () => clearTimeout(timeoutId);
  };

  const completeTask = (completed: boolean) => {
    if (!result || !task || !currentTaskId) return;
    
    if (completedTasks.has(currentTaskId)) {
      toast({
        title: "Ошибка",
        description: "Это задание уже было выполнено!",
      });
      return;
    }
    
    const newCompletedTasks = new Set(completedTasks);
    newCompletedTasks.add(currentTaskId);
    setCompletedTasks(newCompletedTasks);
    
    if (!completed && gameState.playerStats.skipTokens && gameState.playerStats.skipTokens > 0) {
      setGameState(prev => ({
        ...prev,
        playerStats: {
          ...prev.playerStats,
          skipTokens: (prev.playerStats.skipTokens || 1) - 1,
          points: prev.playerStats.points + DIFFICULTY_POINTS[prev.difficulty],
          tasksCompleted: prev.playerStats.tasksCompleted + 1,
          xp: prev.playerStats.xp + getXpReward(prev.difficulty),
        }
      }));
      
      toast({
        title: "Использован пропуск",
        description: `Осталось пропусков: ${(gameState.playerStats.skipTokens || 1) - 1}`,
      });
    } else {
      updatePlayerStats(completed, result);
    }
    
    setTimeLeft(null);
    
    toast({
      title: completed ? "Задание выполнено!" : "Задание пропущено",
      description: completed 
        ? `+${DIFFICULTY_POINTS[gameState.difficulty]} очков` 
        : gameState.playerStats.skipTokens && gameState.playerStats.skipTokens > 0 
          ? "Использован пропуск без штрафа"
          : "Серия прервана",
    });

    setTimeout(() => {
      setResult(null);
      setTask(null);
    }, 500);
  };

  const shareResult = () => {
    if (!result || !task) return;
    
    const shareText = `Правда или Действие: Мне выпало "${result}" - ${task}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Правда или Действие',
        text: shareText,
      }).then(() => {
        completeTask(true);
        setGameState(prev => ({
          ...prev,
          playerStats: {
            ...prev.playerStats,
            sharedTasks: (prev.playerStats.sharedTasks || 0) + 1
          }
        }));
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        completeTask(true);
        setGameState(prev => ({
          ...prev,
          playerStats: {
            ...prev.playerStats,
            sharedTasks: (prev.playerStats.sharedTasks || 0) + 1
          }
        }));
        toast({
          title: "Скопировано",
          description: "Текст скопирован в буфер обмена",
        });
      });
    }
  };

  const shareToTelegram = () => {
    if (!result || !task) return;
    
    const encodedResult = encodeURIComponent(result);
    const encodedTask = encodeURIComponent(task);
    const shareUrl = `${window.location.href.split('?')[0]}?result=${encodedResult}&task=${encodedTask}`;
    
    const shareText = encodeURIComponent(`Правда или Действие: Мне выпало "${result}" - ${task}. Нажми на ссылку, чтобы ответить на вопрос или выполнить действие вместе со мной!`);
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${shareText}`;
    
    window.open(telegramUrl, '_blank');
    completeTask(true);
    setGameState(prev => ({
      ...prev,
      playerStats: {
        ...prev.playerStats,
        sharedTasks: (prev.playerStats.sharedTasks || 0) + 1
      }
    }));
    
    toast({
      title: "Telegram",
      description: "Открываем Telegram для отправки",
    });
  };

  const shareHistoryItemToTelegram = (item: {result: string, task: string}) => {
    const encodedResult = encodeURIComponent(item.result);
    const encodedTask = encodeURIComponent(item.task);
    const shareUrl = `${window.location.href.split('?')[0]}?result=${encodedResult}&task=${encodedTask}`;
    
    const shareText = encodeURIComponent(`Правда или Действие: Мне выпало "${item.result}" - ${item.task}. Нажми на ссылку, чтобы ответить на вопрос или выполнить действие вместе со мной!`);
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${shareText}`;
    
    window.open(telegramUrl, '_blank');
    
    setGameState(prev => ({
      ...prev,
      playerStats: {
        ...prev.playerStats,
        sharedTasks: (prev.playerStats.sharedTasks || 0) + 1
      }
    }));
    
    toast({
      title: "Telegram",
      description: "Открываем Telegram для отправки",
    });
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, type: "spring" } },
    exit: { opacity: 0, y: -30, scale: 0.9, transition: { duration: 0.4 } }
  };

  const resetProgress = () => {
    setGameState(INITIAL_GAME_STATE);
    setCompletedTasks(new Set());
    setHistory([]);
    
    localStorage.removeItem('truthOrDareGameState');
    localStorage.removeItem('truthOrDareCompletedTasks');
    
    toast({
      title: "Прогресс сброшен",
      description: "Все достижения и очки обнулены",
    });
    
    setShowResetConfirm(false);
    setShowSettings(false);
  };

  const purchaseItem = (item: ShopItem) => {
    if (gameState.playerStats.points < item.price) {
      setShopError('Недостаточно очков для покупки!');
      return;
    }

    setGameState(prev => {
      const newState = item.action(prev);
      
      toast({
        title: "Покупка успешна!",
        description: item.name + (newState.surpriseMessage ? ` (${newState.surpriseMessage})` : ''),
      });

      if (newState.surpriseMessage) {
        delete newState.surpriseMessage;
      }

      return newState;
    });

    setShopError(null);
  };

  const handleClaimQuestReward = (quest: Quest) => {
    if (!quest.isCompleted || quest.reward.claimed) return;

    setGameState(prev => {
      const newState = { ...prev };
      if (quest.reward.points) {
        newState.playerStats.points += quest.reward.points;
      }
      if (quest.reward.xp) {
        newState.playerStats.xp += quest.reward.xp;
      }
      if (quest.reward.badgeId && !newState.playerStats.badges.includes(quest.reward.badgeId)) {
        newState.playerStats.badges.push(quest.reward.badgeId);
      }
      if (quest.reward.items) {
        quest.reward.items.forEach(item => {
          if (item.itemId === "skip") {
            newState.playerStats.skipTokens = (newState.playerStats.skipTokens || 0) + item.quantity;
          }
        });
      }
      if (quest.reward.tempBoost) {
        if (quest.reward.tempBoost.type === "XP_BOOST") {
          newState.playerStats.xpBoostEndTime = Date.now() + quest.reward.tempBoost.durationHours * 60 * 60 * 1000;
        }
      }
      const questIndex = newState.availableQuests.findIndex(q => q.id === quest.id);
      if (questIndex !== -1) {
        newState.availableQuests[questIndex].reward.claimed = true;
      }
      newState.playerStats.completedQuests.push(quest.id);
      newState.playerStats.activeQuests = newState.playerStats.activeQuests.filter(id => id !== quest.id);

      toast({
        title: "Награда получена!",
        description: `Вы получили награду за квест "${quest.title}"`,
      });

      return newState;
    });
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${getBackgroundClass()} p-4 transition-all duration-1000 relative overflow-hidden`}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence>
          {xpGainedNotification && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.5 }}
              className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              <span className="font-bold">+{xpGainedNotification} XP</span>
            </motion.div>
          )}
        </AnimatePresence>

        {sharedContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg" 
          >
            <div
              className="absolute inset-0"
              onClick={dismissSharedContent}
            ></div>
            <motion.div
              className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl w-full max-w-lg mx-auto p-8 rounded-3xl shadow-2xl border border-slate-700/50 relative z-10 overflow-hidden"
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
            >
              <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl animate-pulse"></div>
              
              <h3 className="text-3xl font-bold text-white mb-6 text-center">👋 Привет!</h3>
              <p className="text-slate-300 mb-6 text-center text-lg">Твоему другу/подруге выпало:</p>

              <div
                className={`p-6 rounded-2xl mb-8 font-semibold text-xl flex items-center justify-center relative overflow-hidden ${
                  sharedContent.result === "ПРАВДА"
                    ? "bg-gradient-to-r from-blue-600/30 to-blue-500/30 text-blue-200 border border-blue-400/50 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                    : "bg-gradient-to-r from-red-600/30 to-red-500/30 text-red-200 border border-red-400/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                }`}
              >
                <span className="mr-4 text-2xl">{sharedContent.result}</span>
                <span className="text-center">{sharedContent.task}</span>
              </div>

              <p className="text-slate-300 mb-8 text-center text-lg">Ответьте на вопрос или выполните действие вдвоем!</p>

              <div className="flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={dismissSharedContent}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                >
                  Понятно, играем!
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Правда или Действие
          </h1>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowCustomTaskForm(true)}
              className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:shadow-blue-500/25 shadow-lg transition-all"
              title="Создать своё задание"
            >
              <Plus className="w-6 h-6" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSettings(true)}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/20 transition-all"
            >
              <Settings className="w-6 h-6" />
            </motion.button>
          </div>
        </motion.div>
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
              onClick={() => setShowSettings(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 50 }}
                className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-lg border border-slate-700/50 relative overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl animate-pulse"></div>
                <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-3xl animate-pulse"></div>
                
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    Настройки
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowSettings(false)}
                    className="p-3 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </motion.button>
                </div>

                <div className="space-y-8 relative z-10">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 border border-white/20 backdrop-blur-sm"
                  >
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Статистика
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-2xl font-bold text-white">{gameState.playerStats.points}</div>
                        <div className="text-sm text-slate-400">Очки</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-2xl font-bold text-white">{gameState.playerStats.level}</div>
                        <div className="text-sm text-slate-400">Уровень</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-2xl font-bold text-white">{gameState.playerStats.tasksCompleted}</div>
                        <div className="text-sm text-slate-400">Заданий</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-2xl font-bold text-white">{gameState.playerStats.maxStreak}</div>
                        <div className="text-sm text-slate-400">Лучшая серия</div>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label className="block text-lg text-white mb-4 font-medium">Тема оформления</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(["default", "dark", "party"] as const).map((t) => (
                        <motion.button
                          key={t}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setTheme(t)}
                          className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                            theme === t 
                              ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg" 
                              : "bg-white/10 hover:bg-white/20 text-slate-300 border border-white/20"
                          }`}
                        >
                          {t === "default" ? "Стандарт" : t === "dark" ? "Темная" : "Вечеринка"}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <label className="block text-lg text-white mb-4 font-medium">Категория заданий</label>
                    <div className="grid grid-cols-2 gap-3">
                      {gameData.categories.map((category) => (
                        <motion.button
                          key={category.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setGameState(prev => ({ ...prev, selectedCategory: category.id }))}
                          className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                            gameState.selectedCategory === category.id 
                              ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg" 
                              : "bg-white/10 hover:bg-white/20 text-slate-300 border border-white/20"
                          }`}
                        >
                          {category.name}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <label className="block text-lg text-white mb-4 font-medium">Сложность</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => (
                        <motion.button
                          key={diff}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setGameState(prev => ({ ...prev, difficulty: diff }))}
                          className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                            gameState.difficulty === diff 
                              ? "bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg" 
                              : "bg-white/10 hover:bg-white/20 text-slate-300 border border-white/20"
                          }`}
                        >
                          {diff === "easy" ? "Легко" : diff === "medium" ? "Средне" : "Сложно"}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="pt-6 border-t border-white/20"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold hover:shadow-red-500/25 shadow-lg transition-all"
                    >
                      Сбросить прогресс
                    </motion.button>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl mb-8 border border-white/20 relative overflow-hidden"
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="absolute -right-16 -top-16 w-52 h-52 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 blur-3xl animate-pulse"></div>
          <div className="absolute -left-16 -bottom-16 w-52 h-52 rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 blur-3xl animate-pulse"></div>
          
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="text-center relative z-10"
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className={`inline-block px-8 py-4 rounded-2xl mb-8 shadow-2xl ${
                    result === "ПРАВДА" 
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-500/30" 
                      : "bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/30"
                  }`}
                >
                  <h2 className="text-5xl md:text-6xl font-bold text-white">
                    {result}
                  </h2>
                </motion.div>
                
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                >
                  <p className="text-white/90 text-lg md:text-xl font-medium leading-relaxed mb-8 px-4">
                    {task}
                  </p>
                  <div className="flex justify-center space-x-4">
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={shareResult}
                      className="flex items-center text-sm bg-white/10 hover:bg-white/20 text-white rounded-2xl px-6 py-3 font-medium border border-white/20 backdrop-blur-sm transition-all"
                    >
                      <Share size={16} className="mr-2" />
                      Поделиться
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={shareToTelegram}
                      className="flex items-center text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl px-6 py-3 font-medium shadow-lg hover:shadow-blue-500/25 transition-all"
                    >
                      <Send size={16} className="mr-2" />
                      Telegram
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="waiting"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-[240px] flex flex-col items-center justify-center"
              >
                {isAnimating ? (
                  <>
                    <motion.div
                      className="relative mb-6"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="w-24 h-24 rounded-full border-4 border-t-transparent border-white/30"></div>
                      <div className="absolute inset-2 w-20 h-20 rounded-full border-4 border-b-transparent border-purple-400 animate-spin"></div>
                    </motion.div>
                    <motion.p 
                      className="text-xl md:text-2xl text-white/80 font-medium"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      Выбираем...
                    </motion.p>
                    <motion.div 
                      className="flex space-x-2 mt-4"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                    </motion.div>
                  </>
                ) : (
                  <motion.div 
                    className="text-center"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <motion.div
                      className="bg-gradient-to-r from-white/10 to-white/5 p-8 rounded-3xl mb-6 border border-white/20"
                      whileHover={{ scale: 1.05, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <ArrowRight className="w-12 h-12 text-white/70" />
                    </motion.div>
                    <p className="text-xl md:text-2xl text-white/80 font-medium">
                      Нажмите кнопку, чтобы начать
                    </p>
                    <motion.div
                      className="mt-4 flex justify-center"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                    <Sparkles className="w-6 h-6 text-white/50" />
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={playGame}
            disabled={isAnimating}
            className="w-full py-4 px-8 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-2xl font-bold text-lg shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-purple-400/30"
          >
            {isAnimating ? (
              <span className="flex items-center justify-center gap-3">
                <motion.div
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                Выбираем...
              </span>
            ) : result ? (
              " Играть снова"
            ) : (
              " Случайный выбор"
            )}
          </motion.button>

          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectManually("ПРАВДА")}
              disabled={isAnimating}
              className="py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-blue-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-400/30"
            >
               Правда
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectManually("ДЕЙСТВИЕ")}
              disabled={isAnimating}
              className="py-4 px-6 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-red-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-red-400/30"
            >
               Действие
            </motion.button>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20 relative overflow-hidden"
        >
          <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-gradient-to-br from-yellow-500/10 to-orange-500/10 blur-2xl"></div>
          
          <div className="flex justify-between items-center mb-4 relative z-10">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-yellow-400" />
              <span className="text-xl font-bold text-white">{gameState.playerStats.points}</span>
              <span className="text-sm text-slate-400">очков</span>
            </div>
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-purple-400" />
              <span className="text-xl font-bold text-white">Ур. {gameState.playerStats.level}</span>
            </div>
            <div className="flex items-center gap-3">
              <Flame className="w-6 h-6 text-orange-400" />
              <span className="text-xl font-bold text-white">{gameState.playerStats.currentStreak}</span>
              <span className="text-sm text-slate-400">серия</span>
            </div>
          </div>
          <div className="relative z-10">
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>Опыт: {gameState.playerStats.xp}</span>
              <span>До {gameState.playerStats.level + 1} ур.: {calculateXpForNextLevel(gameState.playerStats.level) - gameState.playerStats.xp}</span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg"
                initial={{ width: 0 }}
                animate={{
                  width: `${calculateProgress(gameState.playerStats.xp, gameState.playerStats.level)}%`
                }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
        <AnimatePresence>
          {timeLeft !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="fixed top-20 right-4 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 z-40"
            >
              <Timer className="w-5 h-5" />
              <span className="font-bold text-lg">{timeLeft}s</span>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {result && currentTaskId && !completedTasks.has(currentTaskId) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 grid grid-cols-2 gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => completeTask(true)}
                className="py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-green-500/25 transition-all border border-green-400/30"
              >
                 Выполнено
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => completeTask(false)}
                className="py-4 px-6 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-gray-500/25 transition-all border border-gray-400/30"
              >
                ⏭ Пропустить {gameState.playerStats.skipTokens && gameState.playerStats.skipTokens > 0 ? `(${gameState.playerStats.skipTokens})` : ''}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 grid grid-cols-3 gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowShop(true)}
            className="flex flex-col items-center p-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all"
          >
            <Gift className="w-8 h-8 mb-2 text-purple-400" />
            <span className="text-sm font-medium text-white">Магазин</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowQuests(true)}
            className="flex flex-col items-center p-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all"
          >
            <Trophy className="w-8 h-8 mb-2 text-yellow-400" />
            <span className="text-sm font-medium text-white">Квесты</span>
            {gameState.availableQuests.some(q => q.isCompleted && !q.reward.claimed) && (
              <motion.div
                className="w-3 h-3 bg-red-500 rounded-full absolute -top-1 -right-1"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCustomTaskForm(true)}
            className="flex flex-col items-center p-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all"
          >
            <Plus className="w-8 h-8 mb-2 text-blue-400" />
            <span className="text-sm font-medium text-white">Создать</span>
          </motion.button>
        </motion.div>
        <AnimatePresence>
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8"
            >
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer p-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all text-white font-medium">
                  <span className="flex items-center gap-2">
                    📜 История игр ({history.length})
                  </span>
                  <motion.span 
                    className="transition-transform group-open:rotate-180"
                    initial={{ rotate: 0 }}
                  >
                    ▼
                  </motion.span>
                </summary>
                
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 space-y-3 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
                >
                  {history.slice().reverse().map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-xl bg-gradient-to-r from-white/5 to-white/10 border border-white/10 backdrop-blur-sm flex justify-between items-center group hover:bg-white/15 transition-all"
                    >
                      <div className="flex-1">
                        <span className={`font-bold text-lg mr-3 ${
                          item.result === "ПРАВДА" ? "text-blue-400" : "text-red-400"
                        }`}>
                          {item.result}
                        </span>
                        <span className="text-white/90 text-sm">{item.task}</span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => shareHistoryItemToTelegram(item)}
                        className="ml-3 p-2 text-blue-400 hover:text-blue-300 rounded-full hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Send size={16} />
                      </motion.button>
                    </motion.div>
                  ))}
                </motion.div>
              </details>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
              onClick={() => setShowResetConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 50 }}
                className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md border border-slate-700/50 relative overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 blur-3xl animate-pulse"></div>
                
                <h2 className="text-2xl font-bold text-white mb-4 relative z-10">⚠️ Сбросить прогресс?</h2>
                <p className="text-slate-300 mb-8 relative z-10">
                  Это действие удалит все ваши достижения, очки, статистику и историю игр. Данное действие нельзя отменить.
                </p>
                
                <div className="flex gap-4 relative z-10">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-3 px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium transition-all"
                  >
                    Отмена
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetProgress}
                    className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold shadow-lg hover:shadow-red-500/25 transition-all"
                  >
                    Сбросить
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showCustomTaskForm && (
            <CustomTaskForm 
              onClose={() => setShowCustomTaskForm(false)}
              customTask={customTask}
              setCustomTask={setCustomTask}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showShop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
              onClick={() => setShowShop(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 50 }}
                className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-lg border border-slate-700/50 relative overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 blur-3xl animate-pulse"></div>
                
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    🛍️ Магазин
                  </h2>
                  <div className="flex items-center gap-3">
                    <Star className="w-6 h-6 text-yellow-400" />
                    <span className="text-xl font-bold text-white">{gameState.playerStats.points}</span>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowShop(false)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors ml-2"
                    >
                      <X className="w-6 h-6 text-white" />
                    </motion.button>
                  </div>
                </div>

                {shopError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-center font-medium relative z-10"
                  >
                    ⚠️ {shopError}
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-4 relative z-10">
                  {SHOP_ITEMS.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all"
                    >
                      <div className="text-3xl mb-3 text-center">{item.icon}</div>
                      <h3 className="font-bold text-white text-center mb-2">{item.name}</h3>
                      <p className="text-sm text-slate-400 text-center mb-4 leading-relaxed">{item.description}</p>
                      <motion.button
                        whileHover={{ scale: gameState.playerStats.points >= item.price ? 1.02 : 1 }}
                        whileTap={{ scale: gameState.playerStats.points >= item.price ? 0.98 : 1 }}
                        onClick={() => purchaseItem(item)}
                        disabled={gameState.playerStats.points < item.price}
                        className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                          gameState.playerStats.points >= item.price
                            ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg hover:shadow-purple-500/25"
                            : "bg-white/10 text-slate-500 cursor-not-allowed border border-white/10"
                        }`}
                      >
                        💎 {item.price} очков
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showQuests && (
            <QuestsPanel
              quests={gameState.availableQuests}
              playerStats={gameState.playerStats}
              onClaimReward={handleClaimQuestReward}
              onClose={() => setShowQuests(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
