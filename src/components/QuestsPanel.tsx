import { motion, AnimatePresence } from "framer-motion";
import { Quest, PlayerStats } from "@/types/game";
import { BADGES } from "@/data/quest-data";
import { Star, Trophy, Timer, Gift } from "lucide-react";

interface QuestsPanelProps {
  quests: Quest[];
  playerStats: PlayerStats;
  onClaimReward: (quest: Quest) => void;
  onClose: () => void;
}

const QuestsPanel = ({ quests, playerStats, onClaimReward, onClose }: QuestsPanelProps) => {
  const getQuestIcon = (quest: Quest) => {
    switch (quest.type) {
      case "DAILY_PERSONAL":
        return <Timer className="w-5 h-5" />;
      case "WEEKLY_PERSONAL":
        return <Trophy className="w-5 h-5" />;
      case "COMMUNITY_GOAL":
        return <Star className="w-5 h-5" />;
      case "EVENT_THEMED":
        return <Gift className="w-5 h-5" />;
    }
  };

  const getTimeLeft = (quest: Quest) => {
    if (!quest.endDate) return null;
    const now = Date.now();
    const timeLeft = quest.endDate - now;
    if (timeLeft <= 0) return "Истекло";
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} д.`;
    }
    
    return `${hours}ч ${minutes}м`;
  };

  const getProgressPercentage = (quest: Quest) => {
    return Math.min((quest.currentProgress / quest.targetValue) * 100, 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card/90 backdrop-blur-lg rounded-2xl p-6 w-full max-w-md border border-white/20 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-accent/10 blur-2xl"></div>
        <div className="absolute -left-12 -bottom-12 w-40 h-40 rounded-full bg-primary/10 blur-2xl"></div>
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h2 className="text-2xl font-bold text-foreground">Квесты</h2>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            <span className="font-semibold">{playerStats.completedQuests.length}</span>
          </div>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 relative z-10">
          <AnimatePresence>
            {quests.map(quest => (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-foreground/10 rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-foreground/20 rounded-lg">
                    {getQuestIcon(quest)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold">{quest.title}</h3>
                      <span className="text-sm text-foreground/60">{getTimeLeft(quest)}</span>
                    </div>
                    <p className="text-sm text-foreground/60 mt-1">{quest.description}</p>
                    
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{quest.currentProgress} / {quest.targetValue}</span>
                        <span>{Math.round(getProgressPercentage(quest))}%</span>
                      </div>
                      <div className="h-2 bg-foreground/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${getProgressPercentage(quest)}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>

                    {quest.reward && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {quest.reward.points && (
                          <div className="text-sm bg-foreground/20 px-2 py-1 rounded-lg flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            <span>+{quest.reward.points}</span>
                          </div>
                        )}
                        {quest.reward.xp && (
                          <div className="text-sm bg-foreground/20 px-2 py-1 rounded-lg flex items-center gap-1">
                            <Trophy className="w-4 h-4" />
                            <span>+{quest.reward.xp} XP</span>
                          </div>
                        )}
                        {quest.reward.badgeId && BADGES[quest.reward.badgeId] && (
                          <div className="text-sm bg-foreground/20 px-2 py-1 rounded-lg flex items-center gap-1">
                            <span>{BADGES[quest.reward.badgeId].icon}</span>
                            <span>{BADGES[quest.reward.badgeId].name}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {quest.isCompleted && !quest.reward.claimed && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onClaimReward(quest)}
                        className="mt-3 w-full py-2 bg-primary text-white rounded-lg text-sm font-medium"
                      >
                        Получить награду
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QuestsPanel; 