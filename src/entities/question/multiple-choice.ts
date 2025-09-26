import type Answer from '../../types/multiple-choice-answer.ts';
import { Question } from './question.ts';

export class MultipleChoice extends Question {
    options: Map<number, Answer>;

    constructor(
        text: string,
        categoryName: string,
        points = 0,
        options: Map<number, Answer>,
        difficulty?: 'easy' | 'medium' | 'hard'
    ) {
        super(text, categoryName, 'multiple', points, difficulty);
        this.options = options;
    }
    checkAnswer(userChoice: number): boolean {
        const answer = this.options.get(userChoice);
        return answer ? answer.isCorrect : false;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            options: this.options
        };
    }
}
