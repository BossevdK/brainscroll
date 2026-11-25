"""Builds src/data/wordhive.json: puzzles of 7 letters (one in the middle) and all
reasonably common English words you can make with them.

Needs: the ENABLE word list (public domain) and the `wordfreq` package (Apache 2.0)
to keep only words people actually know.

Run:  python -m venv wfenv && wfenv/Scripts/pip install wordfreq
      wfenv/Scripts/python -I scripts/build-wordhive.py <path-to-enable1.txt>
"""
import json
import random
import sys
from pathlib import Path

from wordfreq import zipf_frequency

ROOT = Path(__file__).resolve().parent.parent
ANSWER_MIN_ZIPF = 2.9   # how common a word must be to count as an answer
PANGRAM_MIN_ZIPF = 3.0  # the 7-letter "use every letter" word must be well known
MIN_WORDS, MAX_WORDS = 14, 45
PUZZLES = 250
BLOCK = {"nigger", "niggers", "faggot", "faggots", "fagot", "retard", "retarded", "spic", "kike", "chink", "dyke", "tranny"}

enable = Path(sys.argv[1]).read_text(encoding="utf8").split()
words = [
    w for w in (x.strip().lower() for x in enable)
    if 4 <= len(w) <= 9 and "s" not in w and w.isalpha() and w not in BLOCK and len(set(w)) <= 7
]
common = [w for w in words if zipf_frequency(w, "en") >= ANSWER_MIN_ZIPF]
print("common candidate words:", len(common))

pangram_sets = {}
for w in common:
    if len(set(w)) == 7 and zipf_frequency(w, "en") >= PANGRAM_MIN_ZIPF:
        pangram_sets.setdefault(frozenset(w), w)
print("pangram letter sets:", len(pangram_sets))

random.seed(42)
puzzles = []
for letters, pangram in pangram_sets.items():
    for center in letters:
        answers = sorted(w for w in common if center in w and set(w) <= letters)
        if MIN_WORDS <= len(answers) <= MAX_WORDS:
            others = sorted(letters - {center})
            puzzles.append({"center": center, "letters": "".join(others), "words": answers})
random.shuffle(puzzles)
puzzles = puzzles[:PUZZLES]
out = ROOT / "src" / "data" / "wordhive.json"
out.write_text(json.dumps(puzzles, separators=(",", ":")) + "\n", encoding="utf8")
print(f"wrote {len(puzzles)} puzzles, {out.stat().st_size} bytes")
print("example:", puzzles[0]["center"], puzzles[0]["letters"], puzzles[0]["words"][:25])
