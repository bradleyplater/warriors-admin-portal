## 1. Website data client

- [ ] 1.1 Add `assetUrl(key)` and `getUpcomingGames()` to `app/data/client.ts`
- [ ] 1.2 Unit tests: `getUpcomingGames` fetches `${DATA_BASE_URL}/upcoming-games.json`; `assetUrl` joins the base URL and the key

## 2. Opponent crests from S3

- [ ] 2.1 `opponentCrestSrc` returns `assetUrl(logoImage)`, or `null` when there is no logo; remove the slug fallback
- [ ] 2.2 `LatestResultCard` and the `OpponentMark` in `routes/game.tsx` render initials straight away on `null`, and keep the `onError` fallback
- [ ] 2.3 Unit tests for `opponentCrestSrc`: a key gives the CDN URL; a missing or empty value gives `null`

## 3. Fixtures from the CDN

- [ ] 3.1 Home `clientLoader` fetches upcoming games and passes them to `NextGameCard` as a prop
- [ ] 3.2 `/schedule` `clientLoader` fetches upcoming games instead of importing the bundled file
- [ ] 3.3 Share the `UpcomingGame` type through `app/data/types.ts`

## 4. Delete the bundled copies

- [ ] 4.1 Delete `public/images/team-logos/` (10 tracked files plus the untracked `Chargers.jpg`) and `public/data/upcoming-games.json`
- [ ] 4.2 Check that nothing still references `team-logos` or `upcoming-games.json`, and that `npm run typecheck`, `npm run test:run` and `npm run build` pass

## 5. Verify and ship

- [ ] 5.1 Run the website locally against the live CDN and check home, `/results`, a game page and `/schedule`: each crest is either initials or an S3 image, with no `team-logos` 404s
- [ ] 5.2 Update the docs (portal `docs/` and the Obsidian vault) to say the website consumes S3 logos and CDN fixtures
- [ ] 5.3 Open PRs in both repos
- [ ] 5.4 (Manual, needs user sign-off) Republish prod so the live `results.json` and `upcoming-games.json` carry logo keys, then deploy the website
