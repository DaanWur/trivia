import type { Match } from './match.ts';
import type { MatchMemento } from '../interfaces/match-memento.ts';

export class Caretaker {
    private mementos: MatchMemento[] = [];
    private matchOriginator: Match;

    constructor(originator: Match) {
        this.matchOriginator = originator;
    }

    public backup(): void {
        console.log(`Caretaker: Saving Originator's state...`);
        this.mementos.push(this.matchOriginator.save());
    }

    public undo(): void {
        if (!this.mementos.length) {
            return;
        }
        const memento = this.mementos.pop();

        if (memento) {
            console.log(`Caretaker: Restoring state to: ${memento.getName()}`);
            this.matchOriginator.restore(memento);
        }
    }

    public showHistory(): void {
        console.log(`Caretaker: Here's the list of mementos:`);
        for (const memento of this.mementos) {
            console.log(memento.getName());
        }
    }
}
