"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import {
  GOAL_TYPE_LABELS,
  PENALTY_CODE_LABELS,
  type GoalType,
  type PenaltyCode,
} from "@/lib/schemas/enums";
import {
  IMPORTABLE_GAME_TYPES,
  type ImportableGameType,
  type ImportPreview,
  type ImportResolutions,
  type PreviewGoal,
  type PreviewPenalty,
  type PreviewPlayer,
} from "@/lib/game-import/types";
import {
  Badge,
  Button,
  Card,
  FieldErrors,
  Message,
  SectionHeading,
  SelectField,
  TextField,
} from "@/app/_ui";
import { previewGameImportAction, saveGameImportAction } from "./actions";

export interface ImportPlayerOption {
  id: string;
  name: string;
  number: number | null;
  active: boolean;
}

interface Option {
  id: string;
  name: string;
}

const FLAGGED_ROW = "bg-[color:var(--st-danger-surface)]";

const DETAIL_LABELS: Record<string, string> = {
  warriorsSide: "Warriors side",
  opponent: "Opponent",
  date: "Date",
  season: "Season",
  gameType: "Game type",
};

function formatLongDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function GameImport({
  players,
  opponents,
  seasons,
}: {
  players: ImportPlayerOption[];
  opponents: Option[];
  seasons: Option[];
}) {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<ImportResolutions>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const playersById = new Map(players.map((p) => [p.id, p]));

  function runPreview(text: string, next: ImportResolutions) {
    startTransition(async () => {
      const result = await previewGameImportAction(text, next);
      if (result.ok) {
        setPreview(result.preview);
        setError(null);
      } else {
        setPreview(null);
        setError(result.error);
      }
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setResolutions({});
    runPreview(text, {});
  }

  function resolve(change: (current: ImportResolutions) => ImportResolutions) {
    if (csvText === null) return;
    const next = change(resolutions);
    setResolutions(next);
    runPreview(csvText, next);
  }

  function save() {
    if (csvText === null) return;
    startTransition(async () => {
      // Redirects to the new game on success; only failures return.
      const result = await saveGameImportAction(csvText, resolutions);
      setError(result.error);
      if (result.preview) setPreview(result.preview);
    });
  }

  const flagsFor = (prefix: string) =>
    preview?.flags
      .filter((f) => f.target === prefix || f.target.startsWith(`${prefix}:`))
      .map((f) => f.message) ?? [];

  const playerLabel = (number: string) => {
    if (number === "BENCH") return "Bench";
    const row = preview?.players.find((p) => p.number === number);
    const player = row?.playerId ? playersById.get(row.playerId) : undefined;
    return player ? `#${number} ${player.name}` : `#${number} (unresolved)`;
  };

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <TextField
          id="csv-file"
          label="Game sheet CSV"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => onFile(event.currentTarget.files?.[0])}
          hint="One game tab from the season workbook, exported as CSV."
        />
      </Card>

      {pending && <p className="t-label text-fg-secondary">Reading…</p>}

      {error && (
        <Message tone="danger" title="Not imported">
          {error}
        </Message>
      )}

      {preview && (
        <>
          <Summary preview={preview} />

          <section className="flex flex-col gap-4">
            <SectionHeading>Game details</SectionHeading>
            <Card className="flex flex-col gap-4">
              <p className="m-0">
                <strong>{preview.details.homeTeam || "—"}</strong> (home) v{" "}
                <strong>{preview.details.awayTeam || "—"}</strong> (away) ·{" "}
                {formatLongDate(preview.details.date)} · Warriors{" "}
                <span className="wr-num wr-strong" data-testid="import-score">
                  {preview.goals.length} — {preview.opponentGoals.length}
                </span>
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SelectField
                  id="import-side"
                  label="Warriors are"
                  value={preview.details.warriorsSide ?? ""}
                  errors={flagsFor("detail:warriorsSide")}
                  onChange={(e) =>
                    resolve((r) => ({
                      ...r,
                      warriorsSide: e.target.value as "HOME" | "AWAY",
                      // Switching sides changes every player row.
                      players: {},
                      goalTypes: {},
                      penaltyCodes: {},
                    }))
                  }
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  <option value="HOME">
                    Home ({preview.details.homeTeam})
                  </option>
                  <option value="AWAY">
                    Away ({preview.details.awayTeam})
                  </option>
                </SelectField>
                <SelectField
                  id="import-opponent"
                  label={`Opponent${preview.details.opponentSheetName ? ` (sheet: ${preview.details.opponentSheetName})` : ""}`}
                  value={preview.details.opponentId ?? ""}
                  errors={flagsFor("detail:opponent")}
                  onChange={(e) =>
                    resolve((r) => ({ ...r, opponentId: e.target.value }))
                  }
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {opponents.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  id="import-date"
                  label={`Date (sheet: ${preview.details.sheetDate || "blank"})`}
                  type="date"
                  value={preview.details.date ?? ""}
                  errors={flagsFor("detail:date")}
                  onChange={(e) =>
                    e.target.value &&
                    resolve((r) => ({ ...r, date: e.target.value }))
                  }
                />
                <SelectField
                  id="import-season"
                  label="Season"
                  value={preview.details.seasonId ?? ""}
                  errors={flagsFor("detail:season")}
                  onChange={(e) =>
                    resolve((r) => ({ ...r, seasonId: e.target.value }))
                  }
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  id="import-game-type"
                  label={`Game type${preview.details.competition ? ` (sheet: ${preview.details.competition})` : ""}`}
                  value={preview.details.gameType ?? ""}
                  errors={flagsFor("detail:gameType")}
                  onChange={(e) =>
                    resolve((r) => ({
                      ...r,
                      gameType: e.target.value as ImportableGameType,
                    }))
                  }
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {IMPORTABLE_GAME_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </SelectField>
              </div>
            </Card>
          </section>

          <PlayersSection
            rows={preview.players}
            players={players}
            flagsFor={flagsFor}
            onChoose={(number, playerId) =>
              resolve((r) => ({
                ...r,
                players: { ...r.players, [number]: playerId },
              }))
            }
          />

          <GoalsSection
            title="Warriors goals"
            testId="import-goals"
            goals={preview.goals}
            flagsFor={flagsFor}
            scorerLabel={playerLabel}
            onChooseType={(key, type) =>
              resolve((r) => ({
                ...r,
                goalTypes: { ...r.goalTypes, [key]: type },
              }))
            }
          />
          <PenaltiesSection
            title="Warriors penalties"
            testId="import-penalties"
            penalties={preview.penalties}
            flagsFor={flagsFor}
            offenderLabel={playerLabel}
            onChooseCode={(key, code) =>
              resolve((r) => ({
                ...r,
                penaltyCodes: { ...r.penaltyCodes, [key]: code },
              }))
            }
          />
          <GoalsSection
            title="Opponent goals"
            testId="import-opponent-goals"
            goals={preview.opponentGoals}
            flagsFor={flagsFor}
            scorerLabel={(name) => name}
            onChooseType={(key, type) =>
              resolve((r) => ({
                ...r,
                goalTypes: { ...r.goalTypes, [key]: type },
              }))
            }
          />
          <PenaltiesSection
            title="Opponent penalties"
            testId="import-opponent-penalties"
            penalties={preview.opponentPenalties}
            flagsFor={flagsFor}
            offenderLabel={(name) => name}
            onChooseCode={(key, code) =>
              resolve((r) => ({
                ...r,
                penaltyCodes: { ...r.penaltyCodes, [key]: code },
              }))
            }
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              disabled={pending || preview.input === null}
              onClick={save}
            >
              Save to database
            </Button>
            {preview.input === null && (
              <span className="t-label text-fg-secondary">
                Fix the flagged items to enable saving.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Summary({ preview }: { preview: ImportPreview }) {
  const count = preview.flags.length;
  // Detail and schema flags have no table row of their own, so list them
  // here; player and event flags are shown on their rows.
  const general = preview.flags.filter(
    (f) => f.target.startsWith("detail:") || f.target.startsWith("schema:"),
  );
  return (
    <div className="flex flex-col gap-3" data-testid="import-summary">
      {count > 0 ? (
        <Message
          tone="danger"
          title={`${count} ${count === 1 ? "item needs" : "items need"} fixing before saving`}
        >
          {general.length > 0
            ? general
                .map((f) => {
                  const field = f.target.split(":")[1];
                  return `${DETAIL_LABELS[field] ?? field}: ${f.message}`;
                })
                .join(" · ")
            : "Flagged rows are highlighted below."}
        </Message>
      ) : (
        <Message tone="success" title="Ready to save">
          Everything on the sheet has been matched. Check it over, then save.
        </Message>
      )}
      {preview.warnings.length > 0 && (
        <div className="wr-message wr-message--warning" role="status">
          <span aria-hidden="true" className="wr-message__glyph">
            !
          </span>
          <div>
            <strong className="wr-message__title">
              {preview.warnings.length}{" "}
              {preview.warnings.length === 1 ? "warning" : "warnings"} — saving
              is still allowed
            </strong>
            <ul className="m-0 mt-1 pl-5" data-testid="import-warnings">
              {preview.warnings.map((w) => (
                <li key={w.message}>
                  {w.message}
                  {w.gameId && (
                    <>
                      {" "}
                      —{" "}
                      <Link href={`/games/${w.gameId}`}>
                        view existing game
                      </Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ row }: { row: PreviewPlayer }) {
  if (row.status === "matched") return <Badge tone="success">Matched</Badge>;
  if (row.status === "resolved") return <Badge tone="info">Chosen</Badge>;
  return <Badge tone="danger">Fix</Badge>;
}

function PlayersSection({
  rows,
  players,
  flagsFor,
  onChoose,
}: {
  rows: PreviewPlayer[];
  players: ImportPlayerOption[];
  flagsFor: (prefix: string) => string[];
  onChoose: (number: string, playerId: string) => void;
}) {
  const optionLabel = (p: ImportPlayerOption) =>
    `${p.number !== null ? `#${p.number} ` : ""}${p.name}${p.active ? "" : " (inactive)"}`;
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading count={`${rows.length} players`}>
        Warriors roster
      </SectionHeading>
      <Card flush>
        <table className="wr-table" data-testid="import-players">
          <thead>
            <tr>
              <th className="w-16">No.</th>
              <th>On sheet</th>
              <th>Portal player</th>
              <th className="wr-right w-28">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const flags = flagsFor(`player:${row.number}`);
              const suggested = players.find(
                (p) => p.id === row.suggestedPlayerId,
              );
              return (
                <tr
                  key={row.number}
                  className={row.status === "flagged" ? FLAGGED_ROW : undefined}
                  data-testid={`import-player-${row.number}`}
                  data-status={row.status}
                >
                  <td className="wr-num">{row.number}</td>
                  <td>
                    {row.sheetName || (
                      <span className="text-fg-secondary">
                        Not in player list
                      </span>
                    )}
                  </td>
                  <td>
                    <select
                      aria-label={`Portal player for sheet number ${row.number}`}
                      className="wr-input"
                      value={row.playerId ?? ""}
                      aria-invalid={flags.length > 0 || undefined}
                      onChange={(e) => onChoose(row.number, e.target.value)}
                    >
                      <option value="" disabled>
                        Choose player…
                      </option>
                      {suggested && (
                        <option value={suggested.id}>
                          {optionLabel(suggested)} (suggested)
                        </option>
                      )}
                      {players
                        .filter((p) => p.id !== suggested?.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {optionLabel(p)}
                          </option>
                        ))}
                    </select>
                    <FieldErrors messages={flags} />
                  </td>
                  <td className="wr-right">
                    <StatusBadge row={row} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

function EventTable({
  title,
  testId,
  count,
  headers,
  children,
}: {
  title: string;
  testId: string;
  count: number;
  headers: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading count={String(count)}>{title}</SectionHeading>
      {count === 0 ? (
        <p className="m-0 text-fg-secondary">None on the sheet.</p>
      ) : (
        <Card flush>
          <table className="wr-table" data-testid={testId}>
            <thead>
              <tr>{headers}</tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </Card>
      )}
    </section>
  );
}

function GoalsSection({
  title,
  testId,
  goals,
  flagsFor,
  scorerLabel,
  onChooseType,
}: {
  title: string;
  testId: string;
  goals: PreviewGoal[];
  flagsFor: (prefix: string) => string[];
  scorerLabel: (scorer: string) => string;
  onChooseType: (key: string, type: GoalType) => void;
}) {
  return (
    <EventTable
      title={title}
      testId={testId}
      count={goals.length}
      headers={
        <>
          <th className="w-20">Time</th>
          <th className="w-48">Type</th>
          <th>Scorer</th>
          <th>Assists</th>
        </>
      }
    >
      {goals.map((goal) => {
        const flags = flagsFor(goal.key);
        const typeFlagged = flagsFor(`${goal.key}:type`).length > 0;
        return (
          <tr
            key={goal.key}
            className={flags.length > 0 ? FLAGGED_ROW : undefined}
          >
            <td className="wr-num">{goal.time.text || "—"}</td>
            <td>
              {typeFlagged || !goal.type ? (
                <select
                  aria-label={`Goal type for goal at ${goal.time.text}`}
                  className="wr-input"
                  value={goal.type ?? ""}
                  onChange={(e) =>
                    onChooseType(goal.key, e.target.value as GoalType)
                  }
                >
                  <option value="" disabled>
                    Sheet: {goal.sheetType || "blank"} — choose…
                  </option>
                  {Object.entries(GOAL_TYPE_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                GOAL_TYPE_LABELS[goal.type as keyof typeof GOAL_TYPE_LABELS]
              )}
            </td>
            <td>{scorerLabel(goal.scorer)}</td>
            <td>
              {goal.assists.map(scorerLabel).join(", ") || "—"}
              <FieldErrors messages={flags} />
            </td>
          </tr>
        );
      })}
    </EventTable>
  );
}

function PenaltiesSection({
  title,
  testId,
  penalties,
  flagsFor,
  offenderLabel,
  onChooseCode,
}: {
  title: string;
  testId: string;
  penalties: PreviewPenalty[];
  flagsFor: (prefix: string) => string[];
  offenderLabel: (offender: string) => string;
  onChooseCode: (key: string, code: PenaltyCode) => void;
}) {
  return (
    <EventTable
      title={title}
      testId={testId}
      count={penalties.length}
      headers={
        <>
          <th className="w-20">Time</th>
          <th>Player</th>
          <th className="w-56">Offence</th>
          <th className="wr-right w-20">PIM</th>
        </>
      }
    >
      {penalties.map((penalty) => {
        const flags = flagsFor(penalty.key);
        const codeFlagged = flagsFor(`${penalty.key}:code`).length > 0;
        return (
          <tr
            key={penalty.key}
            className={flags.length > 0 ? FLAGGED_ROW : undefined}
          >
            <td className="wr-num">{penalty.time.text || "—"}</td>
            <td>
              {offenderLabel(penalty.offender)}
              <FieldErrors messages={flags} />
            </td>
            <td>
              {codeFlagged || !penalty.code ? (
                <select
                  aria-label={`Offence for penalty at ${penalty.time.text}`}
                  className="wr-input"
                  value={penalty.code ?? ""}
                  onChange={(e) =>
                    onChooseCode(penalty.key, e.target.value as PenaltyCode)
                  }
                >
                  <option value="" disabled>
                    Sheet: {penalty.sheetOffence || "blank"} — choose…
                  </option>
                  {Object.entries(PENALTY_CODE_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                PENALTY_CODE_LABELS[
                  penalty.code as keyof typeof PENALTY_CODE_LABELS
                ]
              )}
            </td>
            <td className="wr-num wr-right">
              {penalty.duration !== null ? `${penalty.duration} min` : "—"}
            </td>
          </tr>
        );
      })}
    </EventTable>
  );
}
