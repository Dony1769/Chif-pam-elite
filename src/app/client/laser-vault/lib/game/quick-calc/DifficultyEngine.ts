/**
 * Difficulty Engine
 * Manages game difficulty progression and settings
 */

import { GameDifficulty, DifficultyConfig } from './types';

export class DifficultyEngine {
  private difficulty: GameDifficulty = 'intermédiaire';
  private baseConfig: Record<GameDifficulty, DifficultyConfig> = {
    facile: {
      baseTime: 15000,
      multiplierProgression: [0.5, 0.7, 1.0, 1.5, 2.0],
      questionLevelThresholds: [4, 8, 12],
    },
    intermédiaire: {
      baseTime: 8000,
      multiplierProgression: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0],
      questionLevelThresholds: [4, 8, 12],
    },
    difficile: {
      baseTime: 3000,
      multiplierProgression: [0.3, 0.5, 0.7, 1.0, 1.5, 2.0, 3.0, 4.0],
      questionLevelThresholds: [2, 6, 10],
    },
  };

  setDifficulty(difficulty: GameDifficulty): void {
    this.difficulty = difficulty;
  }

  getDifficulty(): GameDifficulty {
    return this.difficulty;
  }

  getConfig(): DifficultyConfig {
    return this.baseConfig[this.difficulty];
  }

  getBaseTime(): number {
    return this.getConfig().baseTime;
  }

  getMultiplierProgression(): number[] {
    return this.getConfig().multiplierProgression;
  }

  getTimePerQuestion(questionNumber: number): number {
    const baseTime = this.getBaseTime();
    const reduction = Math.max(0, (questionNumber - 1) * 500);
    return Math.max(2000, baseTime - reduction);
  }

  getQuestionLevel(questionNumber: number): 1 | 2 | 3 | 4 {
    const thresholds = this.getConfig().questionLevelThresholds;
    if (questionNumber < thresholds[0]) return 1;
    if (questionNumber < thresholds[1]) return 2;
    if (questionNumber < thresholds[2]) return 3;
    return 4;
  }

  getHouseEdge(): number {
    const edges: Record<GameDifficulty, number> = {
      facile: 0.1,
      intermédiaire: 0.15,
      difficile: 0.2,
    };
    return edges[this.difficulty];
  }
}

export const difficultyEngine = new DifficultyEngine();
