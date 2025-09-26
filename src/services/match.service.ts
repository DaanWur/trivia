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
import type Answer from '../types/multiple-choice-answer.ts';
import { decodeHTML } from 'entities';

export default class MatchService {
    constructor(private match: Match) {}

    /**
     * Populate the match's question pool from API question data.
     * Creates Question instances and stores them in match.questionPool keyed by id.
     * @param questions - array of ApiQuestion objects from the API
     */
    createQuestionPool(questions: ApiQuestion[]) {
        for (const questionData of questions) {
            let newQuestion: MultipleChoice | BooleanQuestion | undefined;
            if (questionData.type === 'multiple') {
                const answers: Array<Answer> = this.createAnswers(
                    questionData
                ).map((a) => ({
                    text: decodeHTML(a.text),
                    isCorrect: a.isCorrect
                }));
                // simple shuffle
                const options = this.shuffleAnswers(answers);

                newQuestion = new MultipleChoice(
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
                newQuestion = new BooleanQuestion(
                    decodeHTML(questionData.question),
                    decodeHTML(questionData.category),
                    correct,
                    1,
                    'True',
                    'False',
                    questionData.difficulty
                );
            }
            if (!newQuestion) continue;

            this.match.questionPool.set(newQuestion.id, newQuestion);
            this.match.numberOfRounds = questions.length / 2;
        }
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
     * Record an answer for a player. If a Question instance is provided use it
     * to compute points; otherwise attempt to resolve via the match.assigned map.
     * Returns the number of points awarded.
     */
    recordAnswer(playerId: ID, correct: boolean, question?: Question): number {
        if (!this.match.hasPlayer(playerId))
            throw new NotFoundError(
                `player ${playerId} not part of match ${this.match.id}`
            );

        let q: Question | undefined = question;
        if (!q) {
            const qid = this.match.assigned[playerId];
            if (!qid)
                throw new InvalidOperationError(
                    'no question assigned to player'
                );
            q = this.match.questionPool.get(qid) ?? undefined;
        }

        const awarded = correct && q ? q.points : 0;

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
        this.match.questionPool.delete(q.id);
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
        if (this.match.players.some((p) => p.id === player.id))
            throw new DuplicateError(
                `player ${player.id} already part of match ${this.match.id}`
            );
        if (this.match.status !== 'waiting')
            throw new InvalidOperationError(
                'Cannot add players unless match is in waiting status'
            );
        this.match.players.push(player);
    }
}
