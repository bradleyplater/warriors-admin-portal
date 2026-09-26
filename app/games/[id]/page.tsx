import { notFound } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { getGame, getSeason, listPlayers } from "@/lib/repositories";
import { deriveScore } from "@/lib/derived/score";
import { GOAL_TYPE_LABELS, PENALTY_CODE_LABELS } from "@/lib/schemas";
import type { Player } from "@/lib/schemas";
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  SectionHeading,
} from "@/app/_ui";
import { formatDate } from "../GamesTable";
import {
  deleteGoalAction,
  deleteOpponentGoalAction,
  deleteOpponentPenaltyAction,
  deletePenaltyAction,
} from "../actions";

// "#14 Dean Crosbie", with the shirt number set in the data face.
function PlayerName({ player }: { player: Player }) {
  return (
    <>
      <span className="t-data text-fg-secondary">#{player.number ?? "—"}</span>{" "}
      {player.firstName} {player.surname}
    </>
  );
}

function playerName(players: Player[], playerId: string): ReactNode {
  const player = players.find((entry) => entry._id === playerId);
  return player ? <PlayerName player={player} /> : playerId;
}

function offenderName(players: Player[], offender: string): ReactNode {
  return offender === "BENCH" ? "Bench" : playerName(players, offender);
}

function optionalPlayerName(
  players: Player[],
  playerId: string | undefined,
): ReactNode {
  return playerId === undefined ? "Not set" : playerName(players, playerId);
}

function formatMinuteSecond(minute: number, second: number): string {
  return `${minute}:${second.toString().padStart(2, "0")}`;
}

// Edit + Delete for one recorded event. Visible text is the bare verb; a
// visually hidden object ("Edit goal") completes the accessible name so a
// screen-reader user hearing a list of buttons knows what each acts on.
// Hidden text rather than aria-label keeps the name derived from content,
// so it can't be mistaken for a form-control label.
function RowActions({
  editHref,
  deleteAction,
  noun,
}: {
  editHref: string;
  deleteAction: ComponentProps<"form">["action"];
  noun: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      <ButtonLink href={editHref} variant="secondary" size="sm">
        Edit<span className="sr-only"> {noun}</span>
      </ButtonLink>
      <form action={deleteAction}>
        <Button type="submit" variant="danger" size="sm">
          Delete<span className="sr-only"> {noun}</span>
        </Button>
      </form>
    </div>
  );
}

