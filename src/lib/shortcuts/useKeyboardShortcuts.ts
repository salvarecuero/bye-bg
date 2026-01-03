import { useEffect, useCallback, useRef } from 'react';
import { shortcuts } from './config';
import type { ShortcutId, AppState } from './types';

type ShortcutHandlers = Partial<Record<ShortcutId, () => void>>;

export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  appState: AppState,
  enabled: boolean = true
) {
  const handlersRef = useRef(handlers);
  const stateRef = useRef(appState);

  useEffect(() => {
    handlersRef.current = handlers;
    stateRef.current = appState;
  }, [handlers, appState]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if user is typing in an input field
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      // Handle meta key (Cmd on Mac, Ctrl on Windows/Linux)
      const metaMatch = shortcut.modifiers.meta
        ? event.metaKey || event.ctrlKey
        : !event.metaKey && !event.ctrlKey;

      const shiftMatch = shortcut.modifiers.shift ? event.shiftKey : !event.shiftKey;

      const altMatch = shortcut.modifiers.alt ? event.altKey : !event.altKey;

      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (metaMatch && shiftMatch && altMatch && keyMatch) {
        // Check if shortcut is enabled for current state
        if (!shortcut.enabledWhen(stateRef.current)) {
          return;
        }

        const handler = handlersRef.current[shortcut.id];
        if (handler) {
          event.preventDefault();
          event.stopPropagation();
          handler();

          // Announce action for screen readers
          announceAction(shortcut.description);
        }
        break;
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

function announceAction(message: string) {
  const announcer = document.getElementById('sr-announcer');
  if (announcer) {
    announcer.textContent = message;
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }
}
