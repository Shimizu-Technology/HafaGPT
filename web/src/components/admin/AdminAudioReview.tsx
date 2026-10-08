import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { ArrowLeft, Check, Mic, Pause, Play, Plus, Search, Square, Upload } from "lucide-react";
import { AdminLayout } from "./AdminLayout";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cream-300 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600";
const primary = `${button} border-transparent bg-coral-700 text-white hover:bg-coral-800 dark:bg-ocean-700 dark:hover:bg-ocean-800`;
const field =
  "mt-1 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-brown-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white";
interface Word {
  chamorro: string;
  english: string;
  tier: string;
  status: string;
  url: string;
}
interface Candidate {
  id: string;
  word: string;
  provider: string;
  model: string;
  input_mode: string;
  input_text: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  reviewer_name?: string;
  reviewed_at?: string;
  dialect?: string;
  notes?: string;
  published: boolean;
  consent_reference?: string;
}
interface Library {
  words: Word[];
  stats: { total: number; approved: number; needs_review: number };
  config: {
    models: { id: string; label: string; provider: string }[];
    default_model: string;
    voice_id: string;
    can_record: boolean;
    manifest_sync_pending?: boolean;
    elevenlabs_configured?: boolean;
  };
}
type RequestAPI = (path: string, init?: RequestInit) => Promise<Response>;
async function jsonResponse(response: Response) {
  return response.json();
}

