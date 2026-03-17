/// <reference types="vite/client" />

import type { PilesAPI } from "../shared/ipc";

declare global {
  interface Window {
    piles: PilesAPI;
  }
}

export {};
