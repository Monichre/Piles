import type { FileMeta } from "../shared/types";
import {
  ExternalLink,
  FolderOpen,
  Layers,
  MousePointerClick,
  Pencil,
  SquareDashedMousePointer,
  Trash2,
} from "lucide-react";

import {
  formatModifiedLabel,
  formatSelectionLabel,
  getItemBadgeLabel,
  getItemCategoryLabel,
} from "./presentation";

export interface InspectorPanelProps {
  selectedItems: FileMeta[];
  onCreatePile: () => void;
  onOpen: () => void;
  onReveal: () => void;
  onRename: () => void;
  onTrash: () => void;
}

export function InspectorPanel({
  selectedItems,
  onCreatePile,
  onOpen,
  onReveal,
  onRename,
  onTrash,
}: InspectorPanelProps) {
  if (selectedItems.length === 0) {
    return (
      <aside
        className="inspector-panel"
        aria-live="polite"
        aria-label="Board guidance"
      >
        <div className="inspector-panel__header">
          <p className="eyebrow">Board guide</p>
          <h2>Nothing selected</h2>
          <p className="inspector-panel__lede">
            Click a card to inspect it, or drag across the board to collect a
            loose set into one working selection.
          </p>
        </div>

        <div className="inspector-panel__list-block">
          <p className="inspector-panel__list-label">Quick moves</p>
          <ul className="inspector-panel__shortcut-list">
            <li>
              <div className="inspector-panel__shortcut-row">
                <SquareDashedMousePointer
                  size={15}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <strong>Drag on empty board</strong>
              </div>
              <span>Start a marquee selection.</span>
            </li>
            <li>
              <div className="inspector-panel__shortcut-row">
                <MousePointerClick
                  size={15}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <strong>Shift-click cards</strong>
              </div>
              <span>Build a selection without losing your place.</span>
            </li>
            <li>
              <div className="inspector-panel__shortcut-row">
                <Layers size={15} strokeWidth={1.75} aria-hidden="true" />
                <strong>Pile from selection</strong>
              </div>
              <span>Turn scattered references into a virtual stack.</span>
            </li>
          </ul>
        </div>
      </aside>
    );
  }

  const isSingle = selectedItems.length === 1;
  const leadItem = selectedItems[0];
  const overflowItems = selectedItems.slice(0, 3);
  const remainingCount = selectedItems.length - overflowItems.length;

  return (
    <aside className="inspector-panel" aria-live="polite">
      <div className="inspector-panel__header">
        <p className="eyebrow">Selection</p>
        <h2>{formatSelectionLabel(selectedItems.length)}</h2>
        <p className="inspector-panel__lede">
          {isSingle
            ? "Quick actions stay in reach while you move things around."
            : "Turn the loose set into a pile or review the cards you have in play."}
        </p>
      </div>

      <div className="inspector-panel__hero">
        <span className="inspector-panel__badge">
          {isSingle ? getItemBadgeLabel(leadItem) : selectedItems.length}
        </span>
        <div className="inspector-panel__hero-copy">
          <strong>{isSingle ? leadItem.name : "Loose collection"}</strong>
          <span>
            {isSingle
              ? getItemCategoryLabel(leadItem)
              : `${selectedItems.length} cards across the studio board`}
          </span>
          <span>
            {isSingle
              ? formatModifiedLabel(leadItem.modifiedAt)
              : "Use piles to turn scattered exploration into deliberate stacks."}
          </span>
        </div>
      </div>

      {!isSingle && (
        <div className="inspector-panel__list-block">
          <p className="inspector-panel__list-label">In this selection</p>
          <ul className="inspector-panel__list">
            {overflowItems.map((item) => (
              <li key={item.id}>
                <span>{item.name}</span>
                <span>{getItemBadgeLabel(item)}</span>
              </li>
            ))}
          </ul>
          {remainingCount > 0 && (
            <p className="inspector-panel__overflow">
              +{remainingCount} more waiting in the same selection
            </p>
          )}
        </div>
      )}

      <div className="inspector-panel__actions">
        <button className="ws-btn ws-btn--primary" onClick={onCreatePile}>
          <Layers size={15} strokeWidth={2} aria-hidden="true" />
          Pile from selection
        </button>

        {isSingle ? (
          <>
            <button className="ws-btn" onClick={onOpen}>
              <ExternalLink size={15} strokeWidth={2} aria-hidden="true" />
              Open
            </button>
            <button className="ws-btn" onClick={onReveal}>
              <FolderOpen size={15} strokeWidth={2} aria-hidden="true" />
              Reveal
            </button>
            <button className="ws-btn" onClick={onRename}>
              <Pencil size={15} strokeWidth={2} aria-hidden="true" />
              Rename
            </button>
            <button className="ws-btn ws-btn--danger" onClick={onTrash}>
              <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
              Trash
            </button>
          </>
        ) : (
          <button className="ws-btn ws-btn--danger" onClick={onTrash}>
            <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
            Trash selected
          </button>
        )}
      </div>
    </aside>
  );
}
