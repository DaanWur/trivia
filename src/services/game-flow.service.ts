import {
    BooleanQuestion,
    Match,
    MultipleChoice,
    Player,
    Question,
    type ID
} from '../entities/index.ts';
import MatchService from './match.service.ts';
import { Logger } from './logger.service.ts';

export class GameFlow {
    constructor(
        private match: Match,
        private matchService: MatchService,
        private ask: (question: string) => Promise<string>
    ) {}

    public async handleQuestion(question: Question, currentPlayer: Player) {
        if (question.type === 'multiple') {
            await this.multipleQuestionFlow(question, currentPlayer);
        } else if (question.type === 'boolean') {
            await this.booleanQuestionFlow(question, currentPlayer);
        }
    }

    private async booleanQuestionFlow(
        question: Question,
        currentPlayer: Player
    ) {
        const bq = question as BooleanQuestion;
        Logger.question(bq.text);

        let turnResult;
        let userAnswer: boolean | undefined;

        while (userAnswer === undefined) {
            const userAnswerStr = await this.ask(
                `${currentPlayer.name}, please enter true or false, or type 'skip': `
            );

            if (userAnswerStr.toLowerCase() === 'skip') {
                if (currentPlayer.skips > 0) {
                    this.skipFlow(currentPlayer, question);
                    return;
                } else {
                    Logger.warning(
                        'You have no skips left! Please answer the question.'
                    );
                    continue;
                }
            }

            const lowerCaseAnswer = userAnswerStr.toLowerCase();
            if (lowerCaseAnswer === 'true' || lowerCaseAnswer === 'false') {
                userAnswer = lowerCaseAnswer === 'true';
            } else {
                Logger.error("Invalid input. Please enter 'true' or 'false'.");
            }
        }

        const isCorrect = bq.checkAnswer(userAnswer);
        turnResult = this.matchService.handlePlayerAnswer(
            currentPlayer.id,
            { choice: userAnswer, correct: isCorrect },
            question
        );
        this.notifyTurnResult(turnResult);
        this.moveToNextPlayer(turnResult, currentPlayer);
    }

    private skipFlow(currentPlayer: Player, currentQuestion: Question) {
        currentPlayer.skips--;
        // Discard the current question
        this.matchService.recordAnswer(
            currentPlayer.id,
            false,
            currentQuestion
        );
        // Immediately assign a new question from the main pool
        this.matchService.assignQuestionToPlayer(currentPlayer.id);
        Logger.info(
            `You used a skip. You have ${currentPlayer.skips} skips left.`
        );
    }

    private async multipleQuestionFlow(
        question: Question,
        currentPlayer: Player
    ) {
        const mcq = question as MultipleChoice;
        Logger.question(mcq.text);
        for (const [key, answer] of mcq.options) {
            console.log(`${key}: ${answer.text}`);
        }

        let turnResult;
        let userAnswer: number | undefined;

        while (userAnswer === undefined) {
            const userAnswerStr = await this.ask(
                `${currentPlayer.name}, please select an option (number) or type 'skip': `
            );

            if (userAnswerStr.toLowerCase() === 'skip') {
                if (currentPlayer.skips > 0) {
                    this.skipFlow(currentPlayer, question);
                    return;
                } else {
                    Logger.warning(
                        'You have no skips left! Please answer the question.'
                    );
                    continue;
                }
            }

            const parsedAnswer = parseInt(userAnswerStr);
            if (!isNaN(parsedAnswer) && mcq.options.has(parsedAnswer)) {
                userAnswer = parsedAnswer;
            } else {
                Logger.error('Invalid option. Please try again.');
            }
        }

        const isCorrect = mcq.checkAnswer(userAnswer);
        turnResult = this.matchService.handlePlayerAnswer(
            currentPlayer.id,
            { choice: userAnswer, correct: isCorrect },
            question
        );
        this.notifyTurnResult(turnResult);
        this.moveToNextPlayer(turnResult, currentPlayer);
    }

    private moveToNextPlayer(
        turnResult: {
            nextPlayerId?: ID;
            pointsAwarded: number;
            questionPassed: boolean;
            skipsRemaining: number;
            turnOver: boolean;
        },
        currentPlayer: Player
    ) {
        if (turnResult.questionPassed && turnResult.nextPlayerId) {
            const nextPlayer = this.match.players.find(
                (p) => p.id === turnResult.nextPlayerId
            );
            if (nextPlayer) {
                this.match.setCurrentPlayer(nextPlayer);
            }
        } else if (turnResult.turnOver) {
            const nextPlayer =
                this.match.players.find((p) => p.id !== currentPlayer.id) ??
                currentPlayer;
            this.match.setCurrentPlayer(nextPlayer);
        }
    }

    private notifyTurnResult(turnResult: {
        nextPlayerId?: ID;
        pointsAwarded: number;
        questionPassed: boolean;
        skipsRemaining: number;
        turnOver: boolean;
    }) {
        if (turnResult.pointsAwarded > 0) {
            Logger.success(
                `Correct! You earned ${turnResult.pointsAwarded} points.`
            );
        } else if (turnResult.questionPassed) {
            Logger.info(`The question has been passed to the next player.`);
        } else {
            Logger.error('Wrong answer!');
        }
    }
}
