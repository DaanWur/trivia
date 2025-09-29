import {
    NotFoundError,
    InvalidOperationError,
    DuplicateError
} from '../entities/Errors/errors.ts';
import {
    BooleanQuestion,
    Match,
    MultipleChoice,
    Player,
    Question,
    type ID
} from '../entities/index.ts';
import type { ApiQuestion } from '../types/api-question.ts';
import type { ChosenAnswer } from '../types/chosen-answer.ts';
import type Answer from '../types/multiple-choice-answer.ts';
import { decodeHTML } from 'entities';
import { Logger } from './logger.service.ts';

export default class MatchService {
    constructor(private match: Match) {}

    public initialize(match: Match) {
        this.match = match;
    }

    /**
     * Populate the match's question pool from API question data.
     * Creates Question instances and stores them in match.questionPool keyed by id.
     * @param questions - array of ApiQuestion objects from the API
     */
    createQuestionPool(questions: ApiQuestion[]) {
        // The official number of rounds is the total questions minus the 4 skip-buffer questions
        this.match.numberOfRounds = questions.length - 4;

        for (const questionData of questions) {
            const newQuestion = this.createQuestionFromData(questionData);
            if (newQuestion) {
                this.match.questionPool.set(newQuestion.id, newQuestion);
            }
        }

        this.match.numberOfRounds = questions.length / 2;
    }

    private createQuestionFromData(
        questionData: ApiQuestion
    ): MultipleChoice | BooleanQuestion | undefined {
        if (
            !questionData.type ||
            !questionData.question ||
            !questionData.correct_answer ||
            !questionData.incorrect_answers
        ) {
            Logger.warning('Skipping malformed question object.');
            return undefined;
        }

        if (questionData.type === 'multiple') {
            const answers: Array<Answer> = this.createAnswers(questionData).map(
                (a) => ({
                    text: decodeHTML(a.text),
                    isCorrect: a.isCorrect
                })
            );
            const options = this.shuffleAnswers(answers);

            return new MultipleChoice(
                decodeHTML(questionData.question),
                decodeHTML(questionData.category),
                1,
                options,
                questionData.difficulty
            );
        } else if (questionData.type === 'boolean') {
            const correct =
                decodeHTML(questionData.correct_answer) === 'True' ||
                decodeHTML(questionData.correct_answer) === 'true';
            return new BooleanQuestion(
                decodeHTML(questionData.question),
                decodeHTML(questionData.category),
                correct,
                1,
                'True',
                'False',
                questionData.difficulty
            );
        }
        return undefined;
    }

    private shuffleAnswers(answers: Answer[]): Map<number, Answer> {
        for (let i = answers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = answers[i]!;
            answers[i] = answers[j]!;
            answers[j] = tmp;
        }
        const options = new Map<number, Answer>();
        answers.forEach((a, idx) => options.set(idx + 1, a));
        return options;
    }

    private createAnswers(questionData: ApiQuestion): Answer[] {
        return [
            { text: questionData.correct_answer, isCorrect: true },
            ...questionData.incorrect_answers.map((t) => ({
                text: t,
                isCorrect: false
            }))
        ];
    }

    /**
     * Handle a player's answer to their currently assigned question.
     * Awards points when correct, clears the player's assigned question,
     * and assigns the next available question to the player (if any).
     * @param playerId - id of the player answering
     * @param correct - whether the player's answer was correct
     * @returns an object with awarded points and optionally the next Question
     */
    answerQuestion(
        playerId: ID,
        correct: boolean
    ): { awarded: number; nextQuestion?: Question | undefined } {
        if (!this.match.hasPlayer(playerId))
            throw new NotFoundError(
                `player ${playerId} not part of match ${this.match.id}`
            );

        const qid = this.match.assigned[playerId];
        if (!qid)
            throw new InvalidOperationError('no question assigned to player');
        const q = this.match.questionPool.get(qid) ?? undefined;

        let awarded = 0;
        if (correct) awarded = q ? q.points : 0;
        this.match.assigned[playerId] = null;
        const next = this.assignQuestionToPlayer(playerId);
        return { awarded, nextQuestion: next };
    }

    /**
     * Pass the currently assigned question from one player to another.
     * Clears the question for the fromPlayer and assigns the same question id
     * to the toPlayer.
     * @param fromPlayerId - id of the player passing the question
     * @param toPlayerId - id of the player receiving the question
     */
    passQuestion(fromPlayerId: ID, toPlayerId: ID) {
        if (
            !this.match.hasPlayer(fromPlayerId) ||
            !this.match.hasPlayer(toPlayerId)
        )
            throw new NotFoundError('player not part of match');
        const qid = this.match.assigned[fromPlayerId];
        if (!qid)
            throw new InvalidOperationError(
                'no question assigned to fromPlayer'
            );
        this.match.assigned[fromPlayerId] = null;
        this.match.assigned[toPlayerId] = qid;
        this.match.passedQuestion = qid;
    }

    /**
     * Skip the player's current question (drop it) and assign the next
     * available question to them.
     * @param playerId - id of the player skipping their question
     * @returns the newly assigned Question or undefined if none available
     */
    skipQuestion(playerId: ID): Question | undefined {
        if (!this.match.hasPlayer(playerId))
            throw new NotFoundError(
                `player ${playerId} not part of match ${this.match.id}`
            );
        const current = this.match.assigned[playerId];
        // drop current
        this.match.assigned[playerId] = null;
        // assign next
        return this.assignQuestionToPlayer(playerId);
    }

