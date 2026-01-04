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
    <div className="w-full xl:w-72 flex flex-col rounded-2xl bg-[#0d1426] glass overflow-hidden">
      {/* Header - horizontal on mobile with inline controls */}
      <div className="p-2 xl:p-3 border-b border-slate-700/50 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-200 whitespace-nowrap">
          Queue ({items.length})
        </h3>
        <div className="flex items-center gap-2">
          {!isProcessing && items.length > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:text-slate-200 hover:bg-slate-700/50"
              title="Clear all items"
            >
              <FiTrash2 className="h-3 w-3" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
          {/* Mobile: inline add button */}
          <div className="xl:hidden">
            <Dropzone
              onFiles={onAddFiles}
              multiple
              disabled={isProcessing}
              compact
              minimal
            />
          </div>
        </div>
      </div>

      {/* Scrollable items list - horizontal on mobile, vertical on desktop */}
      <div className="flex-1 overflow-x-auto xl:overflow-x-hidden xl:overflow-y-auto p-2 min-h-0">
        <div className="flex xl:flex-col gap-2 xl:gap-1 xl:space-y-0">
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-16 xl:h-24 text-xs text-slate-500 whitespace-nowrap px-4">
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
      </div>

      {/* Add more files - desktop only (mobile has it in header) */}
      <div className="hidden xl:block p-2 border-t border-slate-700/50">
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
