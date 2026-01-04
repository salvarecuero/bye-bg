import { FiTrash2, FiPlus } from 'react-icons/fi';
import { BatchSidebarItem } from './BatchSidebarItem';
import { Dropzone } from './Dropzone';
import type { BatchItem } from '../../types/batch';

type Props = {
  items: BatchItem[];
  selectedItemId: string | null;
  isProcessing: boolean;
  onSelectItem: (id: string | null) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
};

export function BatchSidebar({
  items,
  selectedItemId,
  isProcessing,
  onSelectItem,
  onAddFiles,
  onRemoveItem,
  onClearAll,
}: Props) {
  const handleRemoveItem = (id: string) => {
    // If removing the selected item, clear selection
    if (id === selectedItemId) {
      onSelectItem(null);
    }
    onRemoveItem(id);
  };

  return (
    <div className="w-72 flex flex-col rounded-2xl bg-[#0d1426] glass overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">
          Batch Queue ({items.length})
        </h3>
        {!isProcessing && items.length > 0 && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:text-slate-200 hover:bg-slate-700/50"
            title="Clear all items"
          >
            <FiTrash2 className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Scrollable items list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-slate-500">
            No images in queue
          </div>
        ) : (
          items.map((item) => (
            <BatchSidebarItem
              key={item.id}
              item={item}
              isSelected={item.id === selectedItemId}
              onClick={() => onSelectItem(item.id)}
              onRemove={() => handleRemoveItem(item.id)}
            />
          ))
        )}
      </div>

      {/* Add more files */}
      <div className="p-2 border-t border-slate-700/50">
        <Dropzone
          onFiles={onAddFiles}
          multiple
          disabled={isProcessing}
          compact
        />
      </div>
    </div>
  );
}
