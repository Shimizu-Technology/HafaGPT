/** Coordinates a single active pronunciation request across hook instances. */
export class SpeechPlaybackCoordinator {
  private activeOwner: symbol | null = null;
  private activeRequest: symbol | null = null;
  private activeStop: (() => void) | null = null;

  claim(owner: symbol, stop: () => void): () => boolean {
    this.activeStop?.();

    const request = Symbol('speech-request');
    this.activeOwner = owner;
    this.activeRequest = request;
    this.activeStop = stop;

    return () => this.activeOwner === owner && this.activeRequest === request;
  }

  invalidate(owner: symbol): void {
    if (this.activeOwner !== owner) return;
    this.activeOwner = null;
    this.activeRequest = null;
    this.activeStop = null;
  }

  ownsPlayback(owner: symbol): boolean {
    return this.activeOwner === owner;
  }
}

export const speechPlaybackCoordinator = new SpeechPlaybackCoordinator();
