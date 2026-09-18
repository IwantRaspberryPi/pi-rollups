# Pi Rollups

An English-language pi memory arcade built with HTML, CSS, and JavaScript. No build step, backend, analytics, or runtime dependencies. Designed for GitHub Pages.

## Rules

Spin the tumbler to choose a starting position **after the decimal point** (position 1 is the first `1` in `3.14159`). Enter four consecutive digits beginning there, even when they extend beyond the level's range. In normal levels, the 14-second countdown begins after the tumbler stops.

| Tier | I | II | III |
| --- | ---: | ---: | ---: |
| Beginner | 20 | 30 | 50 |
| Intermediate | 100 | 250 | 325 |
| Advanced | 500 | 750 | 1,000 |

Normal rounds allow one answer and one optional context hint. A hint masks all four answer digits, costs 3 seconds, and can end the round if less than 3 seconds remain. Long hints abbreviate intervening digits.

Chaos chooses a starting position from 1 through 1,000,000, inclusive. It has no time limit and gives three Wordle-style guesses. Each four-digit row stays visible: green/check means correct position, yellow/arrows means a digit elsewhere, and gray/cross means no remaining match. Exact matches consume occurrences first, so duplicate digits receive correct feedback. Each Chaos round also offers one HIGH/LOW comparison hint, independent of the three guesses. Enter an integer from 0 to 9999 (short inputs are padded with leading zeros). HIGH means the whole four-digit answer is greater than the input; LOW means it is smaller; MATCH means equal. A match still requires submitting the answer normally. Invalid inputs do not consume the hint, and starting a new round restores its one use. End round lets you leave an unfinished puzzle.

## Develop

Use Node.js 20 or later. Run `npm start` and open http://localhost:4173. Run `npm test` for game-rule and dataset checks. Sound is synthesized locally with Web Audio after a user gesture.

## Publish

Push to GitHub. In **Settings → Pages**, choose **Deploy from a branch**, **main**, and **/(root)**. Relative asset paths support project Pages URLs.

## Data

`data/pi.txt` contains 1,000,010 decimal digits, including padding beyond the last selectable position. `scripts/generate_pi.py` calculates them with Chudnovsky binary splitting and integer arithmetic, using Python's standard library. `data/pi.sha256` records the file digest. The game uses this local dataset, without an external pi API.

## Daily attendance

Visits automatically count once per local calendar day. Consecutive days increase the streak; missing a day resets it to 1 on the next visit. Month, year, leap-day and daylight-saving boundaries use calendar days rather than elapsed 24-hour periods. A visible open page checks again each minute and when you return to it; a hidden tab does not check in by itself.

Attendance is stored in this browser's localStorage, without an account or cross-device synchronization. Clearing browser data resets it; unavailable storage is reported in the interface. This is a personal streak, not a tamper-proof reward system.

Live site: https://iwantraspberrypi.github.io/pi-rollups/

## Medals and Chaos honors

Successful rounds are counted separately for all nine normal levels. Each level displays its highest medal: Bronze at 1 win, Silver at 5, Gold at 10, and Platinum at 30. Hints do not disqualify a win. Counts continue above 30. Chaos victories have a separate collectible decoration with an unlimited cumulative count. Losing, timing out, ending a round, or merely matching the comparison hint awards nothing.

Progress uses the versioned localStorage key `pi-rollups.progress.v1`. It survives reloads and missed attendance days, but clearing browser data resets it; there is no account or cross-device sync. Historical wins before this feature cannot be recovered. If storage is blocked or full, the interface explains that rewards last only for the current visit. Other tabs refresh their display on storage changes and focus. This is a personal collection, not a verified leaderboard.
