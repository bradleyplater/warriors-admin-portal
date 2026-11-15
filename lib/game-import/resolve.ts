// Matches a parsed game sheet against portal data and the admin's choices,
// producing the preview: display rows, blocking flags, non-blocking
// warnings, and — only when nothing is flagged — the GameCreateInput to
// save. Pure: the same function backs both the preview and the save action,
// so what's saved is exactly what was previewed (import-game-csv design D5).
import {
  GameCreateInputSchema,
  GOAL_TYPE_LABELS,
  PENALTY_CODE_LABELS,
  type GameCreateInput,
  type GoalType,
  type PenaltyCode,
} from "../schemas";
import { periodIndexOf } from "../derived/score";
import type {
  ParsedSheet,
  SheetGoal,
  SheetPenalty,
  SheetPeriodRow,
  SheetSide,
} from "./parse-sheet";
import {
  eventKey,
  IMPORTABLE_GAME_TYPES,
  type ImportableGameType,
  type ImportFlag,
  type ImportPreview,
  type ImportResolutions,
  type ImportWarning,
  type PortalContext,
  type PreviewGoal,
  type PreviewPenalty,
  type PreviewPlayer,
  type PreviewTime,
} from "./types";

type ContextPlayer = PortalContext["players"][number];

const BENCH_NUMBERS = new Set(["bench", "b"]);

// Case-insensitive, and spaces/hyphens/dots are treated alike so
// "Coulby-Mills" matches "Coulby Mills" (design D3).
const normName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s\-.]+/g, " ")
    .trim();

export const playerDisplayName = (
  player: Pick<ContextPlayer, "firstName" | "surname">,
) => `${player.firstName} ${player.surname}`;

// "M. Silsby" → { initial: "m", surname: "silsby" }. A full name
// ("Matt Silsby") also works: first word gives the initial.
export function splitSheetName(name: string): {
  initial: string;
  surname: string;
} {
  const trimmed = name.trim();
  const dot = trimmed.indexOf(".");
  const space = trimmed.search(/\s/);
  const cut = dot !== -1 && (space === -1 || dot < space) ? dot : space;
  if (cut === -1) return { initial: "", surname: normName(trimmed) };
  return {
    initial: trimmed.slice(0, 1).toLowerCase(),
    surname: normName(trimmed.slice(cut + 1)),
  };
}

function nameMatches(player: ContextPlayer, sheetName: string): boolean {
  const { initial, surname } = splitSheetName(sheetName);
  return (
    initial !== "" &&
    player.firstName.trim().slice(0, 1).toLowerCase() === initial &&
    normName(player.surname) === surname
  );
}

export function parseSheetTime(text: string): PreviewTime {
  const match = /^(\d{1,3}):(\d{2})$/.exec(text.trim());
  if (!match) return { text, minute: null, second: null };
  const minute = Number(match[1]);
  const second = Number(match[2]);
  if (second > 59) return { text, minute: null, second: null };
  return { text, minute, second };
}

