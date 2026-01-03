import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FiX } from 'react-icons/fi';
import { shortcuts } from '../shortcuts';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function ShortcutsPanel({ isOpen, onClose }: Props) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="glass w-full max-w-md rounded-2xl p-6 shadow-panel">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-white">
                    Keyboard Shortcuts
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                <ul className="space-y-2">
                  {shortcuts.map(shortcut => (
                    <li
                      key={shortcut.id}
                      className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0"
                    >
                      <div>
                        <div className="text-sm text-slate-200">{shortcut.label}</div>
                        <div className="text-xs text-slate-400">{shortcut.description}</div>
                      </div>
                      <kbd className="rounded-lg bg-slate-800 px-2.5 py-1.5 font-mono text-xs text-slate-200 border border-slate-700">
                        {shortcut.shortLabel}
                      </kbd>
                    </li>
                  ))}
                </ul>

                <p className="mt-4 text-xs text-slate-400 text-center">
                  Press <kbd className="rounded bg-slate-700 px-1.5 py-0.5 font-mono">?</kbd> to
                  toggle this panel
                </p>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
