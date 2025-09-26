import type { ID, MatchStatus } from "./types.js";
import { NotFoundError } from "./Errors/errors.js";
import { v4 as uuidv4 } from "uuid";
import type { Player } from "./player.ts";
import type { Question } from "./question/question.ts";

export class Match {
  id: ID;
  players: Player[];
  numberOfRounds: number;
  leadingPlayer?: Player | null;
  roundsLeft: number;
  winner?: Player | null;
  status: MatchStatus;
  createdAt: string;
  questionPool: Map<ID, Question>;
  assigned: Record<ID, ID | null>;

  constructor(players: Player[] = [], numberOfRounds = 1) {
    this.id = uuidv4();
    this.players = players;
    this.numberOfRounds = 0;
    this.leadingPlayer = null;
    this.winner = null;
    this.status = "waiting";
    this.createdAt = new Date().toISOString();
    this.questionPool = new Map();
    this.roundsLeft = 0; // Math.max(0, numberOfRounds - this.questionPool.size);
    this.assigned = {};
  }

  hasPlayer(playerId: ID) {
    return this.players.some((p) => p.id === playerId);
  }

  setLeadingPlayer(player: Player | null) {
    if (player === null) {
      this.leadingPlayer = null;
      return;
    }
    if (!this.hasPlayer(player.id))
      throw new NotFoundError(
        `player ${player.id} not part of match ${this.id}`
      );
    this.leadingPlayer = player;
  }

  setWinner(player: Player | null) {
    if (player === null) {
      this.winner = null;
      return;
    }
    if (!this.hasPlayer(player.id))
      throw new NotFoundError(
        `player ${player.id} not part of match ${this.id}`
      );
    this.winner = player;
    this.status = "finished";
  }

  toJSON() {
    return {
      id: this.id,
      players: this.players.map((p) =>
        typeof p.toJSON === "function" ? p.toJSON() : { id: p.id }
      ),
      numberOfRounds: this.numberOfRounds,
      rounds: this.rounds.map((r) =>
        typeof r.toJSON === "function" ? r.toJSON() : { id: r.id }
      ),
      leadingPlayer: this.leadingPlayer
        ? typeof this.leadingPlayer.toJSON === "function"
          ? this.leadingPlayer.toJSON()
          : { id: this.leadingPlayer.id }
        : null,
      roundsLeft: this.roundsLeft,
      winner: this.winner
        ? typeof this.winner.toJSON === "function"
          ? this.winner.toJSON()
          : { id: this.winner.id }
        : null,
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}
