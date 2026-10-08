import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { AdminAudioReview } from "./AdminAudioReview";
vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ getToken: async () => "test-token" }) }));
vi.mock("./AdminLayout", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
let candidates: Record<string, unknown>[];
const calls: { path: string; body: Record<string, unknown> }[] = [];
const word = {
  chamorro: "Håfa",
  english: "What",
  tier: "1",
  status: "needs_review",
  url: "https://example.com/audio.mp3",
};
beforeEach(() => {
  candidates = [];
  calls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      calls.push({ path: url, body });
      if (url.endsWith("/regenerate")) {
        candidates = [
          {
            id: "candidate-1",
            word: word.chamorro,
            provider: "elevenlabs",
            model: "eleven_v4",
            input_mode: body.input_mode,
            input_text: body.pronunciation || word.chamorro,
            created_at: "2026-10-08T00:00:00Z",
            status: "pending",
            published: false,
          },
        ];
        return Response.json({ candidate: candidates[0] });
      }
      if (url.endsWith("/review")) {
        candidates[0] = { ...candidates[0], ...body, status: "approved" };
        return Response.json({ candidate: candidates[0] });
      }
      if (url.endsWith("/publish")) {
        candidates[0].published = true;
        return Response.json({ success: true });
      }
      if (url.endsWith("/candidates")) return Response.json({ candidates });
      return Response.json({
        words: [word],
        stats: { total: 1, approved: 0 },
        config: {
          default_model: "eleven_v4",
          voice_id: "voice",
          can_record: true,
          models: [
            { id: "eleven_v4", label: "Eleven v4", provider: "elevenlabs" },
            { id: "eleven_multilingual_v2", label: "Eleven Multilingual v2", provider: "elevenlabs" },
          ],
        },
      });
    })
  );
});
function mount() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
    >
      <AdminAudioReview />
    </QueryClientProvider>
  );
}
it("creates a private IPA candidate, requires named review, then explicitly publishes", async () => {
  mount();
  fireEvent.click(await screen.findByRole("button", { name: /Håfa What/ }));
  fireEvent.change(screen.getByLabelText("Pronunciation input"), { target: { value: "ipa" } });
  fireEvent.change(screen.getByLabelText("IPA transcription"), { target: { value: "verified IPA test fixture" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate candidate" }));
  await screen.findByRole("button", { name: "Review this candidate" });
  expect(calls.find((call) => call.path.endsWith("/regenerate"))?.body).toMatchObject({
    model: "eleven_v4",
    input_mode: "ipa",
    pronunciation: "verified IPA test fixture",
  });
  expect(screen.queryByRole("button", { name: "Publish for learners" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Review this candidate" }));
  expect(screen.getByRole("button", { name: "Approve review" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Chamorro reviewer name"), { target: { value: "QA fixture reviewer" } });
  fireEvent.change(screen.getByLabelText("Island / regional pronunciation"), {
    target: { value: "QA fixture region" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Approve review" }));
  const publish = await screen.findByRole("button", { name: "Publish for learners" });
  expect(calls.some((call) => call.path.endsWith("/publish"))).toBe(false);
  fireEvent.click(publish);
  await waitFor(() => expect(calls.some((call) => call.path.endsWith("/publish"))).toBe(true));
});
it("removes IPA when switching to a model that does not support it", async () => {
  mount();
  fireEvent.click(await screen.findByRole("button", { name: /Håfa What/ }));
  fireEvent.change(screen.getByLabelText("Pronunciation input"), { target: { value: "ipa" } });
  fireEvent.change(screen.getByLabelText("Speech model"), { target: { value: "eleven_multilingual_v2" } });
  expect(screen.getByLabelText("Pronunciation input")).toHaveValue("original");
  expect(screen.queryByLabelText("IPA transcription")).not.toBeInTheDocument();
});
it("shows provider failure and keeps publish unavailable", async () => {
  mount();
  fireEvent.click(await screen.findByRole("button", { name: /Håfa What/ }));
  const original = global.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) =>
      url.endsWith("/regenerate")
        ? Promise.resolve(Response.json({ error: "Model unavailable", detail: null }, { status: 503 }))
        : original(url, init)
    )
  );
  fireEvent.click(screen.getByRole("button", { name: "Generate candidate" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Model unavailable");
  expect(screen.queryByRole("button", { name: "Publish for learners" })).not.toBeInTheDocument();
});

it("guards microphone startup and releases a stream that resolves after leaving the page", async () => {
  let resolveStream!: (value: MediaStream) => void;
  const stop = vi.fn();
  const getUserMedia = vi.fn(
    () =>
      new Promise<MediaStream>((resolve) => {
        resolveStream = resolve;
      })
  );
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  vi.stubGlobal(
    "MediaRecorder",
    class {
      static isTypeSupported() {
        return true;
      }
    }
  );
  const view = mount();
  fireEvent.click(await screen.findByRole("button", { name: /Håfa What/ }));
  fireEvent.click(screen.getByRole("button", { name: "Add a native recording" }));
  fireEvent.click(screen.getByRole("button", { name: "Record audio" }));
  expect(screen.getByRole("button", { name: "Opening microphone…" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Opening microphone…" }));
  expect(getUserMedia).toHaveBeenCalledTimes(1);
  view.unmount();
  resolveStream({ getTracks: () => [{ stop }] } as unknown as MediaStream);
  await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
});

it("ignores queued playback events from a previous candidate", async () => {
  const audios: {
    onended: (() => void) | null;
    onerror: (() => void) | null;
    pause: ReturnType<typeof vi.fn>;
    play: () => Promise<void>;
  }[] = [];
  vi.stubGlobal(
    "Audio",
    class {
      onended = null;
      onerror = null;
      pause = vi.fn();
      play = async () => {};
      constructor() {
        audios.push(this);
      }
    }
  );
  URL.createObjectURL = vi.fn(() => "blob:qa-fixture");
  URL.revokeObjectURL = vi.fn();
  candidates = ["first", "second"].map((id) => ({
    id,
    word: word.chamorro,
    provider: "elevenlabs",
    model: "eleven_v4",
    input_mode: "original",
    input_text: word.chamorro,
    created_at: "2026-10-08T00:00:00Z",
    status: "pending",
    published: false,
  }));
  mount();
  fireEvent.click(await screen.findByRole("button", { name: /Håfa What/ }));
  const buttons = await screen.findAllByRole("button", { name: "Play candidate" });
  fireEvent.click(buttons[0]);
  await waitFor(() => expect(audios).toHaveLength(1));
  const oldError = audios[0].onerror;
  fireEvent.click(screen.getByRole("button", { name: "Play candidate" }));
  await waitFor(() => expect(audios).toHaveLength(2));
  expect(audios[0].onerror).toBeNull();
  oldError?.();
  expect(audios[1].pause).not.toHaveBeenCalled();
  expect(screen.queryByText("This recording could not be played. Please try again.")).not.toBeInTheDocument();
});
