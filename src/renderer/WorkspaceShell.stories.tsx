import type { Meta, StoryObj } from '@storybook/react-vite';

import { WorkspaceShell } from './WorkspaceShell';
import { buildEmptyWorkspace, buildLoadedStoryState, storyFolderPath, primeStoryStore } from './storybook-fixtures';

const meta = {
  title: 'Components/WorkspaceShell',
  component: WorkspaceShell,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WorkspaceShell>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderShell(overrides?: Parameters<typeof primeStoryStore>[0]) {
  primeStoryStore(overrides);
  return <WorkspaceShell />;
}

export const Idle: Story = {
  render: () =>
    renderShell({
      folderPath: null,
      items: [],
      workspace: null,
      status: 'idle',
      error: null,
    }),
};

export const Loading: Story = {
  render: () =>
    renderShell({
      folderPath: storyFolderPath,
      items: [],
      workspace: buildEmptyWorkspace(),
      status: 'loading',
      error: null,
    }),
};

export const ErrorState: Story = {
  render: () =>
    renderShell({
      folderPath: storyFolderPath,
      items: [],
      workspace: null,
      status: 'error',
      error: 'Finder could not read the folder. Try another directory.',
    }),
};

export const EmptyFolder: Story = {
  render: () =>
    renderShell({
      folderPath: storyFolderPath,
      items: [],
      workspace: buildEmptyWorkspace(),
      status: 'loaded',
      error: null,
    }),
};

export const LoadedBoard: Story = {
  render: () => renderShell(buildLoadedStoryState()),
};
