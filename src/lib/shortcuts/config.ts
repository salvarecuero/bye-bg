import type { ShortcutConfig } from './types';

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl';

export const shortcuts: ShortcutConfig[] = [
  {
    id: 'download',
    key: 's',
    modifiers: { meta: true },
    label: 'Download',
    shortLabel: `${modKey}+S`,
    description: 'Download the processed image',
    enabledWhen: s => !s.processing && s.hasOutput
  },
  {
    id: 'copy',
    key: 'c',
    modifiers: { meta: true, shift: true },
    label: 'Copy to Clipboard',
    shortLabel: `${modKey}+Shift+C`,
    description: 'Copy result image to clipboard',
    enabledWhen: s => !s.processing && s.hasOutput
  },
  {
    id: 'reset',
    key: 'Escape',
    modifiers: {},
    label: 'Reset',
    shortLabel: 'Esc',
    description: 'Clear current image and reset',
    enabledWhen: s => !s.processing && (s.hasInput || s.hasOutput)
  },
  {
    id: 'reprocess',
    key: 'Enter',
    modifiers: { meta: true },
    label: 'Reprocess',
    shortLabel: `${modKey}+Enter`,
    description: 'Reprocess the current image with new settings',
    enabledWhen: s => !s.processing && s.hasCachedImage && s.hasOutput
  },
  {
    id: 'upload',
    key: 'o',
    modifiers: { meta: true },
    label: 'Upload Image',
    shortLabel: `${modKey}+O`,
    description: 'Open file picker to upload a new image',
    enabledWhen: s => !s.processing
  },
  {
    id: 'help',
    key: '?',
    modifiers: { shift: true },
    label: 'Keyboard Shortcuts',
    shortLabel: '?',
    description: 'Show keyboard shortcuts help',
    enabledWhen: () => true
  }
];

export function getShortcutLabel(id: string): string {
  const shortcut = shortcuts.find(s => s.id === id);
  return shortcut?.shortLabel ?? '';
}
