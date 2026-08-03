import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame, getSeason, listPlayers } from "@/lib/repositories";
import { deriveScore } from "@/lib/derived/score";
import { GOAL_TYPE_LABELS, PENALTY_CODE_LABELS } from "@/lib/schemas";
import type { Player } from "@/lib/schemas";
import {
  deleteGoalAction,
  deleteOpponentGoalAction,
  deleteOpponentPenaltyAction,
  deletePenaltyAction,
} from "../actions";

function playerLabel(players: Player[], playerId: string): string {
  const player = players.find((entry) => entry._id === playerId);
  return player
    ? `#${player.number} ${player.firstName} ${player.surname}`
    : playerId;
}

function offenderLabel(players: Player[], offender: string): string {
  return offender === "BENCH" ? "Bench" : playerLabel(players, offender);
}

function optionalPlayerLabel(
  players: Player[],
  playerId: string | undefined,
): string {
  return playerId === undefined ? "Not set" : playerLabel(players, playerId);
}

function formatMinuteSecond(minute: number, second: number): string {
  return `${minute}:${second.toString().padStart(2, "0")}`;
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
    .filter((player): player is NonNullable<typeof player> => player !== undefined);

  const score = deriveScore(game.team.goals, game.opponentTeam.goals);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          vs {game.opponentTeam.name} — {score.team}-{score.opponent}
        </h1>
        <div className="flex gap-2">
          <Link
            href={`/games/${game._id}/edit`}
            className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/[0.05]"
          >
            Edit details
          </Link>
          <Link
            href={`/games/${game._id}/roster`}
            className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/[0.05]"
          >
            Manage roster
          </Link>
          <Link
            href={`/games/${game._id}/awards`}
            className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/[0.05]"
          >
            Manage awards
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-2" data-testid="score-breakdown">
        <table className="w-full max-w-md text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/15">
              <th className="py-1 pr-4 font-medium"></th>
              <th className="py-1 pr-4 text-center font-medium">P1</th>
              <th className="py-1 pr-4 text-center font-medium">P2</th>
              <th className="py-1 pr-4 text-center font-medium">P3</th>
              <th className="py-1 pr-4 text-center font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1 pr-4 font-medium">Team</td>
              {score.periods.map((period, index) => (
                <td
                  key={index}
                  className="py-1 pr-4 text-center"
                  data-testid={`period-${index + 1}-team`}
                >
                  {period.team}
                </td>
              ))}
              <td className="py-1 pr-4 text-center font-medium">
                {score.team}
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-4 font-medium">
                {game.opponentTeam.name}
              </td>
              {score.periods.map((period, index) => (
                <td
                  key={index}
                  className="py-1 pr-4 text-center"
                  data-testid={`period-${index + 1}-opponent`}
                >
                  {period.opponent}
                </td>
              ))}
              <td className="py-1 pr-4 text-center font-medium">
                {score.opponent}
              </td>
            </tr>
          </tbody>
        </table>
        {score.shootout && (
          <p
            className="text-sm text-black/60 dark:text-white/60"
            data-testid="shootout-note"
          >
            {score.shootout.team === score.shootout.opponent
              ? `Shootout goals recorded (${score.shootout.team}-${score.shootout.opponent}) — no winner determined`
              : `Decided by shootout — ${
                  score.shootout.team > score.shootout.opponent
                    ? "Team"
                    : game.opponentTeam.name
                } won ${Math.max(score.shootout.team, score.shootout.opponent)}-${Math.min(score.shootout.team, score.shootout.opponent)}`}
          </p>
        )}
      </div>

      <dl className="grid max-w-md grid-cols-2 gap-y-2 text-sm">
        <dt className="text-black/60 dark:text-white/60">Date</dt>
        <dd>{game.date.toISOString().slice(0, 10)}</dd>

        <dt className="text-black/60 dark:text-white/60">Season</dt>
        <dd>{season?.name ?? game.seasonId}</dd>

        <dt className="text-black/60 dark:text-white/60">Type</dt>
        <dd>{game.type}</dd>

        <dt className="text-black/60 dark:text-white/60">Location</dt>
        <dd>{game.location === "HOME" ? "Home" : "Away"}</dd>

        <dt className="text-black/60 dark:text-white/60">Netminder</dt>
        <dd>{optionalPlayerLabel(players, game.netminderPlayerId)}</dd>
      </dl>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Awards</h2>
        <dl className="grid max-w-md grid-cols-2 gap-y-2 text-sm">
          <dt className="text-black/60 dark:text-white/60">
            Player of the Game
          </dt>
          <dd>{optionalPlayerLabel(players, game.manOfTheMatchPlayerId)}</dd>

          <dt className="text-black/60 dark:text-white/60">
            Warrior of the Game
          </dt>
          <dd>{optionalPlayerLabel(players, game.warriorOfTheGamePlayerId)}</dd>
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">
          Roster ({rosterPlayers.length})
        </h2>
        {rosterPlayers.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">None.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {rosterPlayers.map((player) => (
              <li key={player._id}>
                #{player.number} {player.firstName} {player.surname}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Goals ({game.team.goals.length})
          </h2>
          <Link
            href={`/games/${game._id}/goals/new`}
            className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/[0.05]"
          >
            Record goal
          </Link>
        </div>
        {game.team.goals.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">None.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {game.team.goals.map((goal) => {
              const assists = [goal.assist1, goal.assist2]
                .filter((playerId): playerId is string => playerId !== undefined)
                .map((playerId) => playerLabel(players, playerId));

              return (
                <li key={goal._id} className="flex items-center justify-between gap-2">
                  <span>
                    {formatMinuteSecond(goal.minute, goal.second)} —{" "}
                    {playerLabel(players, goal.scoredBy)}
                    {assists.length > 0 && ` (${assists.join(", ")})`} —{" "}
                    {GOAL_TYPE_LABELS[goal.type as keyof typeof GOAL_TYPE_LABELS]}
                  </span>
                  <span className="flex items-center gap-2">
                    <Link
                      href={`/games/${game._id}/goals/${goal._id}/edit`}
                      className="text-sm underline"
                    >
                      Edit goal
                    </Link>
                    <form action={deleteGoalAction.bind(null, game._id, goal._id)}>
                      <button type="submit" className="text-sm text-red-600 underline">
                        Delete goal
                      </button>
                    </form>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Penalties ({game.team.penalties.length})
          </h2>
          <Link
            href={`/games/${game._id}/penalties/new`}
            className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/[0.05]"
          >
            Record penalty
          </Link>
        </div>
        {game.team.penalties.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">None.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {game.team.penalties.map((penalty) => (
              <li key={penalty._id} className="flex items-center justify-between gap-2">
                <span>
                  {formatMinuteSecond(penalty.minute, penalty.second)} —{" "}
                  {offenderLabel(players, penalty.offender)} —{" "}
                  {PENALTY_CODE_LABELS[penalty.type as keyof typeof PENALTY_CODE_LABELS]}{" "}
                  ({penalty.duration} min)
                </span>
                <span className="flex items-center gap-2">
                  <Link
                    href={`/games/${game._id}/penalties/${penalty._id}/edit`}
                    className="text-sm underline"
                  >
                    Edit penalty
                  </Link>
                  <form action={deletePenaltyAction.bind(null, game._id, penalty._id)}>
                    <button type="submit" className="text-sm text-red-600 underline">
                      Delete penalty
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Opponent goals ({game.opponentTeam.goals.length})
          </h2>
          <Link
            href={`/games/${game._id}/opponent-goals/new`}
            className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/[0.05]"
          >
            Record opponent goal
          </Link>
        </div>
        {game.opponentTeam.goals.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">None.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {game.opponentTeam.goals.map((goal) => (
              <li key={goal._id} className="flex items-center justify-between gap-2">
                <span>
                  {formatMinuteSecond(goal.minute, goal.second)} — {goal.scoredBy} —{" "}
                  {GOAL_TYPE_LABELS[goal.type as keyof typeof GOAL_TYPE_LABELS]}
                </span>
                <span className="flex items-center gap-2">
                  <Link
                    href={`/games/${game._id}/opponent-goals/${goal._id}/edit`}
                    className="text-sm underline"
                  >
                    Edit opponent goal
                  </Link>
                  <form action={deleteOpponentGoalAction.bind(null, game._id, goal._id)}>
                    <button type="submit" className="text-sm text-red-600 underline">
                      Delete opponent goal
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Opponent penalties ({game.opponentTeam.penalties.length})
          </h2>
          <Link
            href={`/games/${game._id}/opponent-penalties/new`}
            className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/[0.05]"
          >
            Record opponent penalty
          </Link>
        </div>
        {game.opponentTeam.penalties.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">None.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {game.opponentTeam.penalties.map((penalty) => (
              <li key={penalty._id} className="flex items-center justify-between gap-2">
                <span>
                  {formatMinuteSecond(penalty.minute, penalty.second)} —{" "}
                  {penalty.offender} —{" "}
                  {PENALTY_CODE_LABELS[penalty.type as keyof typeof PENALTY_CODE_LABELS]}{" "}
                  ({penalty.duration} min)
                </span>
                <span className="flex items-center gap-2">
                  <Link
                    href={`/games/${game._id}/opponent-penalties/${penalty._id}/edit`}
                    className="text-sm underline"
                  >
                    Edit opponent penalty
                  </Link>
                  <form
                    action={deleteOpponentPenaltyAction.bind(null, game._id, penalty._id)}
                  >
                    <button type="submit" className="text-sm text-red-600 underline">
                      Delete opponent penalty
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
