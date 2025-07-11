export const calculateLevel = (xp: number): number => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export const calculateXpForNextLevel = (currentLevel: number): number => {
  return Math.pow(currentLevel, 2) * 100;
};

export const calculateProgress = (xp: number, currentLevel: number): number => {
  const currentLevelXp = Math.pow(currentLevel - 1, 2) * 100;
  const nextLevelXp = Math.pow(currentLevel, 2) * 100;
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.min(Math.max(progress, 0), 100);
};

export const getXpReward = (difficulty: "easy" | "medium" | "hard"): number => {
  switch (difficulty) {
    case "easy":
      return 20;
    case "medium":
      return 40;
    case "hard":
      return 80;
    default:
      return 20;
  }
}; 