# Trivia game — entities

This document defines the core entities for a small trivia game project. It lists each entity, its fields and types, constraints and relationships, and gives short JSON-schema-like examples and sample objects.

Short "contract" (what data each entity provides/accepts):

- Inputs: JSON objects representing users, players, matches, rounds, questions, categories.
- Outputs: same objects returned by APIs, with stable ids and references.
- Error modes: missing required fields, duplicate category names, invalid references.

Edge cases to consider:

- Unassigned questions (no `assignedTo` yet).
- Ties for round or match winners.
- Players leaving mid-game.

---

## Entities

Each entity below lists: fields (name : type — notes), constraints, relations, and a compact JSON example.

### User

- Purpose: basic auth/identity placeholder. Empty inheritance class for future extension.

Fields:

- id: string (UUID or DB id)
- createdAt: string (ISO datetime)

Notes: In this project `User` can be an empty base class used for authentication; most game-specific data lives on `Player`.

Example:
{
"id": "user_01",
"createdAt": "2025-09-26T12:00:00Z"
}

---

### Player

- Purpose: a user participating in matches; tracks per-game and per-session stats.

Fields:

- id: string (UUID)
- userId: string | null — reference to `User.id` (optional)
- name: string — display name
- points: number — current total points in the match (integer)
- skips: number — how many skips remaining/used (integer)
- roundsWins: number — how many rounds this player has won in the match

Constraints:

- name: non-empty
- points/skips/roundsWins: non-negative integers

Example:
{
"id": "player_01",
"createdAt": "2025-09-26T12:00:00Z",
"name": "Dana",
"points": 120,
"skips": 1,
"roundsWins": 2
}

---

### Category

- Purpose: question categories (science, history, sport...). Category names are unique.

Fields:

- id: string (UUID)
- name: string — unique across categories

Constraints:

- name: required, unique

Example:
{
"id": "cat_01",
"name": "science"
}

---

### Question

- Purpose: a single trivia question. Each round contains one question per player (per the project notes).

Fields:

- id: string (UUID)
- text: string — the question text
- categoryId: string — reference to `Category.id`
- assignedTo: string | null — `Player.id` the question is currently assigned to (if applicable)
- answeredBy: string | null — `Player.id` who answered it (if any)
- points: number — point value for the question (integer)
- createdAt: string (ISO datetime)

Constraints:

- categoryId must reference an existing Category
- points: integer >= 0

Example:
{
"id": "q_01",
"text": "What year did X happen?",
"categoryId": "cat_01",
"assignedTo": "player_01",
"answeredBy": "player_01",
"points": 10,
"createdAt": "2025-09-26T12:05:00Z"
}

---

### Round

- Purpose: one round of the match. According to the project, each round contains one question per player.

Fields:

- id: string (UUID)
- matchId: string — reference to parent `Match.id`
- questions: string[] — array of `Question.id` (one per player)
- winner: string | null — `Player.id` of the round winner (null if none yet or tie)
- pointsByPlayer?: { [playerId: string]: number } — optional per-player points for the round
- createdAt: string (ISO datetime)

Constraints:

- questions length equals number of players in the match (if enforced by game logic)

Example:
{
"id": "round_01",
"matchId": "match_01",
"questions": ["q_01", "q_02"],
"winner": "player_02",
"pointsByPlayer": { "player_01": 5, "player_02": 10 },
"createdAt": "2025-09-26T12:10:00Z"
}

---

### Game / Match

- Purpose: the full match. Tracks players, rounds, progress and overall winner.

Fields:

- id: string (UUID)
- players: string[] — array of `Player.id`
- numberOfRounds: number — total rounds planned for the match
- rounds: string[] — array of `Round.id` (completed or in-progress)
- leadingPlayer: string | null — `Player.id` currently leading (by points or roundsWins, as defined)
- roundsLeft: number — derived or stored (numberOfRounds - rounds.length)
- winner: string | null — `Player.id` when match completed
- status: string — enum: ["waiting", "in-progress", "finished"]
- createdAt: string (ISO datetime)

Constraints / notes:

- leadingPlayer can be computed from players' `points` or `roundsWins`.
- winner set when match ends (e.g., first to majority or highest points after all rounds).

Example:
{
"id": "match_01",
"players": ["player_01", "player_02"],
"numberOfRounds": 5,
"rounds": ["round_01"],
"leadingPlayer": "player_02",
"roundsLeft": 4,
"winner": null,
"status": "in-progress",
"createdAt": "2025-09-26T12:00:00Z"
}

---

## Relationships summary

- User 1..1 Player (optional): a Player may be linked to a User account.
- Match 1..\* Round: a match contains multiple rounds.
- Round 1..\* Question: each round holds multiple questions, typically one per player.
- Question -> Category: many-to-1.

## Data integrity & constraints (recommendations)

- Enforce unique constraint on Category.name.
- Foreign-key/reference checks for categoryId, playerId, matchId.
- Use transactions when creating a round with multiple question assignments to avoid partial state.

## Minimal JSON Schemas (abbreviated)

- Player (example):
  {
  "type": "object",
  "required": ["id","name","points","skips","roundsWins"],
  "properties": {
  "id": { "type": "string" },
  "userId": { "type": ["string", "null"] },
  "name": { "type": "string" },
  "points": { "type": "integer", "minimum": 0 },
  "skips": { "type": "integer", "minimum": 0 },
  "roundsWins": { "type": "integer", "minimum": 0 }
  }
  }

## Small examples / usage notes

- When a question is answered correctly: set `answeredBy`, add `points` to that Player, and update Round and Match leader/winner as needed.
- When a question is skipped: decrement the player's `skips` and mark the question as skipped (application-defined flag) or reassign.

---

## Notes in Hebrew

- מסמך זה מגדיר את היישויות לפרויקט טריוויה קטן. שדות מרכזיים: Player (שם, ניקוד, דילוגים, זכיות סיבובים), Match (מספר סיבובים, שחקן מוביל, סיבובים שנותרו, מנצח), Round (שאלות, מנצח, נקודות), Question (מוענק ל-, נענה ע\"י, נקודות, קטגוריה), Category (id, שם ייחודי).

If you want, I can also add:

- API request/response examples (endpoints) using these entities.
- TypeScript interfaces or Prisma schema based on these definitions.
