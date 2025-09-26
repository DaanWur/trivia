import * as readline from "readline";
import {
  BooleanQuestion,
  Match,
  MultipleChoice,
  Player,
  Question,
} from "./entities/index.ts";
import MatchService from "./services/match.service.ts";
import QuestionService from "./services/questions.service.ts";
import type { ChosenAnswer } from "./types/chosen-answer.ts";

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
  private isUrl = false;
  private isexit = false;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.questionService = new QuestionService();
    this.match = new Match();
    this.matchService = new MatchService(this.match);
  }

  private fileOrUrl = (answer: string) => {
    switch (answer.toLowerCase()) {
      case "u":
        this.isUrl = true;
        break;
      case "f":
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
      console.log("Invalid number, please enter a positive integer.");
      return;
    }
    try {
      const questions = await this.questionService.getQuestionsFromApi(
        numberOfQuestions
      );
      if (this.matchService) this.matchService.createQuestionPool(questions);
    } catch (error) {
      console.error("Error fetching questions from API:", error);
    }
  };

  private addPlayer = (playerName: string): void => {
    if (playerName.trim() === "") {
      console.log("Player name cannot be empty.");
      return;
    }
    if (!this.matchService || !this.match) {
      console.log("Match not initialized.");
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
    console.log("Options:");
    for (const [key, option] of q.options) {
      console.log(`${key}: ${option.text}`);
    }
    while (true) {
      const ans = (
        await this.ask("Your answer (enter option number): ")
      ).trim();
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
      const ans = (await this.ask("Your answer (1 or 2): ")).trim();
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
    if (q.type === "multiple") {
      return await this.presentMultipleChoice(q as MultipleChoice);
    }
    return await this.presentBooleanQuestion(q as BooleanQuestion);
  }

  /**
   * Iterate over a question iterable and present each question to the user.
   * The handler receives the question and the result object to perform
   * custom side-effects (scoring, persistence, etc.).
   */
  private async playQuestionPool<T extends IterableIterator<[any, Question]>>(
    iter: T,
    handler: (q: Question, result: ChosenAnswer) => Promise<void> | void
  ) {
    let counter = 0;
    for (const [, q] of iter) {
      counter++;
      console.log(`\n--- Round ${counter} ---`);
      const result = await this.presentQuestion(q);
      await handler(q, result);
    }
  }

  async run() {
    console.log(
      `Welcome to Trivia!
      Get ready to test your knowledge with some exciting questions!`
    );

    try {
      // ask whether to use URL or file
      const fileOrUrlAns = await this.ask(
        "Would you like to load questions from URL or File? (u/f) "
      );
      this.fileOrUrl(fileOrUrlAns);

      if (this.isUrl) {
        const numAns = await this.ask(
          "Please choose the number of questions to fetch: "
        );
        await this.createQuestionPool(numAns);

        const first = await this.ask("Lets create the first player: ");
        this.addPlayer(first);
        const second = await this.ask("Lets create the second player: ");
        this.addPlayer(second);

        // Play through the question pool using a reusable helper
        await this.playQuestionPool(
          this.match.questionPool.entries(),
          async (q, result) => {
            // default handler: just log result (can be replaced by caller)
            console.log(result.correct ? "Correct!" : "Incorrect.");
          }
        );
      } else {
        // Todo: implement json flow
      }
    } catch (err) {
      console.error("Error during run:", err);
    } finally {
      this.rl.close();
    }
  }
}

const main = new MainRunner();
main.run();
