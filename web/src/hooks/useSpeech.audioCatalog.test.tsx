import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useSpeech } from "./useSpeech";

it("plays cached audio during refresh, preserves immutable URLs, and adopts reviewed replacements", async () => {
  let clock = 1000000;
  vi.spyOn(Date, "now").mockImplementation(() => clock);
  let finishRefresh!: (value: Response) => void;
  const sources: string[] = [];
  vi.stubGlobal(
    "Audio",
    class {
      onloadeddata: (() => void) | null = null;
      oncanplaythrough: (() => void) | null = null;
      onended = null;
      onerror = null;
      constructor(url: string) {
        sources.push(url);
      }
      load() {
        this.onloadeddata?.();
      }
      pause() {}
      removeAttribute() {}
      play() {
        return Promise.resolve();
      }
    }
  );
  const original = {
    words: { test: { file: "old.mp3", url: "https://example.com/old.mp3", review_status: "needs_review" } },
  };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(original))
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finishRefresh = resolve;
        })
    );
  vi.stubGlobal("fetch", fetcher);
  const view = renderHook(() => useSpeech());
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  await act(async () => {
    await view.result.current.speak("test");
  });
  expect(view.result.current.playbackSource).toBe("generated");
  clock += 61000;
  await act(async () => {
    await view.result.current.speak("test");
  });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(sources[sources.length - 1]).toBe("https://example.com/old.mp3");
  await act(async () => {
    finishRefresh(
      Response.json({
        words: {
          test: {
            file: "new.mp3",
            url: "https://example.com/new.mp3",
            review_status: "approved",
            reviewed_by: "QA reviewer",
            reviewed_at: "2026-10-08",
            reviewer_name: "QA reviewer",
            dialect: "QA fixture",
          },
        },
      })
    );
  });
  await act(async () => {
    await view.result.current.speak("test");
  });
  expect(sources[sources.length - 1]).toBe("https://example.com/new.mp3");
  expect(view.result.current.playbackSource).toBe("reviewed");
  view.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
