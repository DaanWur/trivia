import chalk from 'chalk';

export class Logger {
    static info(message: string) {
        console.log(chalk.blue(message));
    }

    static success(message: string) {
        console.log(chalk.green(message));
    }

    static error(message: string) {
        console.log(chalk.red(message));
    }

    static warning(message: string) {
        console.log(chalk.yellow(message));
    }

    static question(message: string) {
        console.log(chalk.cyan.bold(message));
    }

    static score(message: string) {
        console.log(chalk.magenta.bold(message));
    }

    static turn(message: string) {
        console.log(chalk.yellow.bold(message));
    }
}