// DD-MM-YY (the workbook is UK-formatted), also DD/MM/YYYY etc.
export function parseSheetDate(text: string): string | null {
  const match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(text.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year =
    match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

const isIsoDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

// A date in Aug–Dec of 20YY or Jan–Jul of 20YY+1 belongs to "YY/YY+1"
// (design D6).
export function seasonNameFor(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number);
  const start = month >= 8 ? year : year - 1;
  const two = (n: number) => String(n % 100).padStart(2, "0");
  return `${two(start)}/${two(start + 1)}`;
}

const GOAL_TYPE_ALIASES: Record<string, GoalType> = {
  e: "EVEN",
  es: "EVEN",
  ev: "EVEN",
};

export function mapGoalType(sheetType: string): GoalType | null {
  const key = sheetType.trim().toLowerCase();
  if (key === "") return null;
  if (GOAL_TYPE_ALIASES[key]) return GOAL_TYPE_ALIASES[key];
  for (const [code, label] of Object.entries(GOAL_TYPE_LABELS)) {
    if (code.toLowerCase() === key || label.toLowerCase() === key) {
      return code as GoalType;
    }
  }
  return null;
}

export function mapPenaltyCode(offence: string): PenaltyCode | null {
  const key = normName(offence);
  if (key === "") return null;
  for (const [code, label] of Object.entries(PENALTY_CODE_LABELS)) {
    if (normName(code) === key || normName(label) === key) {
      return code as PenaltyCode;
    }
  }
  return null;
}

function parseDuration(pim: string): number | null {
  const value = Number(pim.trim());
  return pim.trim() !== "" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

const sameText = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

function detectWarriorsSide(
  sheet: ParsedSheet,
  teamName: string,
): "HOME" | "AWAY" | null {
  const team = teamName.trim().toLowerCase();
  const home = sheet.homeTeam.trim().toLowerCase();
  const away = sheet.awayTeam.trim().toLowerCase();
  if (team === "") return null;
  if (home === team && away !== team) return "HOME";
  if (away === team && home !== team) return "AWAY";
  // Looser: one name contains the other ("Warriors" vs "Peterborough
  // Warriors"), but only when exactly one side does.
  const loose = (name: string) =>
    name !== "" && (name.includes(team) || team.includes(name));
  if (loose(home) && !loose(away)) return "HOME";
  if (loose(away) && !loose(home)) return "AWAY";
  return null;
}

// --- Players -------------------------------------------------------------

interface PlayerLookup {
  // The active player matched by both number and name, if any.
  match: ContextPlayer | null;
  suggestion: ContextPlayer | null;
  reason: string;
}

function lookUpPlayer(
  number: string,
  sheetName: string,
  active: ContextPlayer[],
): PlayerLookup {
  const byNumber = active.find((player) => String(player.number) === number);
  const byName =
    sheetName === "" ? [] : active.filter((p) => nameMatches(p, sheetName));

  if (byNumber && byName.includes(byNumber)) {
    return { match: byNumber, suggestion: byNumber, reason: "" };
  }
  if (sheetName === "") {
    return {
      match: null,
      suggestion: byNumber ?? null,
      reason: `Number ${number} isn't in the sheet's player list`,
    };
  }
  const nameMatch = byName[0] ?? null;
  if (byNumber) {
    return {
      match: null,
      suggestion: nameMatch ?? byNumber,
      reason: `Number ${number} belongs to ${playerDisplayName(byNumber)}`,
    };
  }
  if (nameMatch) {
    return {
      match: null,
      suggestion: nameMatch,
      reason: `${sheetName} is number ${nameMatch.number ?? "(none)"} in the portal`,
    };
  }
  return {
    match: null,
    suggestion: null,
    reason: `No active player with number ${number} or name ${sheetName}`,
  };
}

function warriorsNumbers(
  side: SheetSide,
): { number: string; sheetName: string; listed: boolean }[] {
  const rows = side.players
    .filter((player) => player.number !== "")
    .map((player) => ({
      number: player.number,
      sheetName: player.name,
      listed: true,
    }));
  const seen = new Set(rows.map((row) => row.number));
  const add = (number: string) => {
    if (
      number === "" ||
      BENCH_NUMBERS.has(number.toLowerCase()) ||
      seen.has(number)
    )
      return;
    seen.add(number);
    rows.push({ number, sheetName: "", listed: false });
  };
  for (const goal of side.goals) {
    add(goal.scorer);
    add(goal.assist1);
    add(goal.assist2);
  }
  for (const penalty of side.penalties) add(penalty.number);
  return rows;
}

// --- Main ----------------------------------------------------------------

export function resolveImport(
  sheet: ParsedSheet,
  context: PortalContext,
  resolutions: ImportResolutions = {},
): ImportPreview {
  const flags: ImportFlag[] = [];
  const warnings: ImportWarning[] = [];
  const flag = (target: string, message: string) =>
    flags.push({ target, message });

  // Details
  const warriorsSide =
    resolutions.warriorsSide ?? detectWarriorsSide(sheet, context.team.name);
  if (!warriorsSide) {
    flag(
      "detail:warriorsSide",
      `Neither "${sheet.homeTeam}" nor "${sheet.awayTeam}" matches ${context.team.name} — choose which side is the Warriors`,
    );
  }
  const teamSide = warriorsSide === "HOME" ? sheet.home : sheet.away;
  const opponentSide = warriorsSide === "HOME" ? sheet.away : sheet.home;
  const opponentSheetName =
    warriorsSide === "HOME" ? sheet.awayTeam : sheet.homeTeam;

  let opponentId: string | null = null;
  if (resolutions.opponentId) {
    if (context.opponents.some((o) => o._id === resolutions.opponentId)) {
      opponentId = resolutions.opponentId;
    } else {
      flag(
        "detail:opponent",
        "The chosen opponent no longer exists — choose another",
      );
    }
  } else if (warriorsSide) {
    opponentId =
      context.opponents.find(
        (o) => normName(o.name) === normName(opponentSheetName),
      )?._id ?? null;
    if (!opponentId) {
      flag(
        "detail:opponent",
        `No opponent named "${opponentSheetName}" in the portal — choose one`,
      );
    }
  } else {
    flag("detail:opponent", "Choose the opponent");
  }

  let date: string | null = null;
  if (resolutions.date && isIsoDate(resolutions.date)) {
    date = resolutions.date;
  } else {
    date = parseSheetDate(sheet.date);
    if (!date)
      flag("detail:date", `Couldn't read the date "${sheet.date}" — enter it`);
  }

  let seasonId: string | null = null;
  if (resolutions.seasonId) {
    if (context.seasons.some((s) => s._id === resolutions.seasonId)) {
      seasonId = resolutions.seasonId;
    } else {
      flag(
        "detail:season",
        "The chosen season no longer exists — choose another",
      );
    }
  } else if (date) {
    const name = seasonNameFor(date);
    seasonId = context.seasons.find((s) => s.name === name)?._id ?? null;
    if (!seasonId)
      flag("detail:season", `No season ${name} in the portal — choose one`);
  } else {
    flag("detail:season", "Choose the season");
  }

  let gameType: ImportableGameType | null = resolutions.gameType ?? null;
  if (!gameType) {
    gameType =
      IMPORTABLE_GAME_TYPES.find((type) => sameText(type, sheet.competition)) ??
      null;
    if (!gameType) {
      flag(
        "detail:gameType",
        sheet.competition === ""
          ? "The sheet has no competition — choose the game type"
          : `"${sheet.competition}" isn't a known game type — choose one`,
      );
    }
  }

  // Warriors players
  const active = context.players.filter((player) => player.active);
  const players: PreviewPlayer[] = warriorsSide
    ? warriorsNumbers(teamSide).map(({ number, sheetName, listed }) => {
        const chosen = resolutions.players?.[number];
        const lookup = lookUpPlayer(number, sheetName, active);
        if (chosen && context.players.some((p) => p._id === chosen)) {
          return {
            number,
            sheetName,
            listed,
            playerId: chosen,
            status: "resolved",
            suggestedPlayerId: lookup.suggestion?._id ?? null,
          };
        }
        if (lookup.match) {
          return {
            number,
            sheetName,
            listed,
            playerId: lookup.match._id,
            status: "matched",
            suggestedPlayerId: lookup.match._id,
          };
        }
        flag(`player:${number}`, lookup.reason);
        return {
          number,
          sheetName,
          listed,
          playerId: null,
          status: "flagged",
          suggestedPlayerId: lookup.suggestion?._id ?? null,
        };
      })
    : [];

  const byPlayerId = new Map<string, PreviewPlayer[]>();
  for (const row of players) {
    if (!row.playerId) continue;
    byPlayerId.set(row.playerId, [
      ...(byPlayerId.get(row.playerId) ?? []),
      row,
    ]);
  }
  for (const [playerId, rows] of byPlayerId) {
    if (rows.length < 2) continue;
    const player = context.players.find((p) => p._id === playerId);
    const numbers = rows.map((row) => row.number).join(" and ");
    for (const row of rows) {
      row.status = "flagged";
      flag(
        `player:${row.number}`,
        `Numbers ${numbers} are both ${player ? playerDisplayName(player) : playerId} — choose different players`,
      );
    }
  }

  const playerIdFor = (number: string) =>
    players.find((row) => row.number === number)?.playerId ?? null;

  // Events
  const opponentNames = new Map(
    opponentSide.players.map((player) => [player.number, player.name]),
  );
  const opponentName = (number: string, key: string) => {
    if (BENCH_NUMBERS.has(number.toLowerCase())) return "Bench";
    const name = opponentNames.get(number);
    if (name) return name;
    const label = number === "" ? "Unknown" : `#${number}`;
    warnings.push({
      message: `Opponent number ${number || "(blank)"} isn't in their player list — recorded as "${label}" (${key})`,
    });
    return label;
  };

  const readGoal = (
    side: "team" | "opponent",
    goal: SheetGoal,
    index: number,
  ): PreviewGoal => {
    const key = eventKey("goal", side, index);
    const time = parseSheetTime(goal.time);
    const type = resolutions.goalTypes?.[key] ?? mapGoalType(goal.type);
    if (!type) {
      flag(
        `${key}:type`,
        goal.type === ""
          ? "Goal type is blank — choose one"
          : `Unknown goal type "${goal.type}" — choose one`,
      );
    }
    if (time.minute === null) {
      flag(`${key}:time`, `Can't read goal time "${goal.time}"`);
    } else if (type !== "SO" && time.minute > 59) {
      flag(
        `${key}:time`,
        `Goal time ${goal.time} is outside the game's 60 minutes`,
      );
    }
    if (side === "team") {
      if (goal.scorer === "")
        flag(`${key}:scorer`, "Goal has no scorer number");
      const assists = [goal.assist1, goal.assist2].filter((n) => n !== "");
      return {
        key,
        time,
        sheetType: goal.type,
        type,
        scorer: goal.scorer,
        assists,
      };
    }
    return {
      key,
      time,
      sheetType: goal.type,
      type,
      scorer: opponentName(goal.scorer, key),
      assists: [],
    };
  };

  const readPenalty = (
    side: "team" | "opponent",
    penalty: SheetPenalty,
    index: number,
  ): PreviewPenalty => {
    const key = eventKey("penalty", side, index);
    const time = parseSheetTime(penalty.given);
    const code =
      resolutions.penaltyCodes?.[key] ?? mapPenaltyCode(penalty.offence);
    const duration = parseDuration(penalty.pim);
    if (!code) {
      flag(
        `${key}:code`,
        penalty.offence === ""
          ? "Offence is blank — choose one"
          : `Unknown offence "${penalty.offence}" — choose one`,
      );
    }
    if (time.minute === null) {
      flag(`${key}:time`, `Can't read penalty time "${penalty.given}"`);
    } else if (time.minute > 59) {
      flag(
        `${key}:time`,
        `Penalty time ${penalty.given} is outside the game's 60 minutes`,
      );
    }
    if (duration === null)
      flag(`${key}:duration`, `Can't read penalty minutes "${penalty.pim}"`);
    if (side === "team") {
      const isBench = BENCH_NUMBERS.has(penalty.number.toLowerCase());
      if (penalty.number === "")
        flag(`${key}:offender`, "Penalty has no player number");
      return {
        key,
        time,
        sheetOffence: penalty.offence,
        code,
        offender: isBench ? "BENCH" : penalty.number,
        duration,
      };
    }
    return {
      key,
      time,
      sheetOffence: penalty.offence,
      code,
      offender: opponentName(penalty.number, key),
      duration,
    };
  };

  const goals = warriorsSide
    ? teamSide.goals.map((g, i) => readGoal("team", g, i))
    : [];
  const penalties = warriorsSide
    ? teamSide.penalties.map((p, i) => readPenalty("team", p, i))
    : [];
  const opponentGoals = warriorsSide
    ? opponentSide.goals.map((g, i) => readGoal("opponent", g, i))
    : [];
  const opponentPenalties = warriorsSide
    ? opponentSide.penalties.map((p, i) => readPenalty("opponent", p, i))
    : [];

  // Cross-checks (warnings only, design D8)
  if (warriorsSide) {
    crossCheckPlayerTotals(teamSide, warnings);
    const teamName = warriorsSide === "HOME" ? sheet.homeTeam : sheet.awayTeam;
    const sides = [
      {
        label: teamName,
        sheetName: teamName,
        otherName: opponentSheetName,
        goals,
        penalties,
      },
      {
        label: opponentSheetName,
        sheetName: opponentSheetName,
        otherName: teamName,
        goals: opponentGoals,
        penalties: opponentPenalties,
      },
    ];
    const homeFirst = warriorsSide === "HOME" ? sides : [sides[1], sides[0]];
    homeFirst.forEach((side, order) => {
      const scoreRow = pickPeriodRow(
        sheet.periodScores,
        side.sheetName,
        side.otherName,
        order,
      );
      if (scoreRow) {
        comparePeriods(
          scoreRow,
          side.goals
            .filter((g) => g.type !== "SO")
            .map((g) => ({ minute: g.time.minute, amount: 1 })),
          `${side.label} goals`,
          warnings,
        );
      }
      const pimRow = pickPeriodRow(
        sheet.penaltyMinutes,
        side.sheetName,
        side.otherName,
        order,
      );
      if (pimRow) {
        comparePeriods(
          pimRow,
          side.penalties.map((p) => ({
            minute: p.time.minute,
            amount: p.duration ?? 0,
          })),
          `${side.label} penalty minutes`,
          warnings,
        );
      }
    });
  }

  if (opponentId && date) {
    const duplicate = context.games.find(
      (game) =>
        game.opponentTeam.opponentId === opponentId &&
        game.date.toISOString().slice(0, 10) === date,
    );
    if (duplicate) {
      warnings.push({
        message:
          "A game against this opponent on this date already exists — this may be a duplicate",
        gameId: duplicate._id,
      });
    }
  }

  const preview: ImportPreview = {
    details: {
      homeTeam: sheet.homeTeam,
      awayTeam: sheet.awayTeam,
      sheetDate: sheet.date,
      competition: sheet.competition,
      warriorsSide,
      opponentSheetName,
      opponentId,
      date,
      seasonId,
      gameType,
    },
    players,
    goals,
    penalties,
    opponentGoals,
    opponentPenalties,
    flags,
    warnings,
    input: null,
  };

  if (
    flags.length > 0 ||
    !warriorsSide ||
    !opponentId ||
    !date ||
    !seasonId ||
    !gameType
  ) {
    return preview;
  }

  const input: GameCreateInput = {
    date: new Date(date),
    seasonId,
    type: gameType,
    location: warriorsSide,
    team: {
      id: context.team._id,
      roster: players.map((row) => ({ playerId: row.playerId! })),
      goals: goals.map((goal) => {
        const [assist1, assist2] = goal.assists.map((n) => playerIdFor(n)!);
        return {
          scoredBy: playerIdFor(goal.scorer)!,
          ...(assist1 ? { assist1 } : {}),
          ...(assist2 ? { assist2 } : {}),
          minute: goal.time.minute!,
          second: goal.time.second!,
          type: goal.type!,
        };
      }),
      penalties: penalties.map((penalty) => ({
        offender:
          penalty.offender === "BENCH"
            ? "BENCH"
            : playerIdFor(penalty.offender)!,
        minute: penalty.time.minute!,
        second: penalty.time.second!,
        type: penalty.code!,
        duration: penalty.duration!,
      })),
    },
    opponentTeam: {
      opponentId,
      goals: opponentGoals.map((goal) => ({
        scoredBy: goal.scorer,
        minute: goal.time.minute!,
        second: goal.time.second!,
        type: goal.type!,
      })),
      penalties: opponentPenalties.map((penalty) => ({
        offender: penalty.offender,
        minute: penalty.time.minute!,
        second: penalty.time.second!,
        type: penalty.code!,
        duration: penalty.duration!,
      })),
    },
  };

  // Belt and braces: the rules above should already cover the schema, but
  // anything they miss (e.g. a scorer also listed as their own assist) must
  // block saving rather than fail in createGame.
  const parsed = GameCreateInputSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      flags.push({
        target: `schema:${issue.path.join(".")}`,
        message: `${issue.path.join(".")}: ${issue.message}`,
      });
    }
    return preview;
  }
  preview.input = parsed.data;
  return preview;
}

