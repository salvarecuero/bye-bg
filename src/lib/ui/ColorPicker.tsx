import { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Popover, Portal } from '@headlessui/react';
import clsx from 'clsx';
import { useRecentColors } from '../../hooks/useRecentColors';

const DEFAULT_PRESETS = ['#0f172a', '#0ea5e9', '#1e293b', '#f8fafc', '#ec4899'];

type Props = {
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
};

function ColorSwatch({
  color,
  selected,
  onClick,
  size = 'md'
}: {
  color: string;
  selected?: boolean;
  onClick: () => void;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-lg border-2 transition-all',
        size === 'sm' ? 'h-6 w-6' : 'h-8 w-8',
        selected
          ? 'border-accent ring-2 ring-accent/30'
          : 'border-slate-600 hover:border-slate-400'
      )}
      style={{ backgroundColor: color }}
      title={color.toUpperCase()}
    />
  );
}

export function ColorPicker({ value, onChange, presets = DEFAULT_PRESETS }: Props) {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { recentColors, addRecentColor } = useRecentColors();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleColorChange = (color: string) => {
    onChange(color);
    setInputValue(color);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Add # if missing
    if (newValue && !newValue.startsWith('#')) {
      newValue = '#' + newValue;
    }

    setInputValue(newValue);

    // Validate and apply if valid hex
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleInputBlur = () => {
    // Reset to current value if invalid
    if (!/^#[0-9A-Fa-f]{6}$/.test(inputValue)) {
      setInputValue(value);
    }
  };

  const handleSelectColor = (color: string, close: () => void) => {
    handleColorChange(color);
    addRecentColor(color);
    close();
  };

  const handlePickerClose = () => {
    addRecentColor(value);
  };

  // Filter recent colors to not show presets or current value
  const filteredRecent = recentColors.filter(
    c => !presets.includes(c.toLowerCase()) && c.toLowerCase() !== value.toLowerCase()
  );

  // Calculate position for portal-based popover
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0, width: 0 });

  const updatePanelPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  };

  return (
    <Popover className="relative">
      {({ close, open }) => (
        <>
          <Popover.Button
            ref={buttonRef}
            onClick={updatePanelPosition}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono">{value.toUpperCase()}</span>
              <span
                className="h-6 w-10 rounded border border-slate-600"
                style={{ backgroundColor: value }}
              />
            </div>
          </Popover.Button>

          {open && (
            <Portal>
              <Popover.Panel
                static
                className="fixed z-[100] rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-panel backdrop-blur-sm"
                style={{
                  top: panelPosition.top,
                  left: panelPosition.left,
                  width: panelPosition.width
                }}
                onBlur={handlePickerClose}
              >
                <div className="space-y-4">
                  {/* Color Picker */}
                  <div className="color-picker-wrapper">
                    <HexColorPicker
                      color={value}
                      onChange={handleColorChange}
                      style={{ width: '100%', height: '160px' }}
                    />
                  </div>

                  {/* Hex Input */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">Hex:</label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue.toUpperCase()}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      maxLength={7}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1.5 font-mono text-sm text-slate-200 focus:border-accent focus:outline-none"
                      placeholder="#000000"
                    />
                    <span
                      className="h-8 w-8 shrink-0 rounded-lg border border-slate-600"
                      style={{ backgroundColor: value }}
                    />
                  </div>

                  {/* Presets */}
                  <div>
                    <div className="mb-2 text-xs text-slate-400">Presets</div>
                    <div className="flex flex-wrap gap-2">
                      {presets.map(color => (
                        <ColorSwatch
                          key={color}
                          color={color}
                          selected={value.toLowerCase() === color.toLowerCase()}
                          onClick={() => handleSelectColor(color, close)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Recent Colors */}
                  {filteredRecent.length > 0 && (
                    <div>
                      <div className="mb-2 text-xs text-slate-400">Recent</div>
                      <div className="flex flex-wrap gap-2">
                        {filteredRecent.slice(0, 5).map(color => (
                          <ColorSwatch
                            key={color}
                            color={color}
                            size="sm"
                            selected={value.toLowerCase() === color.toLowerCase()}
                            onClick={() => handleSelectColor(color, close)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Popover.Panel>
            </Portal>
          )}
        </>
      )}
    </Popover>
  );
}
