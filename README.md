# Pi Tumbler

An English-language pi memory arcade built with HTML, CSS, and JavaScript. No build step, backend, analytics, or runtime dependencies. Designed for GitHub Pages.

## Rules

Spin the tumbler to choose a starting position **after the decimal point** (position 1 is the first `1` in `3.14159`). Enter four consecutive digits beginning there, even when they extend beyond the level's range. The 14-second countdown begins after the tumbler stops.

| Tier | I | II | III |
| --- | ---: | ---: | ---: |
| Beginner | 20 | 30 | 50 |
| Intermediate | 100 | 250 | 325 |
| Advanced | 500 | 750 | 1,000 |

Normal rounds allow one answer and one optional context hint. A hint masks all four answer digits, costs 3 seconds, and can end the round if less than 3 seconds remain. Long hints abbreviate intervening digits.

Chaos chooses a starting position from 1 through 1,000,000, inclusive. It has no hints and gives three guesses within one 14-second countdown. Incorrect guesses reveal no individual matching digits and never reset the timer.

## Develop

Use Node.js 20 or later. Run `npm start` and open http://localhost:4173. Run `npm test` for game-rule and dataset checks. Sound is synthesized locally with Web Audio after a user gesture.

## Publish

Push to GitHub. In **Settings → Pages**, choose **Deploy from a branch**, **main**, and **/(root)**. Relative asset paths support project Pages URLs.

## Data

`data/pi.txt` contains 1,000,010 decimal digits, including padding beyond the last selectable position. `scripts/generate_pi.py` calculates them with Chudnovsky binary splitting and integer arithmetic, using Python's standard library. `data/pi.sha256` records the file digest. The game uses this local dataset, without an external pi API.
