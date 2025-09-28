import type { Match } from '../entities/match.ts';

export interface MatchMemento {
    getState(): Partial<Match>;
    getName(): string;
    getDate(): string;
}
