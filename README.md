# Sum up 24 November 2026 world news in one image

make.fun bounty entry: a deterministic program that writes one image summing up the world's news of Tuesday 24 November 2026.

[![make.fun · news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/kanyinorukotan/news-image-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/kanyinorukotan/news-image-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

## How it works

`main.ts` (Node 22, standard library only) reads `entry.png` from the repository and writes it to `/output/entry.png`. The image is deterministic: two runs write the same bytes, with no network.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT (OSI-approved).

## Entry details

- **Repository**: kanyinorukotan/news-image-20261124
- **Competition**: news-image-20261124
- **Bounty**: Sum up 24 November's world news in one image ($100 in USDC)
- **Program**: main.ts (Node 22)
