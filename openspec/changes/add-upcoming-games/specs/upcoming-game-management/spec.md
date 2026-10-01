## ADDED Requirements

### Requirement: UpcomingGame schema
The system SHALL provide a Zod schema for `UpcomingGame` with an `_id` (`UPG` followed by exactly 6 digits), an `opponentId` matching the opponent id format, a `date` as a real calendar date in `YYYY-MM-DD` form, a `time` in 24-hour `HH:mm` form, a `location` of `HOME` or `AWAY`, a `type` of `CHALLENGE`, `LLIHC`, or `BOTBC`, an optional trimmed `venue`, and audit timestamps, plus a create-input variant that omits `_id`, `createdAt`, and `updatedAt`. `venue` SHALL be required and non-empty when `location` is `AWAY`, and SHALL be absent when `location` is `HOME`.

#### Scenario: Home game without a venue is valid
- **WHEN** an upcoming game with `location: "HOME"`, no `venue`, `date: "2026-10-03"`, `time: "20:30"`, and `type: "CHALLENGE"` is validated
- **THEN** validation succeeds

#### Scenario: Away game requires a venue
- **WHEN** an upcoming game with `location: "AWAY"` and no `venue` (or a blank one) is validated
- **THEN** validation fails with a field-level error on `venue`

#### Scenario: Home game rejects a venue
- **WHEN** an upcoming game with `location: "HOME"` and a `venue` is validated
- **THEN** validation fails with a field-level error on `venue`

#### Scenario: Invalid date or time is rejected
- **WHEN** an upcoming game has `date: "2026-02-30"` or `time: "25:00"`
- **THEN** validation fails with a field-level error on that field

#### Scenario: NIHC is not an upcoming-game type
- **WHEN** an upcoming game has `type: "NIHC"`
- **THEN** validation fails with a field-level error on `type`

### Requirement: Admin can list upcoming games
The system SHALL render, at `/upcoming-games`, an **Upcoming** section of games dated today or later (Europe/London), soonest first by date then time, and a **Past** section of games dated before today, most recent first. Each row SHALL show the opponent's name, date, time, Home/Away (with the venue for away games), and competition, and SHALL link to that game's edit page. The page SHALL render per request.

#### Scenario: Upcoming and past games are separated
- **WHEN** an admin opens `/upcoming-games` on 2026-10-01 with games dated 2026-09-20, 2026-10-01, and 2026-10-08 stored
- **THEN** the Upcoming section lists 2026-10-01 then 2026-10-08, and the Past section lists 2026-09-20

#### Scenario: Empty state
- **WHEN** no upcoming games are stored
- **THEN** the page shows an empty-state message and a link to add one

### Requirement: Admin can create an upcoming game
The system SHALL provide a form at `/upcoming-games/new` capturing an opponent (picked from existing opponents), a date, a time, Home or Away, a venue (shown and required only when Away), and a competition (Challenge, LLIHC, or BOTBC), and SHALL create the upcoming game when submitted with valid data, then redirect to `/upcoming-games`.

#### Scenario: Creating an away game
- **WHEN** the form is submitted with an existing opponent, date 2026-10-03, time 20:30, Away, venue "Riverside Leisure Centre", and Challenge
- **THEN** an upcoming game is stored with those values and `type: "CHALLENGE"`, and the admin is redirected to `/upcoming-games`

#### Scenario: Away without a venue is rejected
- **WHEN** the form is submitted with Away and an empty venue
- **THEN** nothing is stored and the form shows an error on the venue field, keeping the other entered values

#### Scenario: Unknown opponent is rejected
- **WHEN** the form is submitted with an opponent id that does not exist
- **THEN** nothing is stored and the form shows an error on the opponent field

#### Scenario: Home game drops any typed venue
- **WHEN** the form is submitted with Home selected and a venue value still present in the submission
- **THEN** the game is stored with no `venue`

### Requirement: Admin can edit an upcoming game
The system SHALL provide an edit page at `/upcoming-games/[id]/edit` pre-filled with the game's current values, applying the same validation as create, and SHALL return 404 for an unknown id.

#### Scenario: Changing an away game to home
- **WHEN** an admin edits an away game, selects Home, and saves
- **THEN** the game is stored with `location: "HOME"` and no `venue`, and its `updatedAt` advances

#### Scenario: Unknown id
- **WHEN** an admin opens the edit page for an id that does not exist
- **THEN** a 404 page is shown

### Requirement: Admin can delete an upcoming game
The system SHALL allow deleting an upcoming game from its edit page, and SHALL then redirect to `/upcoming-games`.

#### Scenario: Deleting a game
- **WHEN** an admin deletes an upcoming game
- **THEN** it is removed from the collection and no longer listed

### Requirement: Publish generates upcoming-games.json
The publish pipeline SHALL generate `upcoming-games.json` as an array of `{ opponentTeam, logoImage, gameType, date, time, location }` containing only upcoming games dated today or later (Europe/London), sorted by date then time. In each entry:

- `opponentTeam` is the referenced opponent's current name.
- `logoImage` is the opponent's logo S3 key, or `""` when it has no logo.
- `gameType` uses the same competition labels as `results.json` (`CHALLENGE` → `"Challenge"`, others unchanged).
- `date` is the stored `YYYY-MM-DD`.
- `time` is the stored time in 12-hour form (e.g. `"8:30 PM"`).
- `location` is `"Planet Ice Peterborough"` for home games, or the stored venue for away games.

Generation SHALL fail, naming the game, when an upcoming game references a missing opponent. The output SHALL conform to a Zod schema that the golden fixture `fixtures/golden/upcoming-games.json` also satisfies.

#### Scenario: Away game output
- **WHEN** publishing on 2026-10-01 with an away CHALLENGE game against "Chelmsford Chargers" (no logo) on 2026-10-03 at 20:30 at "Riverside Leisure Centre"
- **THEN** `upcoming-games.json` contains `{ "opponentTeam": "Chelmsford Chargers", "logoImage": "", "gameType": "Challenge", "date": "2026-10-03", "time": "8:30 PM", "location": "Riverside Leisure Centre" }`

#### Scenario: Home game output with logo
- **WHEN** a home LLIHC game at 16:00 references an opponent whose logo key is `opponents/OPN123456/logo-1.png`
- **THEN** its entry has `logoImage: "opponents/OPN123456/logo-1.png"`, `gameType: "LLIHC"`, `time: "4:00 PM"`, and `location: "Planet Ice Peterborough"`

#### Scenario: Past games are excluded
- **WHEN** publishing on 2026-10-01 with games dated 2026-09-30 and 2026-10-01
- **THEN** only the 2026-10-01 game is in `upcoming-games.json`

#### Scenario: Noon and midnight formatting
- **WHEN** games are stored at `12:00` and `00:15`
- **THEN** their published times are `"12:00 PM"` and `"12:15 AM"`

#### Scenario: Missing opponent fails generation
- **WHEN** an upcoming game references an opponent id that does not exist
- **THEN** generation throws an error naming the upcoming game and nothing is uploaded

### Requirement: Upcoming game changes show as unpublished
The publish status indicator SHALL include the UpcomingGame collection's latest `updatedAt` when deciding whether there are unpublished changes.

#### Scenario: Editing an upcoming game after a publish
- **WHEN** an upcoming game is created or edited after the last successful publish completed
- **THEN** the indicator shows unpublished changes
