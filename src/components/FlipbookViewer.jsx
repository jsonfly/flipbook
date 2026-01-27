import { useRef, useEffect } from 'react';
import styles from './FlipbookViewer.module.css';

/**
 * FlipbookViewer Component
 * Displays the PDF flipbook viewer in an iframe
 * 
 * @param {Object} props
 * @param {string} props.pdfUrl - Optional URL to a PDF file to load
 * @param {string} props.className - Optional additional CSS class
 */
function FlipbookViewer({ pdfUrl, className = '' }) {
  const iframeRef = useRef(null);

  // Build the iframe source URL with optional PDF parameter
  const getIframeSrc = () => {
    const basePath = '/flipbook/index.html';
    if (pdfUrl) {
      return `${basePath}?pdf=${encodeURIComponent(pdfUrl)}`;
    }
    return basePath;
  };

  // Handle iframe load event
  useEffect(() => {
    const iframe = iframeRef.current;
    
    const handleLoad = () => {
      // Iframe loaded successfully
      console.log('Flipbook viewer loaded');
    };

    iframe?.addEventListener('load', handleLoad);
    
    return () => {
      iframe?.removeEventListener('load', handleLoad);
    };
  }, []);

  return (
    <div className={`${styles.viewerContainer} ${className}`}>
      <iframe
        ref={iframeRef}
        src={getIframeSrc()}
        className={styles.viewerIframe}
        title="PDF Flipbook Viewer"
        allowFullScreen
      />
    </div>
  );
}

export default FlipbookViewer;
