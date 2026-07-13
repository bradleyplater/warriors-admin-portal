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
