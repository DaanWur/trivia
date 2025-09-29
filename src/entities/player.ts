import { User } from './user.js';

export class Player extends User {
    name: string;
    points: number;
    skips: number;
    roundsWins: number;

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
}
