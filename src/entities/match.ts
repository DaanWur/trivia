import { type MatchMemento } from '../interfaces/match-memento.ts';
import { Player } from './player.ts';
import { type Question } from './question/question.ts';
import { type ID } from './types.ts';
import { ConcreteMatchMemento } from './concrete-match-memento.ts';

export class Match {
    public id: ID;
    public players: Player[] = [];
    public questionPool: Map<ID, Question> = new Map();
    public questionBuffer: Question[] = [];
    public assigned: Record<ID, ID | null> = {};
    public status: 'waiting' | 'in-progress' | 'finished' = 'waiting';
    public passedQuestion: ID | null = null;
    public questionsResolved = 0;
    public numberOfRounds: number;
    public createdAt: string;
    private currentPlayer: Player | null = null;
    public currentRound = 1;

    constructor(id?: ID) {
        this.id = id ?? crypto.randomUUID();
        this.numberOfRounds = 0;
        this.createdAt = new Date().toISOString();
    }

    public addPlayer(player: Player) {
        this.players.push(player);
    }

    public hasPlayer(playerId: ID): boolean {
        return this.players.some((p) => p.id === playerId);
    }

    public setCurrentPlayer(player: Player) {
        this.currentPlayer = player;
    }

    public getCurrentPlayer(): Player | null {
        return this.currentPlayer;
    }

    save(): MatchMemento {
        return new ConcreteMatchMemento(this);
    }

    restore(memento: MatchMemento) {
        const state = memento.getState() as Match;
        this.id = state.id!;
        this.players = state.players!.map((pState: any) => {
            const player = new Player(pState.name);
            player.id = pState.id;
            player.points = pState.points;
            player.skips = pState.skips;
            return player;
        });
        this.questionPool = state.questionPool!;
        this.assigned = state.assigned!;
        this.status = state.status!;
        this.passedQuestion = state.passedQuestion!;
        this.questionsResolved = state.questionsResolved!;
        this.numberOfRounds = state.numberOfRounds!;
        this.createdAt = state.createdAt!;
        this.currentRound = state.currentRound!;
        if (state.getCurrentPlayer()) {
            const p = state.getCurrentPlayer()!;
            const player = new Player(p.name);
            player.id = p.id;
            player.points = p.points;
            player.skips = p.skips;
            this.currentPlayer = player;
        } else {
            this.currentPlayer = null;
        }
    }

    private getState() {
        return {
            id: this.id,
            players: this.players,
            questionPool: this.questionPool,
            assigned: this.assigned,
            status: this.status,
            passedQuestion: this.passedQuestion,
            questionsResolved: this.questionsResolved,
            numberOfRounds: this.numberOfRounds,
            createdAt: this.createdAt,
            currentRound: this.currentRound,
            currentPlayer: this.currentPlayer,
            questionBuffer: this.questionBuffer,
        };
    }
}
