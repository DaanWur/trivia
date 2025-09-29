import { Question } from './question.ts';

export class BooleanQuestion extends Question {
    correctAnswer: boolean;
    labelTrue: string | undefined;
    labelFalse: string | undefined;

    constructor(
        text: string,
        categoryName: string,
        correctAnswer: boolean,
        points = 0,
        labelTrue: string = 'True',
        labelFalse: string = 'False',
        difficulty?: 'easy' | 'medium' | 'hard'
    ) {
        super(text, categoryName, 'boolean', points, difficulty);
        this.correctAnswer = correctAnswer;
        this.labelTrue = labelTrue;
        this.labelFalse = labelFalse;
    }

    checkAnswer(candidate: boolean): boolean {
        return candidate === this.correctAnswer;
    }
}
