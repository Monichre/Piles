import type { FileMeta } from "../shared/types";

import {
  formatModifiedLabel,
  formatSelectionLabel,
  getItemBadgeLabel,
  getItemKindLabel,
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
    return null;
  }

  const isSingle = selectedItems.length === 1;
  const leadItem = selectedItems[0];
  const overflowItems = selectedItems.slice(0, 3);
  const remainingCount = selectedItems.length - overflowItems.length;

  return (
    <aside className="inspector-panel" aria-live="polite">
      <div className="inspector-panel__header">
        <p className="inspector-panel__eyebrow">Selection</p>
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
              ? getItemKindLabel(leadItem)
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
          Pile from selection
        </button>

        {isSingle ? (
          <>
            <button className="ws-btn" onClick={onOpen}>
              Open
            </button>
            <button className="ws-btn" onClick={onReveal}>
              Reveal
            </button>
            <button className="ws-btn" onClick={onRename}>
              Rename
            </button>
            <button className="ws-btn ws-btn--danger" onClick={onTrash}>
              Trash
            </button>
          </>
        ) : (
          <button className="ws-btn ws-btn--danger" onClick={onTrash}>
            Trash selected
          </button>
        )}
      </div>
    </aside>
  );
}
