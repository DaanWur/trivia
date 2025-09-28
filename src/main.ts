import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as readline from 'readline';
import {
    BooleanQuestion,
    Match,
    MultipleChoice,
    Player,
    Question,
    type ID
} from './entities/index.ts';
import MatchService from './services/match.service.ts';
import QuestionService from './services/questions.service.ts';
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
            .help()
            .alias('help', 'h')
            .parse();

        console.log(`Welcome to Trivia! 
                     Your skill and knowledge will be tested, don't let your guard down!`);

        const useUrl = argv.url || !argv.file;
        const filePath = argv.file || 'data/questions-sample.json';
        const count = argv.count;

        // Create players first
        const [firstPlayer, secondPlayer] = await this.createPlayers();

        // Create the question pool
        await this.createQuestionPool(useUrl, filePath, count);

        // Save initial state
        this.match.setCurrentPlayer(firstPlayer);
        this.matchService.start();
        this.matchCareTaker.backup();
    }

    private createQuestionPool = async (
        isUrl: boolean,
        filePath: string = 'data/questions-sample.json',
        numberOfQuestions: number = 10
    ) => {
        if (isNaN(numberOfQuestions) || numberOfQuestions <= 0) {
            console.log('Invalid number, please enter a positive integer.');
            return;
        }
        try {
            // Fetch 4 extra questions for the skip buffer
            const totalQuestionsToFetch =
                numberOfQuestions * this.match.players.length + 4;

            const questions = isUrl
                ? await this.questionService.getQuestionsFromApi(
                      totalQuestionsToFetch
                  )
                : await this.questionService.readQuestionsFromJson(filePath);

            if (this.matchService)
                this.matchService.createQuestionPool(questions);
        } catch (error) {
            console.error(error);
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

    private calculateRounds(num: number): number {
        if (num % 2 !== 0) {
            console.log(
                'Number of questions should be even, incrementing by 1.'
            );
            num += 1;
        }
        // add 4 more questions to support skips
        num += 4;
        return Math.floor(num / this.match.players.length);
    }

    private async booleanQuestionFlow(
        question: Question,
        currentPlayer: Player
    ) {
        const bq = question as BooleanQuestion;
        console.log(bq.text);

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
                    console.log(
                        'You have no skips left! Please answer the question.'
                    );
                    continue;
                }
            }

            const lowerCaseAnswer = userAnswerStr.toLowerCase();
            if (lowerCaseAnswer === 'true' || lowerCaseAnswer === 'false') {
                userAnswer = lowerCaseAnswer === 'true';
            } else {
                console.log("Invalid input. Please enter 'true' or 'false'.");
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
        this.matchService.recordAnswer(currentPlayer.id, false, currentQuestion);
        // Immediately assign a new question from the main pool
        this.matchService.assignQuestionToPlayer(currentPlayer.id);
        console.log(
            `You used a skip. You have ${currentPlayer.skips} skips left.`
        );
    }

    private async multipleQuestionFlow(
        question: Question,
        currentPlayer: Player
    ) {
        const mcq = question as MultipleChoice;
        console.log(mcq.text);
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
                    console.log(
                        'You have no skips left! Please answer the question.'
                    );
                    continue;
                }
            }

            const parsedAnswer = parseInt(userAnswerStr);
            if (!isNaN(parsedAnswer) && mcq.options.has(parsedAnswer)) {
                userAnswer = parsedAnswer;
            } else {
                console.log('Invalid option. Please try again.');
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
            console.log(
                `Correct! You earned ${turnResult.pointsAwarded} points.`
            );
        } else if (turnResult.questionPassed) {
            console.log(`The question has been passed to the next player.`);
        } else {
            console.log('Wrong answer!');
        }
    }

    public async run() {
        // Initial greeting & setup from args
        await this.setup();

        // start game loop
        while (
            this.match.status === 'in-progress' &&
            this.match.questionsResolved < this.match.numberOfRounds
        ) {
            const currentPlayer = this.match.getCurrentPlayer();
            if (!currentPlayer) {
                console.log('Error: No current player set. Ending game.');
                this.match.status = 'finished';
                break;
            }

            // Increment round only when drawing a new question (not on first turn)
            const assignedQuestionId = this.match.assigned[currentPlayer.id];
            if (!assignedQuestionId && !this.firstTurn) {
                this.match.currentRound++;
            }

            const [p1, p2] = this.match.players;
            console.log(
                `\n${p1?.name}: ${p1?.points} points | ${p2?.name}: ${p2?.points} points`
            );
            console.log(`-------- Round ${this.match.currentRound} --------`);
            console.log(`${currentPlayer.name}'s turn.`);

            let question: Question | undefined;
            if (assignedQuestionId) {
                question = this.match.questionPool.get(assignedQuestionId);
            } else {
                question = this.matchService.assignQuestionToPlayer(
                    currentPlayer.id
                );
            }

            if (!question) {
                console.log('No more questions available. Ending game.');
                this.match.status = 'finished';
                break;
            }

            if (question.type === 'multiple') {
                await this.multipleQuestionFlow(question, currentPlayer);
            } else if (question.type === 'boolean') {
                await this.booleanQuestionFlow(question, currentPlayer);
            }

            this.matchCareTaker.backup();

            // Clear firstTurn flag after the first iteration
            if (this.firstTurn) this.firstTurn = false;
        }

        console.log('\nGame over!');
        const winner = this.matchService.determineWinner();
        console.log('And the winner is...');
        console.log('Get ready....');
        console.log(
            `${winner?.name} with ${winner?.points} points! Congratulations!`
        );
        console.log("There is not prize, but you're a winner in life!");
    }
}

const main = new MainRunner();
main.run();
