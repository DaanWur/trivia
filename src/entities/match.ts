import type { ID, MatchStatus } from './types.js';
import { NotFoundError } from './Errors/errors.js';
import { v4 as uuidv4 } from 'uuid';
import { Player } from './player.ts';
import type { MultipleChoice } from './question/multiple-choice.ts';
import type { BooleanQuestion } from './question/boolean-question.ts';
import type { MatchMemento } from '../interfaces/match-memento.ts';
import { ConcreteMatchMemento } from './concrete-match-memento.ts';

export class Match {
    id: ID;
    players: Player[];
    numberOfRounds: number;
    status: MatchStatus;
    createdAt: string;
    questionPool: Map<ID, MultipleChoice | BooleanQuestion>;
    assigned: Record<ID, ID | null>;
    currentPlayer: Player | null = null;
    currentRound: number = 1;
    passedQuestion: ID | null = null;

    constructor(players: Player[] = [], numberOfRounds = 1) {
        this.id = uuidv4();
        this.players = players;
        this.numberOfRounds = 0;
        this.status = 'waiting';
        this.createdAt = new Date().toISOString();
        this.questionPool = new Map();
        this.assigned = {};
    }

    save(): MatchMemento {
        return new ConcreteMatchMemento(this);
    }

    restore(memento: MatchMemento) {
        const state = memento.getState();
        if (!state.id) return;

        this.id = state.id;
        this.status = state.status!;
        this.createdAt = state.createdAt!;
        this.numberOfRounds = state.numberOfRounds!;
        this.assigned = state.assigned!;
        this.questionPool = new Map(Object.entries(state.questionPool!));
        this.currentRound = state.currentRound ?? 1;
        this.passedQuestion = state.passedQuestion ?? null;

        if (state.players) {
            this.players = state.players.map((p) => {
                const player = new Player(p.name);
                player.id = p.id;
                player.points = p.points;
                player.skips = p.skips;
                player.roundsWins = p.roundsWins;
                return player;
            });
        }

        if (state.currentPlayer) {
            const p = state.currentPlayer;
            const player = new Player(p.name);
            player.id = p.id;
            player.points = p.points;
            player.skips = p.skips;
            player.roundsWins = p.roundsWins;
            this.currentPlayer = player;
        } else {
            this.currentPlayer = null;
        }
    }

    hasPlayer(playerId: ID) {
        return this.players.some((p) => p.id === playerId);
    }

    setCurrentPlayer(player: Player) {
        const foundPlayer = this.players.find((p) => p.id === player.id);
        if (!foundPlayer) {
            throw new NotFoundError(
                `Player with ID ${player.id} not found in match.`
            );
        }
        this.currentPlayer = foundPlayer;
    }

    getCurrentPlayer(): Player | null {
        return this.currentPlayer;
    }

    toJSON() {
        return {
            id: this.id,
            players: this.players.map((p) =>
                typeof p.toJSON === 'function' ? p.toJSON() : { id: p.id }
            ),
            numberOfRounds: this.numberOfRounds,
            status: this.status,
            createdAt: this.createdAt,
            questionPool: Object.fromEntries(this.questionPool),
            assigned: this.assigned,
            currentPlayer: this.currentPlayer,
            passedQuestion: this.passedQuestion
        };
    }
}
