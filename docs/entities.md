# Trivia Game — Entities

This document defines the core entities for the Trivia game project. It lists each entity, its fields, and its purpose, reflecting the current implementation.

---

## Entities

### User

- **Purpose:** A base class for any entity that can be considered a "user." In this project, it provides a unique `id` and `createdAt` timestamp. It is designed for future extensibility (e.g., adding `Admin` or `Spectator` roles).

- **Fields:**
    - `id`: `string` (UUID) - A unique identifier.
    - `createdAt`: `string` (ISO datetime) - The timestamp of creation.

### Player

- **Purpose:** Represents a participant in a trivia match. It inherits from `User` and tracks game-specific stats like points and skips.

- **Fields:**
    - `id`: `string` (UUID) - Inherited from `User`.
    - `name`: `string` - The player's display name.
    - `points`: `number` - The player's current score in the match.
    - `skips`: `number` - The number of "skip lifelines" the player has left (defaults to 2).
    - `roundsWins`: `number` - The number of rounds won by the player (currently not used).

### Category

- **Purpose:** Represents a question category (e.g., "Science," "History"). This entity is designed to prevent duplicate categories and will be essential for future features like category selection.

- **Fields:**
    - `id`: `string` (UUID) - A unique identifier for the category.
    - `name`: `string` - The unique name of the category.

### Question

- **Purpose:** A single trivia question. It can be either a multiple-choice or a boolean (true/false) question.

- **Fields:**
    - `id`: `string` (UUID) - A unique identifier for the question.
    - `text`: `string` - The text of the question.
    - `category`: `Category` - A reference to the `Category` object.
    - `type`: `'multiple' | 'boolean'` - The type of the question.
    - `points`: `number` - The point value of the question.
    - `difficulty`: `'easy' | 'medium' | 'hard'` - The difficulty level.
    - `assignedTo`: `string | null` - The `Player.id` of the player the question is currently assigned to.
    - `answeredBy`: `string | null` - The `Player.id` of the player who has answered the question.

### Match

- **Purpose:** The main entity that represents a single trivia game. It holds the state of the match, including the players, the question pool, and the current progress.

- **Fields:**
    - `id`: `string` (UUID) - A unique identifier for the match.
    - `players`: `Player[]` - An array of the `Player` objects in the match.
    - `numberOfRounds`: `number` - The official number of questions to be played in the match.
    - `questionPool`: `Map<ID, Question>` - The pool of questions for the match.
    - `questionsResolved`: `number` - A counter for how many questions have been answered or skipped.
    - `assigned`: `Record<ID, ID | null>` - A map of which question is assigned to which player.
    - `currentPlayer`: `Player | null` - The player whose turn it is.
    - `currentRound`: `number` - The current round number.
    - `passedQuestion`: `ID | null` - The ID of a question that has been passed from one player to another.
    - `status`: `'waiting' | 'in-progress' | 'finished'` - The current status of the match.

---

## Relationships Summary

- **User & Player:** `Player` **is a** `User` (inheritance).
- **Match & Player:** A `Match` **has** multiple `Player`s.
- **Match & Question:** A `Match` **has** a `questionPool` of `Question`s.
- **Question & Category:** A `Question` **belongs to a** `Category`.
