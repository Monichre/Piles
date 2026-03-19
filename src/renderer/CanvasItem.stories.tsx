import type { Meta, StoryObj } from '@storybook/react-vite';

import { CanvasItem } from './CanvasItem';
import { buildMockItems } from './storybook-fixtures';

const [folderItem, fileItem] = buildMockItems();

const meta = {
  title: 'Components/CanvasItem',
  component: CanvasItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onPointerDown: { action: 'pointer down' },
    onDoubleClick: { action: 'double click' },
    onReveal: { action: 'reveal' },
    onRename: { action: 'rename' },
    onTrash: { action: 'trash' },
  },
  render: (args) => (
    <div style={{ position: 'relative', width: 156, height: 140 }}>
      <CanvasItem {...args} />
    </div>
  ),
} satisfies Meta<typeof CanvasItem>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseArgs = {
  position: { x: 20, y: 20 },
  zIndex: 1,
  selected: false,
  renameRequestToken: undefined,
  onPointerDown: () => undefined,
  onDoubleClick: () => undefined,
  onReveal: () => undefined,
  onRename: async () => undefined,
  onTrash: () => undefined,
};

export const FileCard: Story = {
  args: {
    ...baseArgs,
    item: fileItem,
  },
};

export const FolderCard: Story = {
  args: {
    ...baseArgs,
    item: folderItem,
  },
};

export const Selected: Story = {
  args: {
    ...baseArgs,
    item: fileItem,
    selected: true,
  },
};

export const Renaming: Story = {
  args: {
    ...baseArgs,
    item: fileItem,
    selected: true,
    renameRequestToken: 1,
  },
};
