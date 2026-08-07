# 📚 RAG Knowledge Base Sources

This document tracks all sources that have been added to the HåfaGPT RAG knowledge base.

> **Audit warning (August 7, 2026):** The inventory and priority claims below were
> written in December 2024 and do not match the current local database. The current
> collection has 44,865 rows but 30,010 are redundant exact duplicates; 40,501 rows
> come from Chamoru.info, and no current `natibunmarianas.org` rows are present.
> Source rights and provenance are also incomplete. Do not use this file as evidence
> that a source is licensed, current, independent, or approved for teaching. See
> [LANGUAGE_RESOURCE_AUDIT_2026-08-07.md](../documentation/LANGUAGE_RESOURCE_AUDIT_2026-08-07.md)
> before crawling, importing, or changing retrieval priorities.
>
> The enforceable inventory and runtime decisions now live in
> [`data/language_source_registry.json`](../data/language_source_registry.json),
> with the complete implementation sequence in
> [LANGUAGE_RESOURCE_PROGRAM_2026.md](../documentation/LANGUAGE_RESOURCE_PROGRAM_2026.md).

---

## 📊 Current Stats

| Category | Count | Last Updated |
|----------|-------|--------------|
| Total Chunks | ~45,400 | December 2024 |
| Dictionaries | 5 | December 2024 |
| Educational PDFs | 3 | December 2024 |
| Web Content | 10+ sites | December 2024 |

---

## 📖 Dictionaries (Highest Priority)

### IKNM/KAM Revised Dictionary (2025)
- **Source**: [natibunmarianas.org/chamorro-dictionary](https://natibunmarianas.org/chamorro-dictionary/)
- **Content**: 10,500+ dictionary entries with definitions, examples
- **Priority**: 105 (High)
- **Chunks**: 35
- **Crawler**: `crawlers/iknm_kam_dictionary.py`
- **Notes**: Revised version of Topping, Ogo, and Dungca (1975)

### Chamorro-English Dictionary (TOD)
- **Source**: Topping, Ogo, and Dungca (1975)
- **Content**: Comprehensive Chamorro-English dictionary
- **Priority**: 100
- **Format**: PDF

### Revised and Updated Chamorro Dictionary
- **Source**: Various academic sources
- **Content**: Updated dictionary entries
- **Priority**: 100
- **Format**: PDF

### Chamoru.info Dictionary
- **Source**: [chamoru.info](http://www.chamoru.info)
- **Content**: Online searchable dictionary
- **Priority**: 100
- **Format**: Web crawl

---

## 📄 PDFs (Educational)

### Two Chamorro Orthographies (Dr. Sandra Chung)
- **Source**: [UCSC - Dr. Sandra Chung](https://people.ucsc.edu/~schung/)
- **Content**: Explains differences between Guam and CNMI spelling systems
- **Pages**: 40
- **Priority**: 100 (Modern educational)
- **Chunks**: 10
- **Path**: `knowledge_base/pdfs/two_chamorro_orthographies_sandra_chung.pdf`
- **Added**: December 2024

### English-Chamorro Finder List (2024)
- **Source**: [IKNM/KAM](https://natibunmarianas.org)
- **Content**: English → Chamorro word lookups (142 pages)
- **Compiled by**: Dr. Sandra Chung
- **Priority**: 100 (Modern educational)
- **Chunks**: 173
- **Path**: `knowledge_base/pdfs/english_chamorro_finder_list_2024.pdf`
- **Added**: December 2024

### Chamorro Grammar (Dr. Sandra Chung)
- **Source**: Published 1998
- **Content**: Comprehensive Chamorro grammar reference
- **Priority**: 50 (Contemporary)
- **Format**: PDF

---

## 🌐 Web Content

### Guampedia
- **Source**: [guampedia.com](https://www.guampedia.com)
- **Content**: Encyclopedia articles about Guam culture, history, language
- **Priority**: 100 (Modern educational)

### Lengguahi-ta
- **Source**: [lengguahita.com](https://lengguahita.com)
- **Content**: Chamorro lessons and stories by Siñora Schyuler Lujan
- **Priority**: 110-115 (Highest - native speaker educational content)

### Pacific Daily News (Chamorro Columns)
- **Source**: [guampdn.com](https://www.guampdn.com)
- **Content**: Bilingual opinion columns
- **Priority**: 110 (Highest)
- **Crawler**: `crawlers/pacific_daily_news.py`

### Chamoru.info Language Lessons
- **Source**: [chamoru.info/language-lessons](http://www.chamoru.info/language-lessons/)
- **Content**: Grammar lessons and tutorials
- **Priority**: 100 (Modern)

### Visit Guam
- **Source**: [visitguam.com](https://www.visitguam.com)
- **Content**: Tourism-focused Chamorro phrases
- **Priority**: 100 (Modern conversational)

---

## 🏛️ Historical/Archival Sources

### Dictionary and Grammar of the Chamorro Language (1865)
- **Source**: Historical archive
- **Content**: Early documentation of Chamorro
- **Priority**: 5 (Archival - may contain outdated usage)
- **Notes**: Useful for historical context, not modern conversation

### Rosetta Project Materials
- **Source**: rosettaproject.org
- **Content**: Language preservation materials
- **Priority**: 5 (Archival)

---

## 🎯 Priority System

| Priority Range | Category | Boost in RAG |
|----------------|----------|--------------|
| 110-115 | Native speaker content (Lengguahi-ta, PDN columns) | 3x multiplier |
| 100-109 | Modern educational (dictionaries, grammar, IKNM) | 2x multiplier |
| 50-99 | Contemporary (1990s-2010s) | Normal |
| 20-49 | Historical (pre-1990s) | Normal |
| 1-19 | Archival (pre-1900s) | Penalized |

---

## ✅ Recently Added (December 2024)

1. **IKNM/KAM Revised Dictionary** - 35 chunks, priority 105
2. **Two Chamorro Orthographies PDF** - 10 chunks, priority 100
3. **English-Chamorro Finder List PDF** - 173 chunks, priority 100

---

## 🔜 Planned Additions

- [ ] More PDN bilingual columns
- [ ] Additional Lengguahi-ta lessons
- [ ] Cultural content from Guampedia

---

## 📝 Notes

- **Total unique sources**: 15+
- **Primary focus**: Modern conversational Chamorro (2000+)
- **Quality standard**: Native speaker or academic-verified content only
- **No machine translation**: All content is human-created

---

*Last updated: December 2024*
