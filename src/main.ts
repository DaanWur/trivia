import * as readline from "readline";
import { Match, Player } from "./entities/index.ts";
import MatchService from "./services/match.service.ts";
import QuestionService from "./services/questions.service.ts";

function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const questionService = new QuestionService();

  console.log(`Welcome to Trivia!
        Get ready to test your knowledge with some exciting questions!`);
  let exitGame = false;
  let isUrl = false;

  while (!exitGame) {
    console.log(`We will start to play shortly..`);

    const match = new Match();
    const matchService = new MatchService(match);

    rl.question(
      "Would you like to load questions from URL or File? (u/f) ",
      (answer) => {
        switch (answer.toLowerCase()) {
          case "u":
            isUrl = true;
            break;
          case "f":
            isUrl = false;
            break;
          default:
            console.log("Invalid input, please enter 'u' or 'f'.");
            return;
        }
      }
    );
    if (isUrl) {
      rl.question(
        "Please choose the number of questions to fetch: ",
        async (num) => {
          const numberOfQuestions = parseInt(num);
          if (isNaN(numberOfQuestions) || numberOfQuestions <= 0) {
            console.log("Invalid number, please enter a positive integer.");
            return;
          }
          try {
            const questions = await questionService.getQuestionsFromApi(
              numberOfQuestions
            );
            matchService.createQuestionPool(questions);
          } catch (error) {
            console.error("Error fetching questions from API:", error);
          } finally {
            rl.close();
          }
        }
      );

      rl.question("Lets create the first player: ", (playerName) => {
        if (playerName.trim() === "") {
          console.log("Player name cannot be empty.");
          return;
        }
        const player = new Player(playerName.trim());
        matchService.addPlayer(player);
        console.log(`Player ${player.name} created with ID: ${player.id}`);
      });

      rl.question("Lets create the second player: ", (playerName) => {
        if (playerName.trim() === "") {
          console.log("Player name cannot be empty.");
          return;
        }
        const player = new Player(playerName.trim());
        matchService.addPlayer(player);
        console.log(`Player ${player.name} created with ID: ${player.id}`);
      });
    } else {
    }

    exitGame = true; // Set to true to exit after one iteration for this example
  }
}
main();
