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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
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
        className="relative max-h-[95vh] max-w-[95vw] p-4"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-lg bg-cream-50 dark:bg-gray-800 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-gray-700 transition-all duration-200 shadow-lg"
          aria-label="Close image preview"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="absolute -top-12 right-14 p-2 rounded-lg bg-cream-50 dark:bg-gray-800 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-gray-700 transition-all duration-200 shadow-lg"
          aria-label="Download image"
          title="Download image"
        >
          <Download className="w-6 h-6" />
        </button>

        {/* Image */}
        <img
          src={imageUrl}
          alt="Enlarged view"
          className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain cursor-zoom-out"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
