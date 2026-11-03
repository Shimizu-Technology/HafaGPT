import runpy
from pathlib import Path

import pytest

from src.rag.source_policy import (
    SourceIngestionBlocked, assert_ingestion_allowed, get_registered_source, resolve_source,
)

NEW_IDS = {
    'diksionariu_com', 'kumision_historical_dictionary_shelf', 'gdoe_chlccspi_2025',
    'tatoeba_chamorro', 'opus_tatoeba_ch_en', 'opus_bible_uedin_ch_en',
    'opus_translatewiki_ch_en', 'opus_wikimedia_ch_en', 'opus_qed_ch_en',
    'abs_bible_1908', 'kumision_audio_programs', 'kumision_seyon_inafitma',
    'kumision_guam_orthography_2027_candidate',
}


@pytest.mark.parametrize('source_id', sorted(NEW_IDS))
def test_new_candidates_and_licensed_snapshots_never_enable_rag(source_id):
    source = get_registered_source(source_id)
    assert source['ingestion']['allowed'] is False
    assert source['retrieval']['allowed'] is False
    assert resolve_source({'source': source_id})['id'] == source_id
    with pytest.raises(SourceIngestionBlocked):
        assert_ingestion_allowed({'source': source_id})


@pytest.mark.parametrize('url,source_id', [
    ('https://www.gdoe.net/files/user/59/file/CHLCCSPI-(Medidan-Suhetu)-GEB-Approved-2025.pdf', 'gdoe_chlccspi_2025'),
    ('https://col.guamcourts.gov/sites/default/files/01gc007.pdf', 'guam_code_official_languages'),
    ('https://kumisionchamoru.guam.gov/wp-content/uploads/2026/10/2027-Utugrafihan-CHamoru-Guahan.pdf', 'kumision_guam_orthography_2027_candidate'),
    ('https://object.pouta.csc.fi/OPUS-Tatoeba/v2026-07-08/moses/ch-en.txt.zip', 'opus_tatoeba_ch_en'),
])
def test_specific_source_paths_are_not_shadowed_by_broader_match_rules(url, source_id):
    assert resolve_source({'source': url})['id'] == source_id


def test_legacy_crawler_delegates_to_the_governed_implementation(monkeypatch):
    calls = []
    monkeypatch.setattr(runpy, 'run_module', lambda *args, **kwargs: calls.append((args, kwargs)))
    shim = Path(__file__).resolve().parents[1] / 'scripts/crawlers/crawl_website.py'
    runpy.run_path(str(shim), run_name='__main__')
    assert calls == [(('src.crawlers.crawl_website',), {'run_name': '__main__'})]
    assert 'vectorstore.add_documents' not in shim.read_text()
