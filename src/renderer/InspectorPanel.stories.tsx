import type { Meta, StoryObj } from '@storybook/react-vite';

import { InspectorPanel } from './InspectorPanel';
import { buildMockItems } from './storybook-fixtures';

const items = buildMockItems();

const meta = {
  title: 'Components/InspectorPanel',
  component: InspectorPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onCreatePile: { action: 'create pile' },
    onOpen: { action: 'open' },
    onReveal: { action: 'reveal' },
    onRename: { action: 'rename' },
    onTrash: { action: 'trash' },
  },
  render: (args) => (
    <div style={{ width: 340 }}>
      <InspectorPanel {...args} />
    </div>
  ),
} satisfies Meta<typeof InspectorPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseArgs = {
  onCreatePile: () => undefined,
  onOpen: () => undefined,
  onReveal: () => undefined,
  onRename: () => undefined,
  onTrash: () => undefined,
};

export const SingleSelection: Story = {
  args: {
    ...baseArgs,
    selectedItems: [items[1]],
  },
};

export const MultiSelection: Story = {
  args: {
    ...baseArgs,
    selectedItems: [items[1], items[2], items[3], items[4]],
  },
};
