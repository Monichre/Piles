import chokidar, { type FSWatcher } from "chokidar";

export type WatchEventType =
  | "add"
  | "addDir"
  | "unlink"
  | "unlinkDir"
  | "change"
  | "ready";

export type WatchServiceEvents = {
  change: () => void;
};

export type WatchServiceDependencies = {
  chokidar?: typeof chokidar;
};

export type WatchService = {
  watch: (folderPath: string) => void;
  unwatch: () => void;
  isWatching: () => boolean;
  getWatchedPath: () => string | null;
  on<K extends keyof WatchServiceEvents>(eventName: K, listener: WatchServiceEvents[K]): void;
  off<K extends keyof WatchServiceEvents>(eventName: K, listener: WatchServiceEvents[K]): void;
};

export const createWatchService = (
  deps: WatchServiceDependencies = {}
): WatchService => {
  const { chokidar: chokidarLib = chokidar } = deps;

  let watcher: FSWatcher | null = null;
  let watchedPath: string | null = null;

  const listeners: Map<string, Set<() => void>> = new Map();

  const on = (eventName: string, listener: () => void) => {
    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }
    listeners.get(eventName)!.add(listener);
  };

  const off = (eventName: string, listener: () => void) => {
    listeners.get(eventName)?.delete(listener);
  };

  const emit = (eventName: string) => {
    listeners.get(eventName)?.forEach((listener) => listener());
  };

  const watch = (folderPath: string) => {
    // Clean up existing watcher if any
    if (watcher) {
      watcher.close();
    }

    watchedPath = folderPath;

    watcher = chokidarLib.watch(folderPath, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      depth: 0, // Only watch the direct contents, not subdirectories
      ignoreInitial: true, // Don't fire events for initial scan
      awaitWriteFinish: {
        stabilityThreshold: 150,
        pollInterval: 50,
      },
    });

    // Watch for file additions
    watcher.on("add", (filePath) => {
      console.log(`[WatchService] File added: ${filePath}`);
      emit("change");
    });

    watcher.on("addDir", (folderPath) => {
      console.log(`[WatchService] Folder added: ${folderPath}`);
      emit("change");
    });

    // Watch for file deletions (unlink = removed from directory)
    watcher.on("unlink", (filePath) => {
      console.log(`[WatchService] File removed: ${filePath}`);
      emit("change");
    });

    watcher.on("unlinkDir", (folderPath) => {
      console.log(`[WatchService] Folder removed: ${folderPath}`);
      emit("change");
    });

    // Watch for file changes (modifications)
    watcher.on("change", (filePath) => {
      console.log(`[WatchService] File changed: ${filePath}`);
      emit("change");
    });

    // Initial scan complete
    watcher.on("ready", () => {
      console.log(`[WatchService] Ready watching: ${folderPath}`);
    });

    // Error handler
    watcher.on("error", (error) => {
      console.error("[WatchService] Error:", error);
    });
  };

  const unwatch = () => {
    if (watcher) {
      watcher.close();
      watcher = null;
      watchedPath = null;
      console.log("[WatchService] Stopped watching");
    }
  };

  const isWatching = () => watcher !== null;

  const getWatchedPath = () => watchedPath;

  return {
    watch,
    unwatch,
    isWatching,
    getWatchedPath,
    on,
    off,
  };
};

export type WatchServiceFactory = typeof createWatchService;
