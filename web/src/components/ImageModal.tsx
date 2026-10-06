import { X, Download } from 'lucide-react';
import { useRef } from 'react';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useModalAccessibility({
    isOpen: true,
    onClose,
    dialogRef,
    initialFocusRef: closeButtonRef,
  });

  const handleDownload = () => {
    // Create a temporary link and click it to download
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `chamorro-image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm motion-safe:animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      {/* Modal Content */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Image preview"
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-w-full flex-col gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-none items-center justify-end gap-2">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="order-last flex h-11 w-11 items-center justify-center rounded-lg bg-cream-50 dark:bg-gray-800 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close image preview"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-cream-50 dark:bg-gray-800 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Download image"
            title="Download image"
          >
            <Download className="w-6 h-6" />
          </button>
        </div>

        {/* Image */}
        <img
          src={imageUrl}
          alt="Enlarged view"
          className="min-h-0 max-w-full max-h-[calc(100dvh-5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] rounded-lg shadow-2xl object-contain cursor-zoom-out"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