export function AdminAudioReview() {
  const { getToken } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Word | null>(null);
  const [limit, setLimit] = useState(40);
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState("");
  const [newEnglish, setNewEnglish] = useState("");
  const queryClient = useQueryClient();
  const librarySearch = useRef<HTMLInputElement>(null);
  const previousSelection = useRef<Word | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setLimit(40);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  const request = useCallback<RequestAPI>(
    async (path, init = {}) => {
      const token = await getToken();
      if (!token) throw new Error("Your sign-in expired. Sign in again to review audio.");
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 90000);
      try {
        const response = await fetch(`${API_URL}${path}`, {
          ...init,
          signal: controller.signal,
          headers: { ...init.headers, Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(
            typeof error.detail === "string"
              ? error.detail
              : typeof error.error === "string"
                ? error.error
                : "The request failed. Please try again."
          );
        }
        return response;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          throw new Error("This request took too long. Refresh the candidate list before retrying.");
        throw error;
      } finally {
        window.clearTimeout(timer);
      }
    },
    [getToken]
  );
  const library = useQuery<Library>({
    queryKey: ["admin-audio", debouncedSearch, filter],
    queryFn: async () => {
      const result = await jsonResponse(
        await request(`/api/admin/audio?${new URLSearchParams({ search: debouncedSearch, status_filter: filter })}`)
      );
      if (!Array.isArray(result.config?.models))
        throw new Error("The pronunciation studio is updating. Try again in a moment.");
      return result;
    },
  });
  const syncManifest = useMutation({
    mutationFn: () => request("/api/admin/audio/sync-manifest", { method: "POST" }).then(jsonResponse),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-audio"] }),
  });
  const addItem = useMutation({
    mutationFn: () =>
      request("/api/admin/audio/pilot-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: newText, english: newEnglish }),
      }).then(jsonResponse),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-audio"] });
      setSearch(newText);
      setNewText("");
      setNewEnglish("");
      setShowAdd(false);
    },
  });
  useEffect(() => {
    if (selected) detailHeading.current?.focus();
    else if (previousSelection.current) librarySearch.current?.focus();
    previousSelection.current = selected;
  }, [selected]);
  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6 text-brown-900 dark:text-white">
        <header>
          <h1 className="text-2xl font-bold sm:text-3xl">Pronunciation studio</h1>
          <p className="mt-2 max-w-2xl text-brown-600 dark:text-slate-300">
            Listen, compare, and publish audio reviewed with a qualified Chamorro speaker. New candidates stay private
            until you publish them.
          </p>
        </header>
        {library.data && (
          <p className="text-sm text-brown-600 dark:text-slate-300">
            {library.data.stats.total} words and phrases · {library.data.stats.approved} reviewed
          </p>
        )}
        {library.data?.config.manifest_sync_pending && (
          <div role="status" className="rounded-xl border border-amber-300 p-4 text-sm">
            Published audio is saved. The distribution library still needs to sync.
            <button
              className={`${button} mt-2 sm:ml-3`}
              disabled={syncManifest.isPending}
              onClick={() => syncManifest.mutate()}
            >
              {syncManifest.isPending ? "Syncing…" : "Retry library sync"}
            </button>
            {syncManifest.error && <p role="alert">{syncManifest.error.message}</p>}
          </div>
        )}
        {library.error && (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {library.error.message}
            <button className={`${button} ml-3`} onClick={() => library.refetch()}>
              Try again
            </button>
          </div>
        )}
        <div className="grid items-start gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <section
            aria-label="Audio library"
            className={`${selected ? "hidden lg:block" : ""} rounded-2xl border border-cream-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-800`}
          >
            <label className="block text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Search size={16} />
                Find a word or phrase
              </span>
              <input
                ref={librarySearch}
                className={field}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Chamorro or English"
              />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Review status
              <select
                className={field}
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setLimit(40);
                }}
              >
                <option value="">All audio</option>
                <option value="needs_review">Needs review</option>
                <option value="approved">Reviewed</option>
              </select>
            </label>
            <button className={`${button} mt-3 w-full`} onClick={() => setShowAdd(!showAdd)} aria-expanded={showAdd}>
              <Plus size={16} />
              Add a pilot phrase
            </button>
            {showAdd && (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  addItem.mutate();
                }}
              >
                <label className="block text-sm">
                  Chamorro text
                  <input
                    required
                    maxLength={4096}
                    className={field}
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  English meaning
                  <input
                    required
                    maxLength={1000}
                    className={field}
                    value={newEnglish}
                    onChange={(e) => setNewEnglish(e.target.value)}
                  />
                </label>
                <p className="text-xs text-brown-600 dark:text-slate-300">
                  Use source-backed text. Adding a pilot phrase does not publish a lesson or new learner audio.
                </p>
                {addItem.error && (
                  <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                    {addItem.error.message}
                  </p>
                )}
                <button className={primary} disabled={addItem.isPending}>
                  {addItem.isPending ? "Adding…" : "Add phrase"}
                </button>
              </form>
            )}
            {library.isLoading && (
              <p role="status" className="py-6">
                Loading audio library…
              </p>
            )}
            {library.data?.words.length === 0 && (
              <p className="py-6 text-sm">No matching audio. Try another word or add a pilot phrase.</p>
            )}
            <ul className="mt-4 max-h-[55vh] space-y-1 overflow-y-auto" aria-label="Words and phrases">
              {library.data?.words.slice(0, limit).map((word) => (
                <li key={word.chamorro}>
                  <button
                    aria-pressed={selected?.chamorro === word.chamorro}
                    onClick={() => setSelected(word)}
                    className={`min-h-14 w-full rounded-xl px-3 py-3 text-left hover:bg-cream-100 dark:hover:bg-slate-700 ${selected?.chamorro === word.chamorro ? "bg-cream-100 dark:bg-slate-700" : ""}`}
                  >
                    <span className="block font-semibold">{word.chamorro}</span>
                    <span className="block text-sm text-brown-600 dark:text-slate-300">{word.english}</span>
                    <span className="text-xs text-brown-500 dark:text-slate-400">
                      {word.status === "approved" ? "Reviewed" : "Needs review"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {(library.data?.words.length || 0) > limit && (
              <button className={`${button} mt-3 w-full`} onClick={() => setLimit(limit + 40)}>
                Show more
              </button>
            )}
          </section>
          <section className="min-w-0" aria-label="Audio comparison">
            {selected && library.data ? (
              <>
                <button className={`${button} mb-4 lg:hidden`} onClick={() => setSelected(null)}>
                  <ArrowLeft size={16} />
                  Back to library
                </button>
                <h2 ref={detailHeading} tabIndex={-1} className="break-words text-2xl font-bold outline-offset-4">
                  {selected.chamorro}
                </h2>
                <p className="mb-5 mt-1 text-brown-600 dark:text-slate-300">{selected.english}</p>
                <AudioComparison
                  key={selected.chamorro}
                  word={selected}
                  config={library.data.config}
                  request={request}
                />
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-cream-300 p-8 text-brown-600 dark:border-slate-600 dark:text-slate-300">
                Choose a word or phrase to hear its current audio and compare new candidates.
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function AudioComparison({ word, config, request }: { word: Word; config: Library["config"]; request: RequestAPI }) {
  const path = `/api/admin/audio/${encodeURIComponent(word.chamorro)}`;
  const queryClient = useQueryClient();
  const [model, setModel] = useState(config.default_model || "eleven_v4");
  const [mode, setMode] = useState("original");
  const [pronunciation, setPronunciation] = useState("");
  const [message, setMessage] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const blobUrl = useRef<string | null>(null);
  const playbackSequence = useRef(0);
  const stop = useCallback(() => {
    playbackSequence.current++;
    if (audio.current) {
      audio.current.onended = null;
      audio.current.onerror = null;
      audio.current.pause();
    }
    audio.current = null;
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    blobUrl.current = null;
    setPlaying(null);
  }, []);
  useEffect(
    () => () => {
      playbackSequence.current++;
      if (audio.current) {
        audio.current.onended = null;
        audio.current.onerror = null;
        audio.current.pause();
      }
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    },
    []
  );
  const play = async (id: string, source: string, privateAudio = false) => {
    if (playing === id) {
      stop();
      return;
    }
    stop();
    setPlaybackError("");
    const sequence = playbackSequence.current;
    try {
      const url = privateAudio ? URL.createObjectURL(await (await request(source)).blob()) : source;
      if (sequence !== playbackSequence.current) {
        if (privateAudio) URL.revokeObjectURL(url);
        return;
      }
      if (privateAudio) blobUrl.current = url;
      const next = new Audio(url);
      audio.current = next;
      setPlaying(id);
      next.onended = () => {
        if (sequence === playbackSequence.current && audio.current === next) stop();
      };
      next.onerror = () => {
        if (sequence !== playbackSequence.current || audio.current !== next) return;
        stop();
        setPlaybackError("This recording could not be played. Please try again.");
      };
      await next.play();
    } catch (error) {
      if (sequence === playbackSequence.current) {
        stop();
        setPlaybackError(error instanceof Error ? error.message : "Audio playback failed.");
      }
    }
  };
  const candidates = useQuery<{ candidates: Candidate[] }>({
    queryKey: ["audio-candidates", word.chamorro],
    queryFn: () => request(`${path}/candidates`).then(jsonResponse),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["audio-candidates", word.chamorro] });
    queryClient.invalidateQueries({ queryKey: ["admin-audio"] });
  };
  const generate = useMutation({
    mutationFn: () =>
      request(`${path}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: config.models.find((item) => item.id === model)?.provider ?? "elevenlabs",
          model,
          input_mode: mode,
          pronunciation: mode === "original" ? undefined : pronunciation,
        }),
      }).then(jsonResponse),
    onSuccess: () => {
      refresh();
      setMessage("Candidate ready. Listen and review it before publishing.");
    },
  });
  const publish = useMutation({
    mutationFn: (id: string) => request(`${path}/candidates/${id}/publish`, { method: "POST" }).then(jsonResponse),
    onSuccess: (result) => {
      stop();
      refresh();
      setMessage(
        result.manifest_synced === false
          ? "Published audio is saved. Retry the distribution library sync above."
          : "Published. Learners will hear this recording when the audio library refreshes."
      );
    },
  });
  const current = candidates.data?.candidates.find((candidate) => candidate.published);
  const currentUrl = current ? `${path}/candidates/${current.id}/audio` : word.url;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-cream-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Current learner audio</h3>
            <p className="text-sm text-brown-600 dark:text-slate-300">
              {current
                ? `Reviewed by ${current.reviewer_name} · ${current.dialect}`
                : "Existing recording · native review pending"}
            </p>
          </div>
          <button
            className={button}
            disabled={!currentUrl}
            onClick={() => play("current", currentUrl, Boolean(current))}
          >
            {playing === "current" ? <Pause size={16} /> : <Play size={16} />}
            {playing === "current" ? "Stop current audio" : "Play current audio"}
          </button>
        </div>
      </div>
      {playbackError && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {playbackError}
        </p>
      )}
      <form
        className="space-y-4 rounded-2xl border border-cream-300 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-800"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage("");
          generate.mutate();
        }}
      >
        <h3 className="text-lg font-semibold">Create a comparison</h3>
        <p className="text-sm text-brown-600 dark:text-slate-300">
          Generate one private candidate at a time. Each request uses provider credits.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Speech model
            <select
              className={field}
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                if (e.target.value !== "eleven_v4" && mode === "ipa") setMode("original");
              }}
            >
              {config.models.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Pronunciation input
            <select className={field} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="original">Original Chamorro spelling</option>
              {model === "eleven_v4" && <option value="ipa">IPA transcription</option>}
              <option value="respelling">Pronunciation hint</option>
            </select>
          </label>
        </div>
        {mode !== "original" && (
          <label className="block text-sm font-semibold">
            {mode === "ipa" ? "IPA transcription" : "Pronunciation hint"}
            <textarea
              aria-label={mode === "ipa" ? "IPA transcription" : "Pronunciation hint"}
              required
              maxLength={4096}
              rows={3}
              className={field}
              value={pronunciation}
              onChange={(e) => setPronunciation(e.target.value)}
            />
            <span className="mt-1 block text-xs font-normal text-brown-600 dark:text-slate-300">
              {mode === "ipa"
                ? "Use a transcription checked by a qualified speaker or linguist. We add the synthesis delimiters for you."
                : "This affects spoken audio only. The Chamorro spelling stays unchanged."}
            </span>
          </label>
        )}
        {generate.error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            {generate.error.message}
          </p>
        )}
        <button className={primary} disabled={generate.isPending}>
          {generate.isPending ? "Generating candidate…" : "Generate candidate"}
        </button>
      </form>
      <NativeRecording
        path={path}
        request={request}
        onSaved={() => {
          refresh();
          setMessage("Native recording saved privately. Review it before publishing.");
        }}
        canRecord={config.can_record}
      />
      {message && (
        <p
          role="status"
          className="rounded-xl bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-200"
        >
          {message}
        </p>
      )}
      {publish.error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {publish.error.message}
        </p>
      )}
      <div>
        <h3 className="text-lg font-semibold">Candidates</h3>
        <p className="mb-4 text-sm text-brown-600 dark:text-slate-300">
          Compare pronunciation first, then delivery. Publishing is a separate step after review.
        </p>
        {candidates.isLoading && <p role="status">Loading candidates…</p>}
        {candidates.error && (
          <p role="alert">
            {candidates.error.message}
            <button className={`${button} ml-2`} onClick={() => candidates.refetch()}>
              Try again
            </button>
          </p>
        )}
        {candidates.data?.candidates.length === 0 && (
          <p className="rounded-xl border border-dashed border-cream-300 p-5 text-sm dark:border-slate-600">
            No candidates yet. Generate audio above or add a native recording.
          </p>
        )}
        <div className="space-y-4">
          {candidates.data?.candidates.map((candidate) => (
            <article
              key={candidate.id}
              className="rounded-2xl border border-cream-300 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold">
                    {candidate.provider === "human_recording"
                      ? "Native recording"
                      : (config.models.find((item) => item.id === candidate.model)?.label ?? candidate.model)}{" "}
                    ·{" "}
                    {candidate.input_mode === "ipa"
                      ? "IPA"
                      : candidate.input_mode === "respelling"
                        ? "Pronunciation hint"
                        : "Original spelling"}
                  </h4>
                  <p className="mt-1 text-xs text-brown-600 dark:text-slate-300">
                    {new Date(candidate.created_at).toLocaleString()} ·{" "}
                    {candidate.published
                      ? "Published"
                      : candidate.status === "approved"
                        ? "Reviewed · ready to publish"
                        : candidate.status === "rejected"
                          ? "Rejected"
                          : "Needs review"}
                  </p>
                </div>
                <button
                  className={button}
                  onClick={() => play(candidate.id, `${path}/candidates/${candidate.id}/audio`, true)}
                >
                  {playing === candidate.id ? <Pause size={16} /> : <Play size={16} />}
                  {playing === candidate.id ? "Stop candidate" : "Play candidate"}
                </button>
              </div>
              <details className="mt-3 text-sm">
                <summary className="min-h-11 cursor-pointer py-3">Synthesis text and review details</summary>
                <p className="whitespace-pre-wrap break-words rounded-lg bg-cream-50 p-3 dark:bg-slate-900">
                  {candidate.input_text}
                </p>
                {candidate.reviewer_name && (
                  <p className="mt-2">
                    Reviewed by {candidate.reviewer_name} · {candidate.dialect}
                  </p>
                )}
                {candidate.notes && <p className="mt-2 whitespace-pre-wrap">{candidate.notes}</p>}
              </details>
              {candidate.status === "pending" && (
                <CandidateReview
                  candidate={candidate}
                  path={path}
                  request={request}
                  onSaved={() => {
                    refresh();
                    setMessage("Review saved. Approved audio is ready for a separate publish step.");
                  }}
                />
              )}
              {candidate.status === "approved" && (
                <div className="mt-3">
                  <p className="mb-3 text-sm text-brown-600 dark:text-slate-300">
                    {candidate.published
                      ? "This is the current learner recording."
                      : "Publishing replaces the current learner recording. Earlier reviewed candidates remain available to restore."}
                  </p>
                  <button
                    className={primary}
                    disabled={candidate.published || publish.isPending}
                    onClick={() => publish.mutate(candidate.id)}
                  >
                    <Check size={16} />
                    {publish.isPending && publish.variables === candidate.id
                      ? "Publishing…"
                      : candidate.published
                        ? "Published"
                        : "Publish for learners"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function CandidateReview({
  candidate,
  path,
  request,
  onSaved,
}: {
  candidate: Candidate;
  path: string;
  request: RequestAPI;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dialect, setDialect] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(candidate.consent_reference || "");
  const [confirmed, setConfirmed] = useState(false);
  const [pronunciationScore, setPronunciationScore] = useState("");
  const [naturalnessScore, setNaturalnessScore] = useState("");
  const review = useMutation({
    mutationFn: (status: string) =>
      request(`${path}/candidates/${candidate.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewer_name: name,
          dialect,
          notes,
          consent_reference: consent,
          native_review_confirmed: confirmed,
          pronunciation_score: pronunciationScore ? Number(pronunciationScore) : undefined,
          naturalness_score: naturalnessScore ? Number(naturalnessScore) : undefined,
        }),
      }).then(jsonResponse),
    onSuccess: onSaved,
  });
  return (
    <div className="mt-3">
      <button className={button} aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Close review" : "Review this candidate"}
      </button>
      {open && (
        <form
          className="mt-4 space-y-4 border-t border-cream-200 pt-4 dark:border-slate-600"
          onSubmit={(e) => {
            e.preventDefault();
            review.mutate("approved");
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Chamorro reviewer name
              <input
                required
                maxLength={200}
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="text-sm font-semibold">
              Island / regional pronunciation
              <input
                required
                maxLength={200}
                className={field}
                value={dialect}
                onChange={(e) => setDialect(e.target.value)}
                placeholder="Reviewer’s regional expertise"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Pronunciation accuracy", pronunciationScore, setPronunciationScore],
              ["Naturalness", naturalnessScore, setNaturalnessScore],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="text-sm">
                {label as string}
                <select
                  className={field}
                  value={value as string}
                  onChange={(e) => (setter as (value: string) => void)(e.target.value)}
                >
                  <option value="">Optional score</option>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <option key={score} value={score}>
                      {score} / 5
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <label className="block text-sm">
            Review notes
            <textarea
              rows={2}
              maxLength={2000}
              className={field}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {candidate.provider === "human_recording" && (
            <label className="block text-sm font-semibold">
              Speaker consent reference
              <input
                required
                maxLength={500}
                className={field}
                value={consent}
                onChange={(e) => setConsent(e.target.value)}
              />
              <span className="mt-1 block text-xs font-normal">
                Reference permission for public use in HåfaGPT. Keep private consent documents outside this form.
              </span>
            </label>
          )}
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input
              className="mt-1 h-5 w-5 shrink-0"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              I listened to this exact recording and reviewed its pronunciation with the named qualified Chamorro
              speaker.
            </span>
          </label>
          {review.error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {review.error.message}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button className={primary} disabled={review.isPending || !confirmed}>
              Approve review
            </button>
            <button
              type="button"
              className={button}
              disabled={review.isPending || !notes.trim() || !name.trim() || !dialect.trim()}
              onClick={() => review.mutate("rejected")}
            >
              Reject with notes
            </button>
          </div>
          <p className="text-xs text-brown-600 dark:text-slate-300">
            Approval records the review. Learners hear it only after you publish.
          </p>
        </form>
      )}
    </div>
  );
}

function NativeRecording({
  path,
  request,
  onSaved,
  canRecord,
}: {
  path: string;
  request: RequestAPI;
  onSaved: () => void;
  canRecord: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [clip, setClip] = useState<Blob | null>(null);
  const [consent, setConsent] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const startingRef = useRef(false);
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state !== "inactive") recorder.current.stop();
      }
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  useEffect(() => {
    if (!clip) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(clip);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [clip]);
  const start = async () => {
    if (startingRef.current || recorder.current?.state === "recording") return;
    startingRef.current = true;
    setStarting(true);
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error("This browser cannot record audio. Upload a recording instead.");
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (!mounted.current) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = nextStream;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) =>
        MediaRecorder.isTypeSupported(type)
      );
      const next = new MediaRecorder(nextStream, mime ? { mimeType: mime } : undefined);
      recorder.current = next;
      const chunks: BlobPart[] = [];
      let bytes = 0;
      next.ondataavailable = (event) => {
        bytes += event.data.size;
        chunks.push(event.data);
        if (bytes > 5 * 1024 * 1024 && next.state !== "inactive") next.stop();
      };
      next.onstop = () => {
        if (recordingTimer.current) clearTimeout(recordingTimer.current);
        nextStream.getTracks().forEach((track) => track.stop());
        if (mounted.current) {
          setRecording(false);
          if (bytes > 5 * 1024 * 1024) {
            setClip(null);
            setError("Recording exceeded 5 MB. Record a shorter clip.");
          } else setClip(new Blob(chunks, { type: next.mimeType }));
        }
      };
      next.start(1000);
      setClip(null);
      setRecording(true);
      recordingTimer.current = setTimeout(() => {
        if (next.state !== "inactive") next.stop();
      }, 60000);
    } catch (failure) {
      stream.current?.getTracks().forEach((track) => track.stop());
      setError(failure instanceof Error ? failure.message : "Microphone access failed.");
    } finally {
      startingRef.current = false;
      if (mounted.current) setStarting(false);
    }
  };
  const upload = useMutation({
    mutationFn: () => {
      const data = new FormData();
      data.append("audio_file", clip!, clip?.type.includes("mp4") ? "recording.m4a" : "recording.webm");
      data.append("consent_reference", consent);
      return request(`${path}/upload-recording`, { method: "POST", body: data }).then(jsonResponse);
    },
    onSuccess: () => {
      setClip(null);
      setOpen(false);
      onSaved();
    },
  });
  return (
    <section className="rounded-2xl border border-cream-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <button className={button} aria-expanded={open} onClick={() => setOpen(!open)} disabled={recording || starting}>
        <Mic size={16} />
        {open ? "Close native recording" : "Add a native recording"}
      </button>
      {open && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-brown-600 dark:text-slate-300">
            Record a consenting speaker or upload a short recording (up to 60 seconds and 5 MB). It stays private until
            reviewed and published.
          </p>
          {!canRecord && (
            <p role="alert" className="text-sm">
              Recording uploads are unavailable until the audio converter is installed on the API.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              className={button}
              disabled={!canRecord || upload.isPending || starting}
              onClick={() => (recording ? recorder.current?.stop() : start())}
            >
              {recording ? <Square size={16} /> : <Mic size={16} />}
              {starting ? "Opening microphone…" : recording ? "Stop recording" : "Record audio"}
            </button>
            <label className={`${button} cursor-pointer`}>
              <Upload size={16} />
              Choose audio file
              <input
                className="sr-only"
                type="file"
                accept="audio/*"
                disabled={recording || starting || upload.isPending || !canRecord}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && file.size <= 5 * 1024 * 1024) {
                    setClip(file);
                    setError("");
                  } else setError("Choose an audio file smaller than 5 MB.");
                }}
              />
            </label>
          </div>
          {recording && <p role="status">Recording… Stop when the word or phrase is complete.</p>}
          {preview && <audio controls src={preview} className="w-full" aria-label="Preview native recording" />}
          <label className="block text-sm font-semibold">
            Speaker consent reference
            <input
              className={field}
              maxLength={500}
              value={consent}
              onChange={(e) => setConsent(e.target.value)}
              placeholder="Permission record or agreement reference"
            />
          </label>
          {(error || upload.error) && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {error || upload.error?.message}
            </p>
          )}
          <button
            className={primary}
            disabled={!clip || recording || !consent.trim() || upload.isPending || !canRecord}
            onClick={() => upload.mutate()}
          >
            {upload.isPending ? "Saving recording…" : "Save private candidate"}
          </button>
        </div>
      )}
    </section>
  );
}
