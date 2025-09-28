import type { MatchMemento } from '../interfaces/match-memento.ts';
import type { Match } from './match.ts';

export class ConcreteMatchMemento implements MatchMemento {
    private state: Partial<Match>;
    private date: string;

    constructor(state: Match) {
        this.state = state;
        this.date = new Date().toISOString();
    }

    getState(): Partial<Match> {
        return this.state;
    }

    getName(): string {
        return `Match- round #${this.state.currentRound} `;
    }

    getDate(): string {
        return this.date;
    }
}
