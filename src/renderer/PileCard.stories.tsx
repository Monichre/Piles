import type { Meta, StoryObj } from '@storybook/react';
import { PileCard } from './PileCard';
import type { FileMeta, GroupModel } from '../shared/types';

const meta = {
  title: 'Components/PileCard',
  component: PileCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onMove: { action: 'moved' },
    onResize: { action: 'resized' },
    onRename: { action: 'renamed' },
    onCollapse: { action: 'collapsed' },
    onDelete: { action: 'deleted' },
    onItemPointerDown: { action: 'item pointer down' },
    onItemDoubleClick: { action: 'item double clicked' },
    onItemReveal: { action: 'item revealed' },
    onItemRename: { action: 'item renamed' },
    onItemTrash: { action: 'item trashed' },
  },
} satisfies Meta<typeof PileCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockMembers: FileMeta[] = [
  {
    id: '1',
    path: '/foo.txt',
    name: 'foo.txt',
    extension: 'txt',
    isDirectory: false,
    kind: 'file',
    createdAt: null,
    modifiedAt: null,
  },
  {
    id: '2',
    path: '/bar.png',
    name: 'bar.png',
    extension: 'png',
    isDirectory: false,
    kind: 'file',
    createdAt: null,
    modifiedAt: null,
  },
  {
    id: '3',
    path: '/baz.md',
    name: 'baz.md',
    extension: 'md',
    isDirectory: false,
    kind: 'file',
    createdAt: null,
    modifiedAt: null,
  },
];

const mockGroup: GroupModel = {
  id: 'g1',
  name: 'Project Ideas',
  position: { x: 50, y: 50 },
  size: { width: 300, height: 250 },
  collapsed: false,
  itemIds: ['1', '2', '3'],
};

export const Default: Story = {
  args: {
    group: mockGroup,
    members: mockMembers,
    selectedItemIds: new Set<string>(),
    renameRequest: null,
    canvasEl: null,
    onMove: () => {},
    onResize: () => {},
    onRename: () => {},
    onCollapse: () => {},
    onDelete: () => {},
    onItemPointerDown: () => {},
    onItemDoubleClick: () => {},
    onItemReveal: () => {},
    onItemRename: async () => {},
    onItemTrash: () => {},
  },
};

export const Collapsed: Story = {
  args: {
    group: { ...mockGroup, collapsed: true },
    members: mockMembers,
    selectedItemIds: new Set<string>(),
    renameRequest: null,
    canvasEl: null,
    onMove: () => {},
    onResize: () => {},
    onRename: () => {},
    onCollapse: () => {},
    onDelete: () => {},
    onItemPointerDown: () => {},
    onItemDoubleClick: () => {},
    onItemReveal: () => {},
    onItemRename: async () => {},
    onItemTrash: () => {},
  },
};

export const Empty: Story = {
  args: {
    group: { ...mockGroup, name: 'Empty Pile', itemIds: [] },
    members: [],
    selectedItemIds: new Set<string>(),
    renameRequest: null,
    canvasEl: null,
    onMove: () => {},
    onResize: () => {},
    onRename: () => {},
    onCollapse: () => {},
    onDelete: () => {},
    onItemPointerDown: () => {},
    onItemDoubleClick: () => {},
    onItemReveal: () => {},
    onItemRename: async () => {},
    onItemTrash: () => {},
  },
};
