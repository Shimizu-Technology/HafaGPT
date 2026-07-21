import { X, Download } from 'lucide-react';
import { useEffect } from 'react';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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
    >
      {/* Modal Content */}
      <div className="relative max-w-[95vw] max-h-[95vh] p-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-lg bg-cream-50 dark:bg-gray-800 text-brown-700 dark:text-gray-300 hover:bg-cream-200 dark:hover:bg-gray-700 transition-all duration-200 shadow-lg"
          aria-label="Close"
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

