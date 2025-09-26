import type { ID } from './types.js';
import { User } from './user.js';

export class Player extends User {
    name: string;
    points: number; // integer >= 0
    skips: number; // integer >= 0, default 2
    roundsWins: number; // integer >= 0

    constructor(name: string) {
        super();
        this.name = name;
        this.points = 0;
        this.skips = 2;
        this.roundsWins = 0;
    }

    addPoints(n: number) {
        this.points += n;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            name: this.name,
            points: this.points,
            skips: this.skips,
            roundsWins: this.roundsWins
        };
    }
}