// --- Cross-checks --------------------------------------------------------

function crossCheckPlayerTotals(side: SheetSide, warnings: ImportWarning[]) {
  // A column is only checked when the sheet filled it in for someone —
  // a sheet with no totals at all shouldn't warn for every scorer.
  const used = {
    goals: side.players.some((p) => p.goals !== null),
    assists: side.players.some((p) => p.assists !== null),
    pim: side.players.some((p) => p.pim !== null),
  };
  for (const player of side.players) {
    const counts = {
      goals: side.goals.filter((g) => g.scorer === player.number).length,
      assists: side.goals.filter(
        (g) => g.assist1 === player.number || g.assist2 === player.number,
      ).length,
      pim: side.penalties
        .filter((p) => p.number === player.number)
        .reduce((sum, p) => sum + (parseDuration(p.pim) ?? 0), 0),
    };
    const labels = { goals: "goals", assists: "assists", pim: "PIM" } as const;
    for (const column of ["goals", "assists", "pim"] as const) {
      if (!used[column]) continue;
      const sheetValue = player[column] ?? 0;
      if (sheetValue !== counts[column]) {
        warnings.push({
          message: `${player.number} ${player.name}: sheet says ${sheetValue} ${labels[column]}, the event rows give ${counts[column]}`,
        });
      }
    }
  }
}

