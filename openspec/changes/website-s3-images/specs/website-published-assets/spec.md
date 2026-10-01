## ADDED Requirements

### Requirement: Opponent crests come from the CDN
The website SHALL render an opponent's crest from `<DATA_BASE_URL>/<logoImage>`, where `logoImage` is the S3 key the portal publishes. It SHALL NOT derive crest paths from the team name, and it SHALL NOT load crests from files bundled with the site.

#### Scenario: Result with a published logo
- **WHEN** a `results.json` entry has `logoImage` `"opponents/OPN878600/logo-1790867655827.jpg"`
- **THEN** its crest image source is `https://d20z7zill67968.cloudfront.net/opponents/OPN878600/logo-1790867655827.jpg`

#### Scenario: Result without a logo
- **WHEN** a `results.json` entry has no `logoImage`, or it is an empty string
- **THEN** no image is requested and the opponent's initials are shown

#### Scenario: Logo fails to load
- **WHEN** the crest URL responds with an error
- **THEN** the opponent's initials are shown

### Requirement: Upcoming fixtures come from the CDN
The website SHALL load upcoming fixtures from `<DATA_BASE_URL>/upcoming-games.json` through its data client, memoised per session like the other artifacts. It SHALL NOT bundle a fixtures file.

#### Scenario: Home and schedule load fixtures
- **WHEN** the home page or `/schedule` loads
- **THEN** its loader fetches `upcoming-games.json` from the CDN, and the next-game card and the fixture list render from that data

#### Scenario: Fixtures fetch fails
- **WHEN** `upcoming-games.json` returns a non-OK response
- **THEN** the data client throws an error that names `upcoming-games.json` and the status, the same as for the other artifacts

### Requirement: No bundled opponent crests
The website SHALL NOT ship opponent crest images in `public/images/team-logos/`.

#### Scenario: Build output
- **WHEN** the website is built
- **THEN** the build output contains no `images/team-logos/` files
