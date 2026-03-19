import type { Meta, StoryObj } from '@storybook/react-vite';

import { Canvas } from './Canvas';
import { buildLoadedStoryState, buildMockItems, buildMockWorkspace, primeStoryStore } from './storybook-fixtures';

const meta = {
  title: 'Components/Canvas',
  component: Canvas,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Canvas>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderCanvas(overrides?: Parameters<typeof primeStoryStore>[0]) {
  primeStoryStore(overrides);

  return (
    <div style={{ display: 'flex', height: 820 }}>
      <Canvas />
    </div>
  );
}

export const Board: Story = {
  render: () => renderCanvas(),
};

export const DenseBoard: Story = {
  render: () => {
    const items = buildMockItems();
    const extraItems = Array.from({ length: 8 }, (_, index) => ({
      id: `/Users/liamellis/Desktop/Piles/Creative References/note-${index + 1}.txt`,
      path: `/Users/liamellis/Desktop/Piles/Creative References/note-${index + 1}.txt`,
      name: `note-${index + 1}.txt`,
      extension: 'txt',
      isDirectory: false,
      kind: 'file' as const,
      createdAt: '2026-03-10T09:00:00.000Z',
      modifiedAt: '2026-03-19T09:00:00.000Z',
    }));

    const allItems = [...items, ...extraItems];
    const workspace = buildMockWorkspace(allItems);

    extraItems.forEach((item, index) => {
      workspace.itemLayouts[item.id] = {
        id: item.id,
        position: {
          x: 960 + (index % 3) * 132,
          y: 164 + Math.floor(index / 3) * 114,
        },
        groupId: null,
        zIndex: 10 + index,
      };
    });

    return renderCanvas({
      ...buildLoadedStoryState(),
      items: allItems,
      workspace,
    });
  },
};
