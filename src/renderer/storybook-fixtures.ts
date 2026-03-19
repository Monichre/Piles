import type { PilesAPI } from '../shared/ipc';
import type { FileMeta, WorkspaceData } from '../shared/types';

import { getStore, type PilesState } from './store';

export const storyFolderPath = '/Users/liamellis/Desktop/Piles/Creative References';

function buildItem(overrides: Partial<FileMeta>): FileMeta {
  return {
    id: '/tmp/item',
    path: '/tmp/item',
    name: 'item',
    extension: null,
    isDirectory: false,
    kind: 'file',
    createdAt: '2026-03-01T12:00:00.000Z',
    modifiedAt: '2026-03-18T09:30:00.000Z',
    ...overrides,
  };
}

export function buildMockItems(): FileMeta[] {
  return [
    buildItem({
      id: `${storyFolderPath}/Creative References`,
      path: `${storyFolderPath}/Creative References`,
      name: 'Creative References',
      isDirectory: true,
      kind: 'folder',
      modifiedAt: '2026-03-17T14:20:00.000Z',
    }),
    buildItem({
      id: `${storyFolderPath}/roadmap.pdf`,
      path: `${storyFolderPath}/roadmap.pdf`,
      name: 'roadmap.pdf',
      extension: 'pdf',
      modifiedAt: '2026-03-19T09:30:00.000Z',
    }),
    buildItem({
      id: `${storyFolderPath}/poster.png`,
      path: `${storyFolderPath}/poster.png`,
      name: 'poster.png',
      extension: 'png',
      modifiedAt: '2026-03-18T18:45:00.000Z',
    }),
    buildItem({
      id: `${storyFolderPath}/launch-plan.md`,
      path: `${storyFolderPath}/launch-plan.md`,
      name: 'launch-plan.md',
      extension: 'md',
      modifiedAt: '2026-03-19T08:10:00.000Z',
    }),
    buildItem({
      id: `${storyFolderPath}/budget.xlsx`,
      path: `${storyFolderPath}/budget.xlsx`,
      name: 'budget.xlsx',
      extension: 'xlsx',
      modifiedAt: '2026-03-16T11:05:00.000Z',
    }),
    buildItem({
      id: `${storyFolderPath}/installer.dmg`,
      path: `${storyFolderPath}/installer.dmg`,
      name: 'installer.dmg',
      extension: 'dmg',
      modifiedAt: '2026-03-15T10:15:00.000Z',
    }),
  ];
}

export function buildEmptyWorkspace(): WorkspaceData {
  return {
    folderPath: storyFolderPath,
    groups: {},
    itemLayouts: {},
    settings: { snapToGrid: false },
  };
}

export function buildMockWorkspace(items = buildMockItems()): WorkspaceData {
  const moodboardGroupId = 'group-moodboard';

  return {
    folderPath: storyFolderPath,
    groups: {
      [moodboardGroupId]: {
        id: moodboardGroupId,
        name: 'Moodboard',
        position: { x: 560, y: 160 },
        size: { width: 300, height: 228 },
        collapsed: false,
        itemIds: [items[2].id, items[3].id],
      },
    },
    itemLayouts: {
      [items[0].id]: {
        id: items[0].id,
        position: { x: 148, y: 188 },
        groupId: null,
        zIndex: 1,
      },
      [items[1].id]: {
        id: items[1].id,
        position: { x: 280, y: 164 },
        groupId: null,
        zIndex: 2,
      },
      [items[2].id]: {
        id: items[2].id,
        position: { x: 0, y: 0 },
        groupId: moodboardGroupId,
        zIndex: 3,
      },
      [items[3].id]: {
        id: items[3].id,
        position: { x: 0, y: 0 },
        groupId: moodboardGroupId,
        zIndex: 4,
      },
      [items[4].id]: {
        id: items[4].id,
        position: { x: 230, y: 324 },
        groupId: null,
        zIndex: 5,
      },
      [items[5].id]: {
        id: items[5].id,
        position: { x: 420, y: 380 },
        groupId: null,
        zIndex: 6,
      },
    },
    settings: { snapToGrid: false },
  };
}

export function buildLoadedStoryState(): Pick<
  PilesState,
  'folderPath' | 'items' | 'workspace' | 'status' | 'error'
> {
  const items = buildMockItems();

  return {
    folderPath: storyFolderPath,
    items,
    workspace: buildMockWorkspace(items),
    status: 'loaded',
    error: null,
  };
}

const storyApi: PilesAPI = {
  selectFolder: async () => storyFolderPath,
  getFolderItems: async () => buildMockItems(),
  loadWorkspace: async () => buildMockWorkspace(),
  saveWorkspace: async () => undefined,
  openFile: async () => undefined,
  revealInFinder: async () => undefined,
  renameFile: async (path, newName) => {
    const nextPath = path.replace(/[^/]+$/, newName);
    return { newPath: nextPath };
  },
  trashFile: async () => undefined,
  watchFolder: async () => undefined,
  unwatchFolder: async () => undefined,
  onFolderChanged: () => () => undefined,
};

export function primeStoryStore(
  overrides: Partial<Pick<PilesState, 'folderPath' | 'items' | 'workspace' | 'status' | 'error'>> = {}
) {
  window.piles = storyApi;

  const store = getStore();
  store.setState({
    ...buildLoadedStoryState(),
    ...overrides,
  });

  return store;
}
