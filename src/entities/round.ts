import type { ID } from "./types.js";
import { InvalidOperationError, NotFoundError } from "./Errors/errors.js";
import { v4 as uuidv4 } from "uuid";
import type { Question } from "./question/question.ts";

export class Round {
  id: ID;
  matchId: ID;
  questions: Map<ID, Question>;
  winner?: ID | null;
  pointsByPlayer: Record<ID, number>;
  createdAt: string;

  constructor(matchId: ID, questions: Map<ID, Question> = new Map()) {
    this.id = uuidv4();
    this.matchId = matchId;
    this.questions = questions;
    this.winner = null;
    this.pointsByPlayer = {};
    this.createdAt = new Date().toISOString();
  }

  addQuestion(question: Question) {
    if (!question?.id) throw new InvalidOperationError("questionId required");
    if (this.questions.has(question.id))
      throw new InvalidOperationError(
        `Question ${question.id} already added to round ${this.id}`
      );
    this.questions.set(question.id, question);
  }

  addPointsForPlayer(playerId: ID, points: number) {
    if (!playerId)
      throw new InvalidOperationError("playerId required to add points");
    if (!Number.isFinite(points))
      throw new InvalidOperationError("points must be a finite number");
    this.pointsByPlayer[playerId] =
      (this.pointsByPlayer[playerId] || 0) + points;
  }

  skipQuestion(questionId: ID) {
    if (!questionId) throw new InvalidOperationError("questionId required");
    if (!this.questions.has(questionId))
      throw new NotFoundError(
        `Question ${questionId} not found in round ${this.id}`
      );
    this.questions.delete(questionId);
  }

  passToOtherPlayer(questionId: ID, players: [ID, ID], currentPlayerId?: ID) {
    if (!questionId) throw new InvalidOperationError("questionId required");
    if (!Array.isArray(players) || players.length !== 2)
      throw new InvalidOperationError("players must be a tuple of two IDs");

    const q = this.questions.get(questionId);
    if (!q)
      throw new NotFoundError(
        `Question ${questionId} not found in round ${this.id}`
      );

    const current = currentPlayerId ?? q.assignedTo;
    if (!current)
      throw new InvalidOperationError(
        "currentPlayerId required or question must be assigned"
      );

    const [a, b] = players;
    if (current !== a && current !== b)
      throw new NotFoundError(
        `current player ${current} not part of provided players`
      );

    const other = current === a ? b : a;
    q.assignTo(other);
  }

  setWinner(playerId: ID | null) {
    // allow null to clear
    if (playerId === undefined)
      throw new InvalidOperationError(
        "playerId must be provided (or null to clear)"
      );
    this.winner = playerId;
  }

  toJSON() {
    return {
      id: this.id,
      matchId: this.matchId,
      questions: this.questions,
      winner: this.winner,
      pointsByPlayer: this.pointsByPlayer,
      createdAt: this.createdAt,
    };
  }
}
