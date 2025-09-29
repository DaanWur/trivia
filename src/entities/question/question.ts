import { Category } from '../category.ts';
import type { ID } from '../types.js';
import { InvalidOperationError } from '../Errors/errors.js';
import { v4 as uuidv4 } from 'uuid';

export class Question {
    id: ID;
    type: 'multiple' | 'boolean';
    text: string;
    category: Category;
    assignedTo?: ID | null;
    answeredBy?: ID | null;
    points: number;
    createdAt: string;
    difficulty: 'easy' | 'medium' | 'hard' | undefined;

    constructor(
        text: string,
        categoryName: string,
        type: 'multiple' | 'boolean',
        points = 0,
        difficulty?: 'easy' | 'medium' | 'hard'
    ) {
        this.id = uuidv4();
        this.text = text;
        this.category = Category.findOrCreateByName(categoryName);
        this.type = type;
        this.points = points;
        this.createdAt = new Date().toISOString();
        this.difficulty = difficulty;
        this.assignedTo = null;
        this.answeredBy = null;
    }

    assignTo(playerId: ID) {
        if (!playerId)
            throw new InvalidOperationError(
                'playerId required to assign question'
            );
        if (this.assignedTo)
            throw new InvalidOperationError(
                `Question ${this.id} is already assigned to ${this.assignedTo}`
            );
        this.assignedTo = playerId;
    }

    markAnswered(by: ID) {
        if (!by)
            throw new InvalidOperationError(
                'player id required to mark answered'
            );
        if (!this.assignedTo)
            throw new InvalidOperationError(
                `Question ${this.id} has not been assigned`
            );
        if (this.answeredBy)
            throw new InvalidOperationError(
                `Question ${this.id} was already answered by ${this.answeredBy}`
            );
        if (by !== this.assignedTo)
            throw new InvalidOperationError(
                `Player ${by} is not assigned to question ${this.id}`
            );
        this.answeredBy = by;
    }

    toJSON() {
        return {
            id: this.id,
            text: this.text,
            category: this.category.toJSON(),
            assignedTo: this.assignedTo,
            answeredBy: this.answeredBy,
            points: this.points,
            createdAt: this.createdAt
        };
    }
}
