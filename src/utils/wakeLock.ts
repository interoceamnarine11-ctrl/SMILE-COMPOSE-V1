// Enterprise WakeLock / No-Sleep utility to keep screen & worker active during bulk/continuous dispatching
export class WakeLockManager {
  private sentinel: any = null;
  private isRequested = false;
  private fallbackAudio: HTMLAudioElement | null = null;
  private onChangeCallbacks: ((active: boolean) => void)[] = [];

  constructor() {
    // Listen for visibility changes to re-acquire wake lock if minimized & reopened
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', async () => {
        if (this.isRequested && document.visibilityState === 'visible') {
          await this.acquireLock();
        }
      });
    }
  }

  public subscribe(cb: (active: boolean) => void): () => void {
    this.onChangeCallbacks.push(cb);
    cb(this.isActive());
    return () => {
      this.onChangeCallbacks = this.onChangeCallbacks.filter(c => c !== cb);
    };
  }

  private notify() {
    const active = this.isActive();
    this.onChangeCallbacks.forEach(cb => cb(active));
  }

  public isActive(): boolean {
    return this.sentinel !== null || this.fallbackAudio !== null;
  }

  public async enable(): Promise<boolean> {
    this.isRequested = true;
    return await this.acquireLock();
  }

  public async disable(): Promise<void> {
    this.isRequested = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch (e) {
        // ignore
      }
      this.sentinel = null;
    }
    if (this.fallbackAudio) {
      try {
        this.fallbackAudio.pause();
      } catch (e) {
        // ignore
      }
      this.fallbackAudio = null;
    }
    this.notify();
  }

  private async acquireLock(): Promise<boolean> {
    // 1. Try standard Navigator Screen Wake Lock API
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.sentinel = await (navigator as any).wakeLock.request('screen');
        this.sentinel.addEventListener('release', () => {
          this.sentinel = null;
          this.notify();
        });
        this.notify();
        return true;
      } catch (err) {
        console.warn('Screen WakeLock request failed, falling back to silent audio oscillator:', err);
      }
    }

    // 2. Fallback: Silent Audio Loop keeps web worker / timers active on most operating systems
    try {
      if (typeof window !== 'undefined' && !this.fallbackAudio) {
        // Create an ultra-short inaudible wav data URI to prevent OS throttle
        const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        const audio = new Audio(silentWav);
        audio.loop = true;
        await audio.play().catch(() => {});
        this.fallbackAudio = audio;
        this.notify();
        return true;
      }
    } catch (e) {
      console.warn('Fallback no-sleep audio could not start automatically:', e);
    }

    this.notify();
    return false;
  }
}

export const globalWakeLock = new WakeLockManager();
