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

    private fileOrUrl = (answer: string) => {
        switch (answer.toLowerCase()) {
            case 'd':
                this.isUrl = true;
                break;
            case 'f':
                this.isUrl = false;
                break;
            default:
                console.log("Invalid input, please enter 'd' or 'f'.");
                return;
        }
    };

    private createQuestionPool = async (numberOfQuestions: number) => {
        if (isNaN(numberOfQuestions) || numberOfQuestions <= 0) {
            console.log('Invalid number, please enter a positive integer.');
            return;
        }
        try {
            const totalQuestions =
                numberOfQuestions * this.match.players.length;
            const questions =
                await this.questionService.getQuestionsFromApi(totalQuestions);
            if (this.matchService)
                this.matchService.createQuestionPool(questions);
        } catch (error) {
            console.error('Error fetching questions from API:', error);
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

    public async run() {
        // Initial greeting
        await this.initilizeMatch();

        // start game loop
        while (this.match.status === 'in-progress') {
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

            console.log(`\n-------- Round ${this.match.currentRound} --------`);
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
        // Determine and announce winner
        // ...
    }

    private async booleanQuestionFlow(
        question: Question,
        currentPlayer: Player
    ) {
        const bq = question as BooleanQuestion;
        console.log(bq.text);
        const userAnswerStr = await this.ask(
            `${currentPlayer.name}, please enter true or false, or type 'skip': `
        );

        let turnResult;

        if (userAnswerStr.toLowerCase() === 'skip') {
            turnResult = this.skipFlow(turnResult, currentPlayer, question);
        } else {
            const userAnswer = userAnswerStr.toLowerCase() === 'true';
            const isCorrect = bq.checkAnswer(userAnswer);

            turnResult = this.matchService.handlePlayerAnswer(
                currentPlayer.id,
                { choice: userAnswer, correct: isCorrect },
                question
            );
            this.notifyTurnResult(turnResult);
        }

        this.moveToNextPlayer(turnResult, currentPlayer);
    }

    private skipFlow(
        turnResult: any,
        currentPlayer: Player,
        question: Question
    ) {
        turnResult = this.matchService.handlePlayerAnswer(
            currentPlayer.id,
            { choice: undefined, correct: false }, // Signal a skip
            question
        );

        if (turnResult.skipsRemaining < currentPlayer.skips) {
            console.log(
                `You skipped the question. You have ${turnResult.skipsRemaining} skips left.`
            );
        } else {
            console.log(
                'You have no skips left! The answer is considered incorrect.'
            );
        }
        return turnResult;
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
        const userAnswerStr = await this.ask(
            `${currentPlayer.name}, please select an option (number) or type 'skip': `
        );

        let turnResult;

        if (userAnswerStr.toLowerCase() === 'skip') {
            turnResult = this.skipFlow(turnResult, currentPlayer, question);
        } else {
            const userAnswer = parseInt(userAnswerStr);
            const isCorrect = mcq.checkAnswer(userAnswer);
            turnResult = this.matchService.handlePlayerAnswer(
                currentPlayer.id,
                { choice: userAnswer, correct: isCorrect },
                question
            );
            this.notifyTurnResult(turnResult);
        }

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

    private async initilizeMatch() {
        console.log(`Welcome to Trivia! 
                     Your skill and knowledge will be tested, don't let your guard down!`);
        // file or url
        const answer = await this.ask(
            'Do you want to load questions from a our database or a file? (d/f)'
        );
        this.fileOrUrl(answer);
        // create question pool
        if (this.isUrl) {
            const num = parseInt(
                await this.ask(
                    'How many questions do you want to fetch from the API(max number is 46)? '
                )
            );
            const actualNumber = this.calculateRounds(num);
            this.match.numberOfRounds = actualNumber;
            await this.createQuestionPool(actualNumber);
        } else {
            const filePath = await this.ask(
                'Please enter the file path to load questions from: '
            );
        }
        // create players
        const [firstPlayer, secondPlayer] = await this.createPlayers();

        // save initial state
        this.match.setCurrentPlayer(firstPlayer);
        this.matchService.start();
        this.matchCareTaker.backup();
    }
}

const main = new MainRunner();
main.run();
