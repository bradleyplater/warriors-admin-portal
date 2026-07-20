export class DuplicateShirtNumberError extends Error {
  readonly number: number;

  constructor(number: number) {
    super(`An active player with number ${number} already exists`);
    this.name = "DuplicateShirtNumberError";
    this.number = number;
  }
}

export class DuplicateSeasonError extends Error {
  readonly seasonId: string;

  constructor(seasonId: string) {
    super(`Season "${seasonId}" already exists`);
    this.name = "DuplicateSeasonError";
    this.seasonId = seasonId;
  }
}

export class NotFoundError extends Error {
  constructor(collection: string, id: string) {
    super(`${collection} "${id}" not found`);
    this.name = "NotFoundError";
  }
}

export interface BlockedRosterPlayer {
  playerId: string;
  goalCount: number; // as scorer
  assistCount: number; // as assist1 or assist2
  penaltyCount: number; // as offender
  isNetminder: boolean;
  isManOfTheMatch: boolean;
  isWarriorOfTheGame: boolean;
}

// Thrown by updateGameRoster AFTER the safe part of a roster change has
// already been written — see design.md's "throw after commit" decision.
// `blocked` carries structured counts, not a pre-formatted message: the
// action layer has the player list loaded (for the picker) and composes
// the human-readable message from this data.
export class RosterPlayerReferencedError extends Error {
  readonly blocked: BlockedRosterPlayer[];

  constructor(blocked: BlockedRosterPlayer[]) {
    super(
      `Cannot remove player(s) still referenced by this game: ${blocked
        .map((entry) => entry.playerId)
        .join(", ")}`,
    );
    this.name = "RosterPlayerReferencedError";
    this.blocked = blocked;
  }
}
