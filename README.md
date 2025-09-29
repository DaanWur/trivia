# Trivia Game

A classic two-player, turn-based trivia game that runs in your command line. Fetch questions from a remote API or a local file, and compete with a friend to see who knows the most!

## Features

- **Two-Player Gameplay:** Compete against a friend in a hot-seat style match.
- **Dynamic Question Loading:** Load questions from the Open Trivia DB API or a local JSON file.
- **Skip "Lifelines":** Each player gets two lifelines to skip a tough question and get a new one.
- **Configurable Games:** Use command-line arguments to customize the number of questions.
- **Colorful Interface:** An interactive and user-friendly CLI with colored output.

## Installation

1.  **Clone the repository:**

    ```bash
    git clone <your-repo-url>
    cd trivia-game
    ```

2.  **Install dependencies:**
    This project uses Node.js. Make sure you have it installed, then run:
    ```bash
    npm install
    ```

## How to Run the Game

You can run the game using the `npm run start` script, followed by `--` and any command-line options you want to use.

### Running with API Questions

To start a game with questions fetched from the Open Trivia DB API, use the `--url` flag. You can also specify the number of questions per player with the `--count` flag.

**Example:** Start a game with 10 questions per player from the API.

```bash
npm run start -- --url --count 10
```

### Running with a Local File

To use a local JSON file as the question source, use the `--file` flag.

**Example:** Start a game using a local file named `questions.json`.

```bash
npm run start -- --file ./data/questions-sample.json
```

### Command-Line Options

Here are all the available options you can use:

| Flag      | Alias | Description                                  | Default Value                     |
| --------- | ----- | -------------------------------------------- | --------------------------------- |
| `--url`   | `-u`  | Fetch questions from the Open Trivia DB API. | (Enabled if `--file` is not used) |
| `--file`  | `-f`  | Path to a local JSON file with questions.    | `data/questions-sample.json`      |
| `--count` | `-c`  | Number of questions per player.              | `5`                               |
| `--help`  | `-h`  | Show the help message.                       |                                   |

**To see the help message with all options, run:**

```bash
npm run start -- --help
```
