#!/usr/bin/env node
import { Match, Player } from './entities/index.ts';
import { GameFlow } from './services/game-flow.service.ts';
import { Logger } from './services/logger.service.ts';
import MatchService from './services/match.service.ts';
import QuestionService from './services/questions.service.ts';
import { displayHowToPlay } from './services/howToPlay.ts';
import * as readline from 'readline';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Caretaker } from './entities/caretaker.ts';

/**
 * MainRunner manages CLI state for a single run of the Trivia app.
 * It holds the readline interface and the services so prompts can access
 * shared state easily.
 */
class MainRunner {
    private rl: readline.Interface;
    private match: Match;
    private matchService: MatchService;
    private questionService: QuestionService;
    private matchCareTaker: Caretaker;
    private gameFlow: GameFlow;
    private isUrl = false;
    private isexit = false;
    private firstTurn = true;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.questionService = new QuestionService();
        this.match = new Match();
        this.matchService = new MatchService(this.match);
        this.matchCareTaker = new Caretaker(this.match);
        this.gameFlow = new GameFlow(this.match, this.matchService, (q) =>
            this.ask(q)
        );
    }

    private async setup() {
        const argv = await yargs(hideBin(process.argv))
            .option('count', {
                alias: 'c',
                type: 'number',
                description: 'Number of questions per player',
                default: 5
            })
            .option('file', {
                alias: 'f',
                type: 'string',
                description: 'Path to a local JSON file with questions'
            })
            .option('url', {
                alias: 'u',
                type: 'boolean',
                description: 'Fetch questions from the Open Trivia DB API'
            })
            .option('difficulty', {
                alias: 'd',
                type: 'string',
                description:
                    'Set the difficulty of questions (easy, medium, hard)',
                choices: ['easy', 'medium', 'hard']
            })
            .option('questionType', {
                alias: 't',
                type: 'string',
                description: 'Set the type of questions (multiple, boolean)',
                choices: ['multiple', 'boolean']
            })
            .help()
            .alias('help', 'h')
            .parse();

        Logger.info(`Welcome to Trivia! 
                     Your skill and knowledge will be tested, don't let your guard down!`);

        const useUrl = argv.url || !argv.file;
        const filePath = argv.file || 'data/questions-sample.json';
        const count = argv.count;
        const difficulty = argv.difficulty;
        const questionType = argv.questionType as
            | 'multiple'
            | 'boolean'
            | undefined;

        // Create players first
        const [firstPlayer, secondPlayer] = await this.createPlayers();

        // The total number of questions to be answered in the match
        this.match.numberOfRounds = count;

        // Create the question pool
        await this.createQuestionPool(
            useUrl,
            filePath,
            count,
            difficulty,
            questionType
        );

        // Save initial state
        this.match.setCurrentPlayer(firstPlayer);
        this.matchService.start();
        this.matchCareTaker.backup();
    }

    private createQuestionPool = async (
        isUrl: boolean,
        filePath: string = 'data/questions-sample.json',
        numberOfGameQuestions: number = 10,
        difficulty?: string,
        questionType?: 'multiple' | 'boolean'
    ) => {
        if (isNaN(numberOfGameQuestions) || numberOfGameQuestions <= 0) {
            Logger.error('Invalid number, please enter a positive integer.');
            return;
        }
        try {
            // Fetch 4 extra questions for the skip buffer
            const totalQuestionsToFetch = numberOfGameQuestions + 4;

            const questions = isUrl
                ? await this.questionService.getQuestionsFromApi(
                      totalQuestionsToFetch,
                      difficulty,
                      questionType
                  )
                : await this.questionService.readQuestionsFromJson(filePath);

            if (this.matchService)
                this.matchService.createQuestionPool(
                    questions,
                    numberOfGameQuestions
                );
        } catch (error) {
            Logger.error(
                `Failed to load questions. Please check your connection or file path.`
            );
            console.error(error); // Also log the original error for debugging
            process.exit(1);
        }
    };

    /**
     * Async wrapper around rl.question so prompts can be awaited in order.
     */
    private ask(question: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => resolve(answer));
        });
    }

    private async createPlayers(): Promise<[Player, Player]> {
        const firstPlayerName = await this.ask(
            'Enter the name of the first player: '
        );
        const firstPlayer = new Player(firstPlayerName);
        this.matchService.addPlayer(firstPlayer);

        const secondPlayerName = await this.ask(
            'Enter the name of the second player: '
        );
        const secondPlayer = new Player(secondPlayerName);
        this.matchService.addPlayer(secondPlayer);

        return [firstPlayer, secondPlayer];
    }

    public async run() {
        displayHowToPlay();

        // Initial greeting & setup from args
        await this.setup();

        // start game loop
        while (
            this.match.status === 'in-progress' &&
            this.match.questionsResolved < this.match.numberOfRounds
        ) {
            const currentPlayer = this.match.getCurrentPlayer();
            if (!currentPlayer) {
                Logger.error('Error: No current player set. Ending game.');
                this.match.status = 'finished';
                break;
            }

            // Increment round only when drawing a new question (not on first turn)
            const assignedQuestionId = this.match.assigned[currentPlayer.id];
            if (!assignedQuestionId && !this.firstTurn) {
                this.match.currentRound++;
            }

            const [p1, p2] = this.match.players;
            Logger.score(
                `\n${p1?.name}: ${p1?.points} points | ${p2?.name}: ${p2?.points} points`
            );
            Logger.turn(`-------- Round ${this.match.currentRound} --------`);
            Logger.turn(`${currentPlayer.name}'s turn.`);

            const question = await this.gameFlow.getQuestionForPlayer(
                currentPlayer
            );

            if (!question) {
                Logger.warning('No more questions available. Ending game.');
                this.match.status = 'finished';
                break;
            }

            Logger.info(`Difficulty: ${question.difficulty}`);
            await this.gameFlow.processQuestion(question, currentPlayer);

            this.matchCareTaker.backup();

            // Clear firstTurn flag after the first iteration
            if (this.firstTurn) this.firstTurn = false;
        }

        Logger.info('\nGame over!');
        const winner = this.matchService.determineWinner();

        if (winner) {
            Logger.success('And the winner is...');
            Logger.success('Get ready....');
            Logger.success(
                `${winner.name} with ${winner.points} points! Congratulations!`
            );
            Logger.info("There is not prize, but you're a winner in life!");
        } else {
            Logger.info("It's a tie! There is no winner.");
            const tiedPlayers = this.match.players.filter(
                (p) => p.points === Math.max(...this.match.players.map((p) => p.points))
            );
            if (tiedPlayers.length > 1) {
                const tieWinner = await this.matchService.handleTieBreaker(
                    tiedPlayers[0]!,
                    tiedPlayers[1]!,
                    (q) => this.ask(q)
                );
                if (tieWinner) {
                    Logger.success(
                        `The winner of the tie-breaker is ${tieWinner.name}!`
                    );
                } else {
                    Logger.info("It's a draw!");
                }
            } else {
                Logger.info("It's a draw!");
            }
        }

        this.rl.close();
    }
}

const main = new MainRunner();
main.run().catch((err) => {
    Logger.error('An unexpected error occurred: ' + err.message);
    process.exit(1);
});
