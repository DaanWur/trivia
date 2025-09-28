import * as readline from 'readline';
import {
    BooleanQuestion,
    Match,
    MultipleChoice,
    Player,
    Question
} from './entities/index.ts';
import MatchService from './services/match.service.ts';
import QuestionService from './services/questions.service.ts';
import type { ChosenAnswer } from './types/chosen-answer.ts';

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
    private scores: Map<string, number> = new Map();
    private isUrl = false;
    private isexit = false;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.questionService = new QuestionService();
        this.match = new Match();
        this.matchService = new MatchService(this.match);
    }

    private fileOrUrl = (answer: string) => {
        switch (answer.toLowerCase()) {
            case 'u':
                this.isUrl = true;
                break;
            case 'f':
                this.isUrl = false;
                break;
            default:
                console.log("Invalid input, please enter 'u' or 'f'.");
                return;
        }
    };

    private createQuestionPool = async (num: string) => {
        const numberOfQuestions = parseInt(num);
        if (isNaN(numberOfQuestions) || numberOfQuestions <= 0) {
            console.log('Invalid number, please enter a positive integer.');
            return;
        }
        try {
            const questions =
                await this.questionService.getQuestionsFromApi(
                    numberOfQuestions
                );
            if (this.matchService)
                this.matchService.createQuestionPool(questions);
        } catch (error) {
            console.error('Error fetching questions from API:', error);
        }
    };

    private addPlayer = (playerName: string): void => {
        if (playerName.trim() === '') {
            console.log('Player name cannot be empty.');
            return;
        }
        if (!this.matchService || !this.match) {
            console.log('Match not initialized.');
            return;
        }
        const player = new Player(playerName.trim());
        this.matchService.addPlayer(player);
        console.log(`Player ${player.name} created with ID: ${player.id}`);
    };
    /**
     * Async wrapper around rl.question so prompts can be awaited in order.
     */
    private ask(question: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => resolve(answer));
        });
    }

    private async presentMultipleChoice(
        q: MultipleChoice
    ): Promise<ChosenAnswer> {
        console.log('Options:');
        for (const [key, option] of q.options) {
            console.log(`${key}: ${option.text}`);
        }
        while (true) {
            const ans = (
                await this.ask(
                    "Your answer (enter option number, or 's' to skip): "
                )
            ).trim();
            if (ans.toLowerCase() === 's') {
                return { correct: false, choice: undefined };
            }
            const choice = parseInt(ans, 10);
            if (Number.isNaN(choice)) continue;
            if (!q.options.has(choice)) continue;

            const correct = q.checkAnswer(choice);
            const answer: ChosenAnswer = { correct, choice };
            return answer;
        }
    }

    // Present a boolean question and return whether the answer was correct
    private async presentBooleanQuestion(
        q: BooleanQuestion
    ): Promise<ChosenAnswer> {
        console.log(`1: ${q.labelTrue}`);
        console.log(`2: ${q.labelFalse}`);
        // re-prompt until valid 1 or 2 entered
        while (true) {
            const ans = (
                await this.ask("Your answer (1 or 2, or 's' to skip): ")
            ).trim();
            if (ans.toLowerCase() === 's') {
                return { correct: false, choice: undefined };
            }
            const choice = parseInt(ans, 10);
            if (choice !== 1 && choice !== 2) continue;
            const picked = choice === 1;
            const correct = q.checkAnswer(picked);
            const answer: ChosenAnswer = { correct, choice: picked };
            return answer;
        }
    }

    private async presentQuestion(q: Question) {
        console.log(`Question: ${q.text}`);
        if (q.type === 'multiple') {
            return await this.presentMultipleChoice(q as MultipleChoice);
        }
        return await this.presentBooleanQuestion(q as BooleanQuestion);
    }

    // present a question to a specific player and return the chosen answer
    private async presentToPlayer(player: Player, q: Question) {
        console.log(`\n${player.name}, it's your turn:`);
        return await this.presentQuestion(q);
    }

    private async skipQuestion(player: Player) {
        const q = this.matchService.skipQuestion(player.id);
        if (!q) {
            console.log(`No more questions available for ${player.name}`);
            return;
        }
        console.log('New question!');
        await this.presentQuestion(q);
    }

    // award points via matchService.recordAnswer and update local scores map
    private awardAndLog(player: Player, correct: boolean, q: Question) {
        const awarded = this.matchService.recordAnswer(player.id, correct, q);
        const prev = this.scores.get(player.id) ?? 0;
        this.scores.set(player.id, prev + awarded);
        console.log(
            `${player.name} ${correct ? 'correct' : 'incorrect'} (+${awarded}) -> ${this.scores.get(player.id)}`
        );
    }

    private async handleTurns() {
        if (!this.matchService || !this.match) {
            console.log('Match not initialized.');
            return;
        }

        const players = this.match.players;
        if (players.length === 0) {
            console.log('No players to play the match.');
            return;
        }

        let currentPlayerIndex = 0;
        while (this.match.questionPool.size > 0) {
            const player = players[currentPlayerIndex];
            if (!player) {
                currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
                continue;
            }

            const q = this.matchService.assignQuestionToPlayer(player.id);
            if (!q) {
                console.log(`No more questions available.`);
                break; // Exit if no questions are left
            }
            const answer = await this.presentToPlayer(player, q);

            if (answer.choice === undefined) {
                // Player wants to skip
                if (player.skips > 0) {
                    player.skips--;
                    console.log(
                        `${player.name} skipped the question. ${player.skips} skips remaining.`
                    );
                    this.matchService.recordAnswer(player.id, false, q); // Consume the question
                    continue; // Same player's turn with a new question
                } else {
                    console.log(
                        `${player.name} has no skips left. The question is considered incorrect.`
                    );
                    // Fall through to incorrect answer logic
                }
            }

            if (answer.correct) {
                this.awardAndLog(player, true, q);
                currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
            } else {
                // Player answered incorrectly or tried to skip with no skips left
                console.log(
                    'Incorrect. The question will be passed to the next player.'
                );
                const nextPlayerIndex =
                    (currentPlayerIndex + 1) % players.length;
                const nextPlayer = players[nextPlayerIndex];

                if (nextPlayer && nextPlayer.id !== player.id) {
                    try {
                        this.matchService.passQuestion(
                            player.id,
                            nextPlayer.id
                        );
                        const secondAnswer = await this.presentToPlayer(
                            nextPlayer,
                            q
                        );
                        if (
                            secondAnswer.choice !== undefined &&
                            secondAnswer.correct
                        ) {
                            this.awardAndLog(nextPlayer, true, q);
                        } else {
                            console.log(
                                'Incorrect. No points awarded for this question.'
                            );
                            this.matchService.recordAnswer(
                                nextPlayer.id,
                                false,
                                q
                            );
                        }
                    } catch (e) {
                        this.matchService.recordAnswer(player.id, false, q);
                    }
                } else {
                    this.matchService.recordAnswer(player.id, false, q);
                }
                currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
            }
        }
        // summary
        console.log('\nFinal scores:');
        for (const p of players)
            console.log(`${p.name}: ${this.scores.get(p.id)}`);
    }

    async run() {
        console.log(
            `Welcome to Trivia!
      Get ready to test your knowledge with some exciting questions!`
        );

        try {
            // ask whether to use URL or file
            const fileOrUrlAns = await this.ask(
                'Would you like to load questions from URL or File? (u/f) '
            );
            this.fileOrUrl(fileOrUrlAns);

            if (this.isUrl) {
                const numAns = await this.ask(
                    'Please choose the number of questions to fetch: '
                );
                await this.createQuestionPool(numAns);

                const first = await this.ask('Lets create the first player: ');
                this.addPlayer(first);
                const second = await this.ask(
                    'Lets create the second player: '
                );
                this.addPlayer(second);

                // Use the two-player round flow which assigns one question per player per round
                await this.handleTurns();
            } else {
                // Todo: implement json flow
            }
        } catch (err) {
            console.error('Error during run:', err);
        } finally {
            this.rl.close();
        }
    }
}

const main = new MainRunner();
main.run();
