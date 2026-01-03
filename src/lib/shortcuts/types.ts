export type ShortcutId = 'download' | 'copy' | 'reset' | 'reprocess' | 'upload' | 'help';

export type AppState = {
  processing: boolean;
  hasOutput: boolean;
  hasInput: boolean;
  hasCachedImage: boolean;
};

export type ShortcutConfig = {
  id: ShortcutId;
  key: string;
  modifiers: {
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
  label: string;
  shortLabel: string;
  description: string;
  enabledWhen: (state: AppState) => boolean;
};
