import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSpeech } from "./useSpeech";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("releases failed live speech, uses device speech, and finishes without a stuck button", async () => {
  let utterance: SpeechSynthesisUtterance | undefined;
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
  vi.stubGlobal("speechSynthesis", { cancel: vi.fn(), speak: vi.fn((value) => { utterance = value; value.onstart?.(); }) });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/api/tts")
    ? Response.json({ detail: "Pronunciation audio is unavailable right now." }, { status: 503 })
    : Response.json({ words: {} })));
  const view = renderHook(() => useSpeech());
  await act(async () => { await view.result.current.speak("English test fixture"); });
  expect(view.result.current.playbackSource).toBe("device");
  expect(view.result.current.isSpeaking).toBe(true);
  expect(utterance?.lang).toBe("es-ES");
  await act(async () => { utterance?.onend?.({} as SpeechSynthesisEvent); });
  expect(view.result.current.isSpeaking).toBe(false);
  view.unmount();
});

it("shows a recoverable error when live speech and device speech are unavailable", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/api/tts")
    ? Response.json({}, { status: 503 }) : Response.json({ words: {} })));
  const view = renderHook(() => useSpeech());
  await act(async () => { await view.result.current.speakFresh("English test fixture"); });
  expect(view.result.current.isSpeaking).toBe(false);
  expect(view.result.current.speechError).toBe("Pronunciation audio is unavailable on this device.");
  view.unmount();
});
