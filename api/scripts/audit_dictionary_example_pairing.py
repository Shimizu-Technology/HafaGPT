#!/usr/bin/env python3
"""Reproduce capped example counts, threshold calibration, and a blind sample.

Run from any directory. --sample writes *unjudged* source records to a new file;
manual judgments belong in a separate artifact and are never overwritten here.
"""

import argparse
import hashlib
import json
import random
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))

from api import dictionary_example_validation as validation  # noqa: E402
from api.dictionary_service import DictionaryService  # noqa: E402

SNAPSHOT_PATH = API_ROOT / 'dictionary_data/revised_and_updated_chamorro_dictionary.json'
COUNTS_PATH = API_ROOT / 'documentation/phase4-data/example_pairing_counts.json'
SAMPLE_SEED = 10303
SAMPLE_SIZE = 60


def parse_snapshot(snapshot):
    return [(headword, data, *DictionaryService._parse_examples(data.get('Other', []), headword))
            for headword, data in snapshot.items() if isinstance(data, dict)]


def totals(parsed):
    return {
        'shown_pairs': sum(len(pairs) for _, _, pairs, _ in parsed),
        'entries_with_pairs': sum(bool(pairs) for _, _, pairs, _ in parsed),
        'unpaired_fields': sum(len(unpaired) for _, _, _, unpaired in parsed),
        'entries_with_unpaired': sum(bool(unpaired) for _, _, _, unpaired in parsed),
    }


def audit(snapshot):
    chosen = (validation.ENGLISH_MIN_SHARE, validation.CHAMORRO_MAX_ENGLISH_SHARE, validation.REQUIRE_HEADWORD)
    calibration = []
    try:
        for english, chamorro, headword in [
            (.5, .25, False), (.6, .25, False), (.6, .25, True),
            (.65, .25, True), (.7, .25, True), (.6, .2, True),
        ]:
            validation.ENGLISH_MIN_SHARE = english
            validation.CHAMORRO_MAX_ENGLISH_SHARE = chamorro
            validation.REQUIRE_HEADWORD = headword
            calibration.append(dict(english_min_share=english, chamorro_max_english_share=chamorro,
                                    require_headword=headword, **totals(parse_snapshot(snapshot))))
    finally:
        validation.ENGLISH_MIN_SHARE, validation.CHAMORRO_MAX_ENGLISH_SHARE, validation.REQUIRE_HEADWORD = chosen
    parsed = parse_snapshot(snapshot)
    report = {
        'review_round': 3,
        'scope': 'Revised snapshot; displayed pairs capped at 3 per entry; first rejected pair stops the block',
        'entries': len(snapshot),
        'snapshot_sha256': hashlib.sha256(SNAPSHOT_PATH.read_bytes()).hexdigest(),
        'english_wordlist_size': len(validation.COMMON_ENGLISH_WORDS),
        'terminal_noun_wordlist_size': len(validation.TERMINAL_NOUNS),
        'english_wordlist_sha256': hashlib.sha256((API_ROOT / 'dictionary_data/common_english_words.txt').read_bytes()).hexdigest(),
        'terminal_noun_wordlist_sha256': hashlib.sha256((API_ROOT / 'dictionary_data/common_english_nouns.txt').read_bytes()).hexdigest(),
        'thresholds': dict(english_min_share=chosen[0], chamorro_max_english_share=chosen[1],
                           require_headword=chosen[2], english_min_tokens=3, chamorro_min_tokens=2),
        **totals(parsed),
        'calibration': calibration,
        'historical_round_2': dict(shown_pairs=14108, entries_with_pairs=6028, unpaired_fields=25940, entries_with_unpaired=4766),
        'sample': dict(seed=SAMPLE_SEED, size=SAMPLE_SIZE, population='all shown pairs in snapshot/pair order',
                       judgments='example_pairing_sample_round3.json'),
    }
    population = [dict(headword=headword, pair_index=index, pair=pair, raw=data['Other'])
                  for headword, data, pairs, _ in parsed for index, pair in enumerate(pairs)]
    return report, random.Random(SAMPLE_SEED).sample(population, SAMPLE_SIZE)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sample', type=Path, help='new unjudged sample file (must not exist)')
    parser.add_argument('--check', action='store_true', help='fail if tracked counts are stale')
    args = parser.parse_args()
    report, sample = audit(json.loads(SNAPSHOT_PATH.read_text(encoding='utf-8')))
    if args.check:
        if json.loads(COUNTS_PATH.read_text()) != report:
            raise SystemExit('Dictionary example counts are stale; run this script without --check')
    else:
        COUNTS_PATH.write_text(json.dumps(report, indent=2) + '\n')
    if args.sample:
        with args.sample.open('x', encoding='utf-8') as stream:
            json.dump(dict(seed=SAMPLE_SEED, population=report['shown_pairs'], sample=sample), stream, indent=2, ensure_ascii=False)
            stream.write('\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
