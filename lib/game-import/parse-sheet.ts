// Reads an EIHA Rec game sheet (a season-workbook tab exported as CSV) into
// its raw content, with no portal knowledge. Every section is found by its
// label rather than a fixed cell, so a sheet with columns or rows shifted a
// little still parses (import-game-csv design D2).

export class NotAGameSheetError extends Error {
  constructor(message = "This file isn't a recognised game sheet.") {
    super(message);
    this.name = "NotAGameSheetError";
  }
}

export interface SheetPlayer {
  number: string;
  name: string;
  // Totals as written on the sheet; null when the cell is blank.
  goals: number | null;
  assists: number | null;
  pim: number | null;
}

export interface SheetGoal {
  time: string;
  type: string;
  scorer: string;
  assist1: string;
  assist2: string;
}

export interface SheetPenalty {
  number: string;
  pim: string;
  offence: string;
  given: string;
}

export interface SheetSide {
  players: SheetPlayer[];
  goals: SheetGoal[];
  penalties: SheetPenalty[];
}

// One team's row of the "Period Scores" or "Penalty Minutes" table.
export interface SheetPeriodRow {
  team: string;
  periods: (number | null)[]; // periods 1-3
  ot: number | null;
  total: number | null;
}

export interface ParsedSheet {
  homeTeam: string;
  awayTeam: string;
  date: string;
  competition: string;
  home: SheetSide;
  away: SheetSide;
  periodScores: SheetPeriodRow[];
  penaltyMinutes: SheetPeriodRow[];
}

type Grid = string[][];

const norm = (value: string | undefined) => (value ?? "").trim().toLowerCase();

const cell = (grid: Grid, row: number, col: number) =>
  (grid[row]?.[col] ?? "").trim();

// Shirt numbers are compared as text, so "07" and "7" must be the same.
export function normaliseShirtNumber(value: string): string {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? String(Number(trimmed)) : trimmed;
}

function toCount(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

function findRow(grid: Grid, label: string, from = 0): number {
  for (let row = from; row < grid.length; row++) {
    if (grid[row].some((value) => norm(value) === label)) return row;
  }
  return -1;
}

// The first non-empty cell to the right of a label, e.g. "Home Team:".
function valueRightOf(grid: Grid, label: string): string {
  for (let row = 0; row < grid.length; row++) {
    const col = grid[row].findIndex((value) => norm(value) === label);
    if (col === -1) continue;
    for (let next = col + 1; next < grid[row].length; next++) {
      const value = cell(grid, row, next);
      if (value !== "") return value;
    }
    return "";
  }
  return "";
}

const TIME_PATTERN = /^\d{1,3}:\d{2}$/;

function parseSide(grid: Grid, anchorRow: number, endRow: number): SheetSide {
  let headerRow = -1;
  for (let row = anchorRow + 1; row < endRow; row++) {
    if (grid[row].some((value) => norm(value) === "player")) {
      headerRow = row;
      break;
    }
  }
  if (headerRow === -1) throw new NotAGameSheetError();

  const header = grid[headerRow].map(norm);
  const playerCol = header.indexOf("player");
  const timeCol = header.indexOf("time");
  const pimCol = header.indexOf("pim");
  if (timeCol === -1 || pimCol === -1) throw new NotAGameSheetError();

  const side: SheetSide = { players: [], goals: [], penalties: [] };

  for (let row = headerRow + 1; row < endRow; row++) {
    const at = (col: number) => cell(grid, row, col);

    const number = normaliseShirtNumber(at(playerCol - 1));
    const name = at(playerCol);
    if (number !== "" || name !== "") {
      side.players.push({
        number,
        name,
        goals: toCount(at(playerCol + 1)),
        assists: toCount(at(playerCol + 2)),
        pim: toCount(at(playerCol + 3)),
      });
    }

    // A scoring row counts when anything besides the row number is filled
    // in — except a lone non-time value in the Time column (the example
    // sheet has a stray "0" below its scoring table).
    const goal: SheetGoal = {
      time: at(timeCol),
      type: at(timeCol + 1),
      scorer: normaliseShirtNumber(at(timeCol + 2)),
      assist1: normaliseShirtNumber(at(timeCol + 3)),
      assist2: normaliseShirtNumber(at(timeCol + 4)),
    };
    if (
      goal.type !== "" ||
      goal.scorer !== "" ||
      goal.assist1 !== "" ||
      goal.assist2 !== "" ||
      TIME_PATTERN.test(goal.time)
    ) {
      side.goals.push(goal);
    }

    const penalty: SheetPenalty = {
      number: normaliseShirtNumber(at(pimCol - 1)),
      pim: at(pimCol),
      offence: at(pimCol + 1),
      given: at(pimCol + 2),
    };
    if (
      penalty.number !== "" ||
      penalty.pim !== "" ||
      penalty.offence !== "" ||
      penalty.given !== ""
    ) {
      side.penalties.push(penalty);
    }
  }

  return side;
}

// "Period Scores" / "Penalty Minutes": a header row of 1,2,3,OT,Total and
// one row per team beneath it, with the team name under the label.
function parsePeriodTable(grid: Grid, label: string): SheetPeriodRow[] {
  const row = findRow(grid, label);
  if (row === -1) return [];
  const labelCol = grid[row].findIndex((value) => norm(value) === label);
  const header = grid[row].map(norm);
  const colOf = (name: string) => header.indexOf(name, labelCol + 1);
  const periodCols = ["1", "2", "3"].map(colOf);
  const otCol = colOf("ot");
  const totalCol = colOf("total");

  const rows: SheetPeriodRow[] = [];
  for (let next = row + 1; next < grid.length && rows.length < 2; next++) {
    const team = cell(grid, next, labelCol);
    if (team === "") break;
    const read = (col: number) =>
      col === -1 ? null : toCount(cell(grid, next, col));
    rows.push({
      team,
      periods: periodCols.map(read),
      ot: read(otCol),
      total: read(totalCol),
    });
  }
  return rows;
}

export function parseGameSheet(grid: Grid): ParsedSheet {
  const homeRow = findRow(grid, "home team");
  const awayRow = findRow(grid, "away team");
  if (homeRow === -1 || awayRow === -1) throw new NotAGameSheetError();

  const [firstRow, secondRow] =
    homeRow < awayRow ? [homeRow, awayRow] : [awayRow, homeRow];
  const first = parseSide(grid, firstRow, secondRow);
  const second = parseSide(grid, secondRow, grid.length);
  const [home, away] = homeRow < awayRow ? [first, second] : [second, first];

  return {
    homeTeam: valueRightOf(grid, "home team:"),
    awayTeam: valueRightOf(grid, "away team:"),
    date: valueRightOf(grid, "date:"),
    competition: valueRightOf(grid, "competition:"),
    home,
    away,
    periodScores: parsePeriodTable(grid, "period scores"),
    penaltyMinutes: parsePeriodTable(grid, "penalty minutes"),
  };
}
