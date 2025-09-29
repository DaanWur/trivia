import { Logger } from './logger.service.ts';
import chalk from 'chalk';

export function displayHowToPlay() {
    console.log(chalk.cyan.bold('\nWelcome to the Trivia Game!\n'));
    console.log(chalk.cyan.bold('**Objective:**'));
    console.log(
        'The goal of the game is to answer questions correctly and score more points than your opponent.\n'
    );
    console.log(chalk.cyan.bold('**Game Flow:**'));
    console.log(
        '1.  ' +
            chalk.yellow('Choose a Category:') +
            ' Each turn, you will be prompted to choose a category of questions.'
    );
    console.log(
        '2.  ' +
            chalk.yellow('Answer the Question:') +
            ' You will be presented with a question from the selected category.'
    );
    console.log(
        '    *   For multiple-choice questions, enter the number of your answer.'
    );
    console.log("    *   For true/false questions, enter 'true' or 'false'.");
    console.log('3.  ' + chalk.yellow('Scoring:'));
    console.log('    *   Easy questions are worth 1 point.');
    console.log('    *   Medium questions are worth 2 points.');
    console.log('    *   Hard questions are worth 3 points.');
    console.log(
        '4.  ' +
            chalk.yellow('Passing:') +
            ' If you answer a question incorrectly, the question will be passed to your opponent for a chance to score.'
    );
    console.log(
        '5.  ' +
            chalk.yellow('Skips:') +
            " Each player has 2 skips per game. Type 'skip' to use a skip on your turn."
    );
    console.log(
        '6.  ' +
            chalk.yellow('Winning:') +
            ' The player with the most points at the end of the game wins.'
    );
    console.log(
        '7.  ' +
            chalk.yellow('Tie-Breaker:') +
            ' If there is a tie, a tie-breaker round will be played.\n'
    );
    console.log(chalk.green.bold('Good luck!\n'));
}
