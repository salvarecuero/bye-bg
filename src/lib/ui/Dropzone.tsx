import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud } from 'react-icons/fi';
import clsx from 'clsx';

type Props = {
  onFile: (file: File) => void;
  disabled?: boolean;
};

export function Dropzone({ onFile, disabled }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
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
        'p-6 flex items-center justify-center text-slate-300 cursor-pointer',
        'transition-all duration-200 hover:border-accent hover:text-white hover:shadow-glow-sm',
        disabled && 'opacity-60 cursor-not-allowed hover:shadow-none',
        isDragActive && 'border-accent text-white bg-accent/5 shadow-glow'
      )}
    >
      <input {...getInputProps()} />
      <div className="flex items-center gap-3">
        <FiUploadCloud className={clsx(
          'text-2xl transition-transform duration-200',
          isDragActive && 'scale-110'
        )} />
        <div className="text-left">
          <div className="font-semibold">Drop or browse</div>
          <div className="text-sm text-slate-400">
            PNG, JPG, WebP — processed locally
          </div>
        </div>
      </div>
    </div>
  );
}

