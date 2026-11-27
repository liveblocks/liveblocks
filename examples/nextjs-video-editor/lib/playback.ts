type Listener = () => void;

/**
 * The local playback clock. Playback is per user (everyone watches at their
 * own pace) so it lives outside Liveblocks; the playhead is shared through
 * presence instead. Components subscribe to it with `useSyncExternalStore`,
 * so only what depends on the time re-renders on every frame.
 */
export class Playback {
  time = 0;
  playing = false;
  duration = 0;
  loop = false;
  // Bumped by seeks that should scroll the timeline to the playhead (jumping
  // to a comment or a collaborator), but not by scrubbing.
  revealId = 0;

  private listeners = new Set<Listener>();
  private frame = 0;
  private startedAt = 0;
  private startTime = 0;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  setDuration(duration: number) {
    this.duration = duration;
    if (this.time > duration) {
      this.seek(duration);
    } else {
      this.emit();
    }
  }

  setLoop(loop: boolean) {
    this.loop = loop;
    this.emit();
  }

  seek(time: number, options: { reveal?: boolean } = {}) {
    this.time = Math.min(Math.max(0, time), this.duration);
    this.startTime = this.time;
    this.startedAt = performance.now();
    if (options.reveal) {
      this.revealId += 1;
    }
    this.emit();
  }

  play() {
    if (this.playing || this.duration <= 0) return;
    if (this.time >= this.duration - 0.01) {
      this.time = 0;
    }
    this.playing = true;
    this.startTime = this.time;
    this.startedAt = performance.now();
    this.frame = requestAnimationFrame(this.tick);
    this.emit();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.frame);
    this.emit();
  }

  toggle() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  private tick = () => {
    const time = this.startTime + (performance.now() - this.startedAt) / 1000;
    if (time >= this.duration) {
      if (this.loop) {
        this.seek(0);
      } else {
        this.time = this.duration;
        this.pause();
        return;
      }
    } else {
      this.time = time;
      this.emit();
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  destroy() {
    cancelAnimationFrame(this.frame);
    this.listeners.clear();
  }
}
