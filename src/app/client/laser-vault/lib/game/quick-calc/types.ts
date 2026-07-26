/**
 * Type definitions for Quick Calc game engine
 */

export interface GameState {
  status: 'idle' | 'playing' | 'paused' | 'won' | 'lost';
  score: number;
  multiplier: number;
  combo: number;
  questionsAnswered: number;
  timeRemaining: number;
  currentQuestion: Question | null;
  difficulty: GameDifficulty;
}

export interface Question {
  id: string;
  display: string;
  answer: number;
  level: number;
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
}

export type GameDifficulty = 'facile' | 'intermédiaire' | 'difficile';

export interface GameConfig {
  initialBet: number;
  challengeId: string | null;
  challengeFee: number | null;
  difficulty: GameDifficulty;
}

export interface SceneState {
  current: 'menu' | 'playing' | 'results';
  previousScene: string | null;
}

export interface TimerConfig {
  initialSeconds: number;
  decrementMs: number;
  minSeconds: number;
}

export interface DifficultyConfig {
  baseTime: number;
  multiplierProgression: number[];
  questionLevelThresholds: number[];
}

export interface AnimationFrame {
  id: string;
  timestamp: number;
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  properties: Record<string, number>;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifespan: number;
  type: 'spark' | 'combo' | 'score' | 'multiplier';
}

export interface SoundEffect {
  type: 'correct' | 'incorrect' | 'combo' | 'levelup' | 'gameover' | 'beep' | 'win';
  volume: number;
  pitch?: number;
  duration?: number;
}

export interface HapticPattern {
  type: 'light' | 'medium' | 'heavy' | 'success' | 'failure';
  pattern: number[];
}

export interface StatisticsSnapshot {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  maxCombo: number;
  averageTime: number;
  totalTime: number;
}

export interface GameResult {
  finalScore: number;
  finalMultiplier: number;
  questionsAnswered: number;
  finalCombo: number;
  earnings: number;
  statistics: StatisticsSnapshot;
}
