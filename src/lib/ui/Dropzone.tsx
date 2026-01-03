import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud } from 'react-icons/fi';
import clsx from 'clsx';

type Props = {
  onFile?: (file: File) => void;
  onFiles?: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  compact?: boolean;
};

export function Dropzone({ onFile, onFiles, multiple = false, disabled, compact }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length === 0) return;

      if (multiple && onFiles) {
        onFiles(accepted);
      } else if (onFile) {
        onFile(accepted[0]);
      }
    },
    [onFile, onFiles, multiple]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple,
    disabled,
    accept: {
      'image/*': []
    }
  });

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'glass border-dashed border-2 border-slate-700 rounded-2xl',
        'flex items-center justify-center text-slate-300 cursor-pointer',
        'transition-all duration-200 hover:border-accent hover:text-white hover:shadow-glow-sm',
        compact ? 'p-4' : 'p-6',
        disabled && 'opacity-60 cursor-not-allowed hover:shadow-none',
        isDragActive && 'border-accent text-white bg-accent/5 shadow-glow'
      )}
    >
      <input {...getInputProps()} />
      <div className="flex items-center gap-3">
        <FiUploadCloud
          className={clsx(
            'transition-transform duration-200',
            compact ? 'text-xl' : 'text-2xl',
            isDragActive && 'scale-110'
          )}
        />
        <div className="text-left">
          <div className={clsx('font-semibold', compact && 'text-sm')}>
            {multiple ? 'Drop or browse files' : 'Drop or browse'}
          </div>
          <div className={clsx('text-slate-400', compact ? 'text-xs' : 'text-sm')}>
            PNG, JPG, WebP — processed locally
          </div>
        </div>
      </div>
    </div>
  );
}
