import type { ID, MatchStatus } from "./types.js";
import {
  DuplicateError,
  InvalidOperationError,
  NotFoundError,
} from "./Errors/errors.js";
import { v4 as uuidv4 } from "uuid";
import type { Player } from "./player.ts";
import type { Round } from "./round.ts";

export class Match {
  id: ID;
  players: Player[];
  numberOfRounds: number;
  rounds: Round[];
  leadingPlayer?: Player | null;
  roundsLeft: number;
  winner?: Player | null;
  status: MatchStatus;
  createdAt: string;

  constructor(players: Player[] = [], numberOfRounds = 1, createdAt?: string) {
    this.id = uuidv4();
    if (numberOfRounds < 1)
      throw new InvalidOperationError("numberOfRounds must be >= 1");
    this.players = players;
    this.numberOfRounds = numberOfRounds;
    this.rounds = [];
    this.leadingPlayer = null;
    this.roundsLeft = Math.max(0, numberOfRounds - this.rounds.length);
    this.winner = null;
    this.status = "waiting";
    this.createdAt = createdAt ?? new Date().toISOString();
  }

  addPlayer(player: Player) {
    if (!player) throw new InvalidOperationError("player required");
    if (this.players.some((p) => p.id === player.id))
      throw new DuplicateError(
        `player ${player.id} already part of match ${this.id}`
      );
    if (this.status !== "waiting")
      throw new InvalidOperationError(
        "Cannot add players unless match is in waiting status"
      );
    this.players.push(player);
  }

  hasPlayer(playerId: ID) {
    return this.players.some((p) => p.id === playerId);
  }

  setNumberOfRounds(n: number) {
    if (!Number.isInteger(n) || n < 1)
      throw new InvalidOperationError("numberOfRounds must be an integer >= 1");
    if (this.rounds.length > n)
      throw new InvalidOperationError(
        "Cannot set numberOfRounds less than rounds already added"
      );
    this.numberOfRounds = n;
    this.roundsLeft = Math.max(0, this.numberOfRounds - this.rounds.length);
  }

  start() {
    if (this.status !== "waiting")
      throw new InvalidOperationError("Match is not in waiting state");
    if (this.players.length < 2)
      throw new InvalidOperationError(
        "Need at least two players to start the match"
      );
    this.status = "in-progress";
    this.roundsLeft = Math.max(0, this.numberOfRounds - this.rounds.length);
  }

  addRound(round: Round) {
    if (!round) throw new InvalidOperationError("round required");
    if (this.rounds.length >= this.numberOfRounds)
      throw new InvalidOperationError(
        "Cannot add more rounds than numberOfRounds"
      );
    if (this.rounds.includes(round))
      throw new DuplicateError(
        `round ${round.id} already added to match ${this.id}`
      );
    this.rounds.push(round);
    this.roundsLeft = Math.max(0, this.numberOfRounds - this.rounds.length);
  }

  setLeadingPlayer(player: Player | null) {
    if (player === null) {
      this.leadingPlayer = null;
      return;
    }
    if (!this.players.includes(player))
      throw new NotFoundError(
        `player ${player.id} not part of match ${this.id}`
      );
    this.leadingPlayer = player;
  }

  setWinner(player: Player) {
    if (player.id === null) {
      this.winner = null;
      return;
    }
    if (!this.players.includes(player))
      throw new NotFoundError(
        `player ${player.id} not part of match ${this.id}`
      );
    this.winner = player;
    if (player.id !== null) this.status = "finished";
  }

  toJSON() {
    return {
      id: this.id,
      players: this.players,
      numberOfRounds: this.numberOfRounds,
      rounds: this.rounds,
      leadingPlayer: this.leadingPlayer,
      roundsLeft: this.roundsLeft,
      winner: this.winner,
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}
