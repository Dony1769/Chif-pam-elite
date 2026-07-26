/**
 * Question Generator Engine
 * Generates math problems based on difficulty level and progression
 */

import { Question } from './types';

export class QuestionGenerator {
  private questionCount = 0;

  generate(): Question {
    const level = this.getLevel();
    const operation = this.selectOperation(level);
    const { display, answer } = this.createProblem(operation, level);

    const question: Question = {
      id: `q-${this.questionCount++}`,
      display,
      answer,
      level,
      operation,
    };

    return question;
  }

  private getLevel(): number {
    if (this.questionCount < 4) return 1;
    if (this.questionCount < 8) return 2;
    if (this.questionCount < 12) return 3;
    return 4;
  }

  private selectOperation(level: number): Question['operation'] {
    const rand = Math.random();
    if (level === 1) return rand > 0.5 ? 'add' : 'subtract';
    if (level === 2) return rand > 0.5 ? 'multiply' : rand > 0.25 ? 'add' : 'subtract';
    if (level === 3) {
      if (rand > 0.75) return 'divide';
      if (rand > 0.5) return 'multiply';
      return rand > 0.25 ? 'add' : 'subtract';
    }
    return 'multiply';
  }

  private createProblem(
    operation: Question['operation'],
    level: number,
  ): { display: string; answer: number } {
    switch (operation) {
      case 'add':
        return this.additionProblem(level);
      case 'subtract':
        return this.subtractionProblem(level);
      case 'multiply':
        return this.multiplicationProblem(level);
      case 'divide':
        return this.divisionProblem(level);
      default:
        return { display: '2 + 2', answer: 4 };
    }
  }

  private additionProblem(level: number): { display: string; answer: number } {
    const [min, max] = level <= 2 ? [1, 9] : [10, 99];
    const a = Math.floor(Math.random() * (max - min + 1)) + min;
    const b = Math.floor(Math.random() * (max - min + 1)) + min;
    return { display: `${a} + ${b}`, answer: a + b };
  }

  private subtractionProblem(level: number): { display: string; answer: number } {
    const [min, max] = level <= 2 ? [1, 9] : [10, 99];
    const a = Math.floor(Math.random() * (max - min + 1)) + min;
    const b = Math.floor(Math.random() * (max - min + 1)) + min;
    const left = Math.max(a, b);
    const right = Math.min(a, b);
    return { display: `${left} - ${right}`, answer: left - right };
  }

  private multiplicationProblem(level: number): { display: string; answer: number } {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    return { display: `${a} × ${b}`, answer: a * b };
  }

  private divisionProblem(level: number): { display: string; answer: number } {
    const answer = Math.floor(Math.random() * (level <= 2 ? 9 : 19)) + 2;
    const divisor = Math.floor(Math.random() * (level <= 2 ? 5 : 9)) + 2;
    const dividend = answer * divisor;
    return { display: `${dividend} ÷ ${divisor}`, answer };
  }

  reset(): void {
    this.questionCount = 0;
  }
}

export const questionGenerator = new QuestionGenerator();