function pickPeriodRow(
  rows: SheetPeriodRow[],
  sheetName: string,
  otherName: string,
  order: number,
): SheetPeriodRow | undefined {
  // The table often shortens names ("Bradford" for "Bradford Ice Wolves").
  const matches = (row: SheetPeriodRow, name: string) => {
    const a = normName(row.team);
    const b = normName(name);
    return a !== "" && b !== "" && (a.includes(b) || b.includes(a));
  };
  const named = rows.find(
    (row) => matches(row, sheetName) && !matches(row, otherName),
  );
  return named ?? rows[order];
}

function comparePeriods(
  row: SheetPeriodRow,
  events: { minute: number | null; amount: number }[],
  label: string,
  warnings: ImportWarning[],
) {
  const totals = [0, 0, 0, 0]; // periods 1-3, then OT
  for (const event of events) {
    if (event.minute === null) continue;
    totals[Math.min(periodIndexOf(event.minute), 3)] += event.amount;
  }
  const sheetValues = [...row.periods, row.ot];
  const names = ["period 1", "period 2", "period 3", "OT"];
  sheetValues.forEach((value, index) => {
    // A blank cell means nothing recorded; only OT is commonly left blank.
    const sheetValue = value ?? 0;
    if (value === null && index < 3) return;
    if (sheetValue !== totals[index]) {
      warnings.push({
        message: `${label}, ${names[index]}: sheet says ${sheetValue}, the event rows give ${totals[index]}`,
      });
    }
  });
}
