import { BatchSidebar } from './BatchSidebar';
import { BatchMainContent } from './BatchMainContent';
import type { BatchItem } from '../../types/batch';

type Props = {
  items: BatchItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  isProcessing: boolean;
  completedCount: number;
  errorCount: number;
  onAddFiles: (files: File[]) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onStartProcessing: () => void;
  onStopProcessing: () => void;
  onDownloadItem: (item: BatchItem) => void;
  onDownloadAll: () => void;
  onDownloadZip: () => void;
  settingsDirty?: boolean;
  onRerun: () => void;
};

export function BatchLayout({
  items,
  selectedItemId,
  onSelectItem,
  isProcessing,
  completedCount,
  errorCount,
  onAddFiles,
  onRemoveItem,
  onClearAll,
  onStartProcessing,
  onStopProcessing,
  onDownloadItem,
  onDownloadAll,
  onDownloadZip,
  settingsDirty = false,
  onRerun
}: Props) {
  const selectedItem = selectedItemId ? (items.find(item => item.id === selectedItemId) ?? null) : null;

  // Clear selection if selected item was removed
  if (selectedItemId && !selectedItem) {
    onSelectItem(null);
  }

  return (
    <div className="flex flex-col xl:flex-row gap-4 min-h-[400px] lg:min-h-[450px] xl:h-[500px]">
      {/* Sidebar - horizontal strip on mobile, vertical on desktop */}
      <BatchSidebar
        items={items}
        selectedItemId={selectedItemId}
        isProcessing={isProcessing}
        onSelectItem={onSelectItem}
        onAddFiles={onAddFiles}
        onRemoveItem={onRemoveItem}
        onClearAll={onClearAll}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <BatchMainContent
          items={items}
          selectedItem={selectedItem}
          isProcessing={isProcessing}
          completedCount={completedCount}
          errorCount={errorCount}
          onStartProcessing={onStartProcessing}
          onStopProcessing={onStopProcessing}
          onDownloadItem={onDownloadItem}
          onDownloadAll={onDownloadAll}
          onDownloadZip={onDownloadZip}
          settingsDirty={settingsDirty}
          onRerun={onRerun}
        />
      </div>
    </div>
  );
}
