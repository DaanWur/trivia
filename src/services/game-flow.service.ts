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
import { InvalidOperationError } from '../entities/Errors/errors.ts';
import chalk from 'chalk';

export class GameFlow {
    constructor(
        private match: Match,
        private matchService: MatchService,
        private ask: (question: string) => Promise<string>
    ) {}

    public async getQuestionForPlayer(
        currentPlayer: Player
    ): Promise<Question | undefined> {
        if (this.match.questionInPlay) {
            return this.match.questionInPlay;
        }

        const assignedQuestionId = this.match.assigned[currentPlayer.id];

        if (assignedQuestionId) {
            // A question has been passed to this player
            for (const questions of this.match.questionPool.values()) {
                const question = questions.find(
                    (q) => q.id === assignedQuestionId
                );
                if (question) return question;
            }
        }

        // Loop until a question is successfully assigned or the pool is empty
        while (this.match.questionPool.size > 0) {
            const category = await this.promptForCategory();
            const question = this.matchService.assignQuestionToPlayer(
                currentPlayer.id,
                category
            );

            if (question) {
                return question;
            }

            Logger.warning(
                'No questions available in that category. Please choose another.'
            );
        }

        return undefined; // No questions left in any category
    }

    public async processQuestion(
        question: Question,
        currentPlayer: Player
    ): Promise<void> {
        if (question.type === 'multiple') {
            await this.multipleQuestionFlow(question, currentPlayer);
        } else if (question.type === 'boolean') {
            await this.booleanQuestionFlow(question, currentPlayer);
        }
    }

    private async promptForCategory(): Promise<string> {
        const categories = Array.from(this.match.questionPool.keys());
        Logger.info('Please choose a category:');
        categories.forEach((c, i) => Logger.info(`${i + 1}: ${c}`));

        while (true) {
            const choiceStr = await this.ask('Enter the number of your choice: ');
            const choice = parseInt(choiceStr) - 1;
            if (choice >= 0 && choice < categories.length) {
                return categories[choice]!;
            }
            Logger.error('Invalid choice, please try again.');
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
                `${currentPlayer.name}, please enter ${chalk.green(
                    'true'
                )} or ${chalk.red('false')}, or type 'skip': `
            );

            if (userAnswerStr.toLowerCase() === 'skip') {
                if (currentPlayer.skips > 0) {
                    await this.skipFlow(currentPlayer);
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

    private async skipFlow(currentPlayer: Player) {
        try {
            this.matchService.skipQuestion(currentPlayer.id);
            Logger.info(
                `You used a skip. You have ${currentPlayer.skips} skips left.`
            );
        } catch (error: any) {
            if (error instanceof InvalidOperationError) {
                Logger.warning(error.message);
            } else {
                Logger.error('An unexpected error occurred during skip.');
            }
        }
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
                    await this.skipFlow(currentPlayer);
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
        // If the turn is not over, we do nothing, and the current player remains the same.
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
