import type { ID, MatchStatus } from './types.js';
import { NotFoundError } from './Errors/errors.js';
import { v4 as uuidv4 } from 'uuid';
import type { Player } from './player.ts';
import type { MultipleChoice } from './question/multiple-choice.ts';
import type { BooleanQuestion } from './question/true-false.ts';

export class Match {
    id: ID;
    players: Player[];
    numberOfRounds: number;
    status: MatchStatus;
    createdAt: string;
    questionPool: Map<ID, MultipleChoice | BooleanQuestion>;
    assigned: Record<ID, ID | null>;
    currentPlayer: Player | null = null;

    constructor(players: Player[] = [], numberOfRounds = 1) {
        this.id = uuidv4();
        this.players = players;
        this.numberOfRounds = 0;
        this.status = 'waiting';
        this.createdAt = new Date().toISOString();
        this.questionPool = new Map();
        this.assigned = {};
    }

    hasPlayer(playerId: ID) {
        return this.players.some((p) => p.id === playerId);
    }

    setCurrentPlayer(playerId: ID) {
        const player = this.players.find((p) => p.id === playerId);
        if (!player) {
            throw new NotFoundError(
                `Player with ID ${playerId} not found in match.`
            );
        }
        this.currentPlayer = player;
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

            leadingPlayer: this.leadingPlayer
                ? typeof this.leadingPlayer.toJSON === 'function'
                    ? this.leadingPlayer.toJSON()
                    : { id: this.leadingPlayer.id }
                : null,
            roundsLeft: this.roundsLeft,
            winner: this.winner
                ? typeof this.winner.toJSON === 'function'
                    ? this.winner.toJSON()
                    : { id: this.winner.id }
                : null,
            status: this.status,
            createdAt: this.createdAt
        };
    }
}
