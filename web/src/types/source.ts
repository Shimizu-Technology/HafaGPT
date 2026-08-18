export interface SourceInfo {
  name: string;
  page: number | null;
  source_id?: string | null;
  url?: string | null;
  locator?: string | null;
  content_role?: string | null;
  region?: string | null;
  orthography?: string | null;
  temporal_scope?: string | null;
  usage_mode?: string | null;
  authority_score?: number | null;
  citation_required?: boolean | null;
  accessed_at?: string | null;
  support?: string | null;
  knowledge_card_id?: string | null;
  evidence_kind?: string | null;
}