function RecordSection({
  title,
  count,
  level = "h2",
  recordHref,
  recordLabel,
  empty,
  children,
}: {
  title: string;
  count: number;
  level?: "h2" | "h3";
  recordHref: string;
  // The object of "Record", e.g. "goal", "opponent penalty".
  recordLabel: string;
  empty: boolean;
  children: ReactNode;
}) {
  // The opponent sections are subordinate to the Warriors' own, so their
  // record action steps down to a small secondary button whose visible
  // text is just the verb (see RowActions for why the rest is hidden text).
  const minor = level === "h3";
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        as={level}
        count={count}
        actions={
          <ButtonLink
            href={recordHref}
            variant={minor ? "secondary" : "primary"}
            size={minor ? "sm" : "md"}
          >
            Record
            {minor ? (
              <span className="sr-only"> {recordLabel}</span>
            ) : (
              ` ${recordLabel}`
            )}
          </ButtonLink>
        }
      >
        {title}
      </SectionHeading>
      {empty ? <EmptyState>None recorded.</EmptyState> : children}
    </section>
  );
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGame(id);

  if (!game) {
    notFound();
  }

  const [season, players] = await Promise.all([
    getSeason(game.seasonId),
    listPlayers(),
  ]);

  const rosterPlayers = game.team.roster
    .map((entry) => players.find((player) => player._id === entry.playerId))
    .filter(
      (player): player is NonNullable<typeof player> => player !== undefined,
    );

  const score = deriveScore(game.team.goals, game.opponentTeam.goals);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        back={{ href: "/games", label: "Games" }}
        title={`vs ${game.opponentTeam.name}`}
        actions={
          <>
            <ButtonLink href={`/games/${game._id}/edit`} variant="secondary">
              Edit details
            </ButtonLink>
            <ButtonLink href={`/games/${game._id}/roster`} variant="secondary">
              Manage roster
            </ButtonLink>
            <ButtonLink href={`/games/${game._id}/awards`} variant="secondary">
              Manage awards
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="score-breakdown" className="flex flex-col gap-4">
          <span className="t-label text-fg-secondary">
            Final score · derived from goal times
          </span>
          <p
            data-testid="final-score"
            className="t-display m-0 flex items-baseline gap-4 text-5xl tabular-nums"
          >
            <span>{score.team}</span>{" "}
            <span className="t-heading text-2xl text-fg-secondary">—</span>{" "}
            <span>{score.opponent}</span>
          </p>
          <table className="wr-table">
            <thead>
              <tr>
                <th>Team</th>
                <th className="wr-right">P1</th>
                <th className="wr-right">P2</th>
                <th className="wr-right">P3</th>
                <th className="wr-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Warriors</td>
                {score.periods.map((period, index) => (
                  <td
                    key={index}
                    className="wr-num wr-right"
                    data-testid={`period-${index + 1}-team`}
                  >
                    {period.team}
                  </td>
                ))}
                <td className="wr-num wr-right wr-strong">{score.team}</td>
              </tr>
              <tr>
                <td>{game.opponentTeam.name}</td>
                {score.periods.map((period, index) => (
                  <td
                    key={index}
                    className="wr-num wr-right"
                    data-testid={`period-${index + 1}-opponent`}
                  >
                    {period.opponent}
                  </td>
                ))}
                <td className="wr-num wr-right wr-strong">{score.opponent}</td>
              </tr>
            </tbody>
          </table>
          {score.shootout && (
            <p
              className="m-0 text-sm text-fg-secondary"
              data-testid="shootout-note"
            >
              {score.shootout.team === score.shootout.opponent
                ? `Shootout goals recorded (${score.shootout.team}-${score.shootout.opponent}) — no winner determined`
                : `Decided by shootout — ${
                    score.shootout.team > score.shootout.opponent
                      ? "Warriors"
                      : game.opponentTeam.name
                  } won ${Math.max(score.shootout.team, score.shootout.opponent)}-${Math.min(score.shootout.team, score.shootout.opponent)}`}
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <span className="t-label text-fg-secondary">Game record</span>
          <dl className="m-0 grid grid-cols-[minmax(0,11rem)_1fr] items-baseline gap-x-4 gap-y-3">
            <dt className="t-label text-fg-secondary">Date</dt>
            <dd className="t-data m-0">{formatDate(game.date)}</dd>

            <dt className="t-label text-fg-secondary">Season</dt>
            <dd className="t-data m-0">{season?.name ?? game.seasonId}</dd>

            <dt className="t-label text-fg-secondary">Type</dt>
            <dd className="m-0">{game.type}</dd>

            <dt className="t-label text-fg-secondary">Location</dt>
            <dd className="m-0">
              {game.location === "HOME" ? "Home" : "Away"}
            </dd>

            <dt className="t-label text-fg-secondary">Netminder</dt>
            <dd className="m-0">
              {optionalPlayerName(players, game.netminderPlayerId)}
            </dd>

            <dt className="t-label text-fg-secondary">Player of the Game</dt>
            <dd className="m-0">
              {optionalPlayerName(players, game.manOfTheMatchPlayerId)}
            </dd>

            <dt className="t-label text-fg-secondary">Warrior of the Game</dt>
            <dd className="m-0">
              {optionalPlayerName(players, game.warriorOfTheGamePlayerId)}
            </dd>
          </dl>
        </Card>
      </div>

      <RecordSection
        title="Goals"
        count={game.team.goals.length}
        recordHref={`/games/${game._id}/goals/new`}
        recordLabel="goal"
        empty={game.team.goals.length === 0}
      >
        <Card flush>
          <table className="wr-table">
            <thead>
              <tr>
                <th className="w-24">Time</th>
                <th>Scorer</th>
                <th>Assists</th>
                <th>Type</th>
                <th className="wr-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {game.team.goals.map((goal) => {
                const assists = [goal.assist1, goal.assist2].filter(
                  (playerId): playerId is string => playerId !== undefined,
                );
                return (
                  <tr key={goal._id}>
                    <td className="wr-num">
                      {formatMinuteSecond(goal.minute, goal.second)}
                    </td>
                    <td>{playerName(players, goal.scoredBy)}</td>
                    <td>
                      {assists.length === 0
                        ? "—"
                        : assists.map((playerId, index) => (
                            <span key={playerId}>
                              {index > 0 && ", "}
                              {playerName(players, playerId)}
                            </span>
                          ))}
                    </td>
                    <td className="t-label text-fg-secondary">
                      {
                        GOAL_TYPE_LABELS[
                          goal.type as keyof typeof GOAL_TYPE_LABELS
                        ]
                      }
                    </td>
                    <td>
                      <RowActions
                        noun="goal"
                        editHref={`/games/${game._id}/goals/${goal._id}/edit`}
                        deleteAction={deleteGoalAction.bind(
                          null,
                          game._id,
                          goal._id,
                        )}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </RecordSection>

      <RecordSection
        title="Penalties"
        count={game.team.penalties.length}
        recordHref={`/games/${game._id}/penalties/new`}
        recordLabel="penalty"
        empty={game.team.penalties.length === 0}
      >
        <Card flush>
          <table className="wr-table">
            <thead>
              <tr>
                <th className="w-24">Time</th>
                <th>Offender</th>
                <th>Infraction</th>
                <th className="wr-right">PIM</th>
                <th className="wr-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {game.team.penalties.map((penalty) => (
                <tr key={penalty._id}>
                  <td className="wr-num">
                    {formatMinuteSecond(penalty.minute, penalty.second)}
                  </td>
                  <td>{offenderName(players, penalty.offender)}</td>
                  <td>
                    {
                      PENALTY_CODE_LABELS[
                        penalty.type as keyof typeof PENALTY_CODE_LABELS
                      ]
                    }
                  </td>
                  <td className="wr-num wr-right">{penalty.duration} min</td>
                  <td>
                    <RowActions
                      noun="penalty"
                      editHref={`/games/${game._id}/penalties/${penalty._id}/edit`}
                      deleteAction={deletePenaltyAction.bind(
                        null,
                        game._id,
                        penalty._id,
                      )}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </RecordSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecordSection
          level="h3"
          title="Opponent goals"
          count={game.opponentTeam.goals.length}
          recordHref={`/games/${game._id}/opponent-goals/new`}
          recordLabel="opponent goal"
          empty={game.opponentTeam.goals.length === 0}
        >
          <Card flush>
            <table className="wr-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Scorer</th>
                  <th>Type</th>
                  <th className="wr-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {game.opponentTeam.goals.map((goal) => (
                  <tr key={goal._id}>
                    <td className="wr-num">
                      {formatMinuteSecond(goal.minute, goal.second)}
                    </td>
                    <td>{goal.scoredBy}</td>
                    <td className="t-label text-fg-secondary">
                      {
                        GOAL_TYPE_LABELS[
                          goal.type as keyof typeof GOAL_TYPE_LABELS
                        ]
                      }
                    </td>
                    <td>
                      <RowActions
                        noun="opponent goal"
                        editHref={`/games/${game._id}/opponent-goals/${goal._id}/edit`}
                        deleteAction={deleteOpponentGoalAction.bind(
                          null,
                          game._id,
                          goal._id,
                        )}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </RecordSection>

        <RecordSection
          level="h3"
          title="Opponent penalties"
          count={game.opponentTeam.penalties.length}
          recordHref={`/games/${game._id}/opponent-penalties/new`}
          recordLabel="opponent penalty"
          empty={game.opponentTeam.penalties.length === 0}
        >
          <Card flush>
            <table className="wr-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Offender</th>
                  <th>Infraction</th>
                  <th className="wr-right">PIM</th>
                  <th className="wr-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {game.opponentTeam.penalties.map((penalty) => (
                  <tr key={penalty._id}>
                    <td className="wr-num">
                      {formatMinuteSecond(penalty.minute, penalty.second)}
                    </td>
                    <td>{penalty.offender}</td>
                    <td>
                      {
                        PENALTY_CODE_LABELS[
                          penalty.type as keyof typeof PENALTY_CODE_LABELS
                        ]
                      }
                    </td>
                    <td className="wr-num wr-right">{penalty.duration} min</td>
                    <td>
                      <RowActions
                        noun="opponent penalty"
                        editHref={`/games/${game._id}/opponent-penalties/${penalty._id}/edit`}
                        deleteAction={deleteOpponentPenaltyAction.bind(
                          null,
                          game._id,
                          penalty._id,
                        )}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </RecordSection>
      </div>

      <section className="flex flex-col gap-4">
        <SectionHeading count={`${rosterPlayers.length} dressed`}>
          Roster
        </SectionHeading>
        {rosterPlayers.length === 0 ? (
          <EmptyState>None.</EmptyState>
        ) : (
          <Card>
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-2 p-0">
              {rosterPlayers.map((player) => (
                <li key={player._id}>
                  <PlayerName player={player} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
