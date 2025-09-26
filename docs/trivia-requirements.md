# Trivia Game — Requirements

This document extracts and translates the requirements from the provided Hebrew design image into a concise, actionable requirements list for implementation.

## 1) Overview

- Two-player trivia game played at one computer (local, hot-seat style).
- Each turn a single question is presented with several answer options.
- The game continues until the configured set of questions is exhausted.
- At the end the score for each player is shown and a winner is declared.

## 2) Gameplay rules (core)

- At each turn one question is presented with N answer options (commonly 3, but may be more).
- A designated/current player must answer the presented question.
    - If the current player selects the correct answer, they receive the point and the turn passes to the other player.
    - If the current player answers incorrectly, the other player gets a chance to answer the same question. If the second player answers correctly they receive the point; otherwise no points are awarded for that question and play continues.
- Questions are presented one at a time and removed from the pool once presented (no repeats in the same session, unless explicitly allowed by an extension).
- When all questions have been processed the game ends and the final points are shown.

## 3) Technical requirements

- CLI entrypoint
    - The game must be runnable from a command line (cmd / terminal).
    - Use a standard CLI parser (e.g., argparse or typer) to accept runtime options.
- Input source
    - Questions must be loadable either from a local file or from a remote source (URL / API).
    - Support JSON-formatted question lists (details in Data Format section).
- Configurable run options
    - Ability to specify the number of questions to use for the session (e.g. `--count 10`).
    - Ability to provide a path or URL to a question list (e.g. `--file questions.json` or `--url <api>`).
- Deterministic/pleasant UX
    - The CLI should re-prompt when the user enters invalid input and accept only valid option values for answers.
    - Display clear prompts showing the available options for each question.
- Game output
    - During the run: show each question, answer options, which player is answering, and immediate feedback (Correct / Incorrect and awarded points).
    - At the end: print a short summary with each player's final score and the winner.
- Implementation details
    - Keep question/answer processing deterministic and consistent (shuffle answers for UI but preserve the correct flag internally).
    - Maintain simple logging of the presented questions and the given answers to allow replaying or debugging (e.g., write a session summary JSON if requested).

## 4) Data format (questions JSON)

- Each question object should include at least:
    - id (string) — optional but recommended
    - category (string)
    - type ("multiple" | "boolean")
    - difficulty (string) — e.g. "easy" | "medium" | "hard"
    - question (string)
    - correct_answer (string)
    - incorrect_answers (array of strings)

Example (OpenTrivia-compatible JSON object):

{
"id": "optional-uuid",
"category": "Science",
"type": "multiple",
"difficulty": "medium",
"question": "What is ...?",
"correct_answer": "Right answer",
"incorrect_answers": ["Wrong A", "Wrong B", "Wrong C"]
}

Notes:

- The implementation should safely decode HTML entities in API-provided text.
- When shuffling options present them with numeric labels (1..N) and accept only those numeric inputs.

## 5) Edge cases & validation

- If the user supplies an invalid file/URL, present a helpful error and exit with a non-zero code.
- If the question pool runs out mid-turn, gracefully end the game and present the final scores.
- Defensive parsing: reject or skip malformed question objects (log a warning, continue with valid ones).
- Answers: only accept the allowed option keys (e.g., numeric labels) and a dedicated skip token if implemented.

## 6) Optional / Extensions (nice-to-have)

1. Category selection: allow composing a game from a mixed category pool and let the user pick a category subset (science, sports, history, politics, etc.).
    - Optionally allow the player to pick a category on their turn (if you want player choice).
2. Difficulty-based scoring: use difficulty to weight points (e.g., easy=1, medium=2, hard=3).
3. Flagging: let a player flag a question as "I don't like this" so it is not shown again in the session (or recorded for curation).
4. API integration: support the Open Trivia DB API (or similar). Provide an option to pass API parameters (category, difficulty, amount). Example: https://opentdb.com/api_config.php
5. Retry / Skip policy: configure retries on skip (e.g., allow one immediate retry on skip) or implement a configurable skip-count that consumes additional questions for the same player.
6. Session recording: export a session summary JSON with the sequence of questions shown, players' answers, and final scores.

## 7) Quick acceptance criteria (tests / manual checks)

- Run the CLI with a small JSON file of questions; simulate two players answering — scores update correctly and winner is reported.
- Verify invalid input is re-prompted and that only valid option keys are accepted.
- Verify questions are not repeated in the same session (unless flagged to be preserved).
- Verify behavior when the question pool is exhausted (game ends cleanly).

---

If you want, I can also:

- Create a sample `questions.json` fixture in `docs/` or `test/` to match the schema above.
- Add a short README section showing how to run the CLI with arguments (example commands).
- Translate this requirements file back to Hebrew if you'd prefer the original language.
