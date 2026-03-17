import { contextBridge, ipcRenderer } from "electron";

import { createPreloadPilesApi } from "../shared/ipc";

contextBridge.exposeInMainWorld("piles", createPreloadPilesApi(ipcRenderer));
