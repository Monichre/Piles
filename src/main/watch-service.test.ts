import { describe, expect, it, vi } from "vitest";

import { createWatchService } from "./watch-service";

const createFakeWatcher = () => {
  const listeners = new Map<string, (...args: unknown[]) => void>();

  const watcher = {
    on: vi.fn((eventName: string, listener: (...args: unknown[]) => void) => {
      listeners.set(eventName, listener);
      return watcher;
    }),
    close: vi.fn(),
  };

  return {
    watcher,
    emit(eventName: string, ...args: unknown[]) {
      const listener = listeners.get(eventName);
      if (!listener) {
        throw new Error(`No listener registered for ${eventName}`);
      }
      listener(...args);
    },
  };
};

describe("watch service", () => {
  it("emits change when a direct child folder is added", () => {
    const fakeWatcher = createFakeWatcher();
    const chokidar = {
      watch: vi.fn().mockReturnValue(fakeWatcher.watcher),
    };

    const service = createWatchService({ chokidar: chokidar as never });
    const changeListener = vi.fn();

    service.on("change", changeListener);
    service.watch("/tmp/piles");

    fakeWatcher.emit("addDir", "/tmp/piles/New Folder");

    expect(changeListener).toHaveBeenCalledTimes(1);
  });

  it("emits change when a direct child folder is removed", () => {
    const fakeWatcher = createFakeWatcher();
    const chokidar = {
      watch: vi.fn().mockReturnValue(fakeWatcher.watcher),
    };

    const service = createWatchService({ chokidar: chokidar as never });
    const changeListener = vi.fn();

    service.on("change", changeListener);
    service.watch("/tmp/piles");

    fakeWatcher.emit("unlinkDir", "/tmp/piles/Old Folder");

    expect(changeListener).toHaveBeenCalledTimes(1);
  });
});
