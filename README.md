# Brainscroll

A TikTok-style endless feed of odd facts and quick brain games for Android: swipe up for the next card.

- **Facts:** niche, funny and surprising, from Wikipedia's "Did you know…" archive and the Useless Facts API.
- **Games:** word guess, size it, higher or lower, estimate, order it, code breaker, nonogram, sudoku, word hive, memory, Stroop, rotation and more. Every game has its own level that rises as you win.
- **Learning:** facts you read come back days later as a quick quiz (spaced repetition), plus a daily challenge, streaks and stats.
- Everything stays on your phone: no account, no tracking.

## Install

Download `Brainscroll.apk` from the [latest release](https://github.com/BossevdK/brainscroll/releases/latest) and open it on your phone. The app tells you when a new version is out.

## Develop

```
npm install
npx expo start
npm test
```

Release builds are made locally (`npx expo prebuild --platform android`, then `gradlew assembleRelease` in `android/`) and signed with a key that is kept outside this repository.

## Credits

Facts: Wikipedia "Did you know…" (CC BY-SA 4.0) and the Useless Facts API. Trivia: Open Trivia Database (CC BY-SA 4.0). Numbers: Wikidata (CC0). Word lists: ENABLE (public domain), filtered with wordfreq.