    /**
     * Assign the next available question from the pool to the given player.
     * @param playerId - id of the player to assign a question to
     * @returns the assigned Question or undefined if none available
     */
    assignQuestionToPlayer(playerId: ID): Question | undefined {
        if (!this.match.hasPlayer(playerId))
            throw new NotFoundError(
                `player ${playerId} not part of match ${this.match.id}`
            );
        const q = this.drawQuestion();
        if (!q) return undefined;
        // record the assignment in the match and mark the question assigned
        this.match.assigned[playerId] = q.id;
        try {
            q.assignTo(playerId);
        } catch (e) {
            // ignore if already assigned or invalid; assignment is recorded on the match
        }
        return q;
    }

    /**
     * Handles the logic for a player's turn, including answering, skipping, or passing.
     * This is a non-UI method to keep the logic separate from the presentation.
     * @param playerId The ID of the player whose turn it is.
     * @param answer The answer provided by the player.
     * @param q The question that was answered.
     * @returns An object indicating the outcome of the turn.
     */
    handlePlayerAnswer(
        playerId: ID,
        answer: ChosenAnswer,
        q: Question
    ): {
        nextPlayerId?: ID;
        pointsAwarded: number;
        questionPassed: boolean;
        skipsRemaining: number;
        turnOver: boolean;
    } {
        const player = this.match.players.find((p) => p.id === playerId);
        if (!player) {
            throw new NotFoundError(`Player with ID ${playerId} not found.`);
        }

        const isPassedQuestion = this.match.passedQuestion === q.id;

        if (answer.correct) {
            const points = this.recordAnswer(playerId, true, q);
            return {
                pointsAwarded: points,
                questionPassed: false,
                skipsRemaining: player.skips,
                turnOver: !isPassedQuestion,
            };
        }

        // Incorrect answer
        if (isPassedQuestion) {
            // Second player answered incorrectly
            this.recordAnswer(playerId, false, q);
            return {
                pointsAwarded: 0,
                questionPassed: false,
                skipsRemaining: player.skips,
                turnOver: false,
            };
        } else {
            // First player answered incorrectly, pass the question
            const nextPlayer = this.match.players.find((p) => p.id !== playerId);
            if (nextPlayer) {
                this.passQuestion(playerId, nextPlayer.id);
                return {
                    nextPlayerId: nextPlayer.id,
                    pointsAwarded: 0,
                    questionPassed: true,
                    skipsRemaining: player.skips,
                    turnOver: false,
                };
            }
        }

        // Should not be reached in a two-player game
        this.recordAnswer(playerId, false, q);
        return {
            pointsAwarded: 0,
            questionPassed: false,
            skipsRemaining: player.skips,
            turnOver: true,
        };
    }

    /**
     * Record an answer for a player. If a Question instance is provided use it
     * to compute points; otherwise attempt to resolve via the match.assigned map.
     * Returns the number of points awarded.
     */
    recordAnswer(playerId: ID, correct: boolean, question?: Question): number {
        const player = this.match.players.find((p) => p.id === playerId);
        if (!player) {
            throw new NotFoundError(
                `player ${playerId} not part of match ${this.match.id}`
            );
        }

        let q: Question | undefined = question;
        if (!q) {
            const qid = this.match.assigned[playerId];
            if (!qid)
                throw new InvalidOperationError(
                    'no question assigned to player'
                );
            q = this.match.questionPool.get(qid) ?? undefined;
        }

        if (q) {
            this.match.questionPool.delete(q.id);
            this.match.questionsResolved++;
        }

        if (this.match.passedQuestion === q?.id) {
            this.match.passedQuestion = null;
        }

        const awarded = correct && q ? q.points : 0;
        if (awarded > 0) {
            player.addPoints(awarded);
        }

        // clear assignment
        this.match.assigned[playerId] = null;

        // try to mark question answered if possible
        try {
            if (q) q.markAnswered(playerId);
        } catch (e) {
            // ignore marking errors
        }

        return awarded;
    }

    /**
     * Draw (remove) the next question from the match's question pool iterator.
     * Returns undefined when the pool is empty.
     */
    drawQuestion(): Question | undefined {
        const it = this.match.questionPool.values();
        const next = it.next();
        if (next.done) return undefined;
        const q = next.value;
        return q;
    }

    /**
     * Start the match. Validates status and minimum player count then sets
     * status to 'in-progress'.
     */
    start() {
        if (this.match.status !== 'waiting')
            throw new InvalidOperationError('Match is not in waiting state');
        if (this.match.players.length < 2)
            throw new InvalidOperationError(
                'Need at least two players to start the match'
            );
        this.match.status = 'in-progress';
    }

    /**
     * Add a player to the match. Validates match state and duplicate players.
     * @param player - Player instance to add
     */
    addPlayer(player: Player) {
        if (!player) throw new InvalidOperationError('player required');
        if (this.match.hasPlayer(player.id))
            throw new DuplicateError(`player ${player.id} already in match`);

        this.match.players.push(player);

        // auto-assign question if match already started
        if (this.match.status === 'in-progress') {
            const q = this.assignQuestionToPlayer(player.id);
            if (!q)
                throw new InvalidOperationError(
                    'no available questions to assign'
                );
        }
    }

    /**
     * Remove a player from the match. Validates match state and player existence.
     * @param playerId - id of the player to remove
     */
    removePlayer(playerId: ID) {
        if (this.match.status === 'in-progress')
            throw new InvalidOperationError('cannot remove player during match');
        const idx = this.match.players.findIndex((p) => p.id === playerId);
        if (idx === -1) throw new NotFoundError(`player ${playerId} not found`);

        this.match.players.splice(idx, 1);
    }

    determineWinner(): Player | undefined {
        if (this.match.players.length === 0) {
            return undefined;
        }

        let winner = this.match.players[0];
        if (!winner) {
            return undefined;
        }

        for (const player of this.match.players) {
            if (player.points > winner.points) {
                winner = player;
            }
        }

        return winner;
    }
}
