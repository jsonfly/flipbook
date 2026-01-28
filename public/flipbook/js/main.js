/**
 * PDF Flipbook Viewer
 * Uses PDF.js for rendering and Turn.js for page flip animations
 */

// PDF.js worker configuration
import * as pdfjsLib from 'https://mozilla.github.io/pdf.js/build/pdf.mjs';
if (pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs';
}

/**
 * FlipbookViewer Class
 * Manages PDF loading, rendering, and flipbook functionality
 */
class FlipbookViewer {
  constructor() {
    this.pdfDoc = null;
    this.totalPages = 0;
    this.currentPage = 1;
    this.pageWidth = 0;
    this.pageHeight = 0;
    this.isLoading = false;
    this.renderedPages = new Set();
    this.renderingPages = new Set(); // Track pages currently being rendered
    
    // DOM Elements
    this.flipbook = null;
    this.prevBtn = null;
    this.nextBtn = null;
    this.pageIndicator = null;
    this.loadingOverlay = null;
    this.fileInput = null;
    
    this.init();
  }

  /**
   * Initialize the viewer
   */
  init() {
    this.cacheDOM();
    this.bindEvents();
    this.calculateDimensions();
    
    // Load default PDF if specified
    const defaultPdf = this.getDefaultPdfUrl();
    if (defaultPdf) {
      this.loadPdf(defaultPdf);
    }
  }

  /**
   * Cache DOM elements
   */
  cacheDOM() {
    this.flipbook = document.getElementById('flipbook');
    this.prevBtn = document.getElementById('prev-btn');
    this.nextBtn = document.getElementById('next-btn');
    this.pageIndicator = document.getElementById('page-indicator');
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.fileInput = document.getElementById('pdf-input');
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Navigation buttons
    this.prevBtn?.addEventListener('click', () => this.previousPage());
    this.nextBtn?.addEventListener('click', () => this.nextPage());

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // File input
    this.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

    // Window resize
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * Get default PDF URL from data attribute or query param
   */
  getDefaultPdfUrl() {
    const container = document.querySelector('.viewer-container');
    const dataUrl = container?.dataset.pdfUrl;
    
    if (dataUrl) return dataUrl;

    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('pdf') || 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf';
  }

  /**
   * Calculate flipbook dimensions based on container size
   */
  calculateDimensions() {
    const wrapper = document.querySelector('.flipbook-wrapper');
    if (!wrapper) return { width: 400, height: 500 };

    const wrapperRect = wrapper.getBoundingClientRect();
    const availableWidth = wrapperRect.width - 40;
    const availableHeight = wrapperRect.height - 40;

    // For double-page spread, each page is half the width
    const aspectRatio = 8.5 / 11; // Standard letter size
    
    let pageHeight = availableHeight;
    let pageWidth = pageHeight * aspectRatio;

    // Check if double-page width exceeds available width
    if (pageWidth * 2 > availableWidth) {
      pageWidth = availableWidth / 2;
      pageHeight = pageWidth / aspectRatio;
    }

    this.pageWidth = Math.floor(pageWidth);
    this.pageHeight = Math.floor(pageHeight);

    return { width: this.pageWidth, height: this.pageHeight };
  }

  /**
   * Load PDF from URL or File
   */
  async loadPdf(source) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoading(true);

    try {
      // Destroy existing flipbook
      this.destroyFlipbook();

      // Load PDF document
      const loadingTask = pdfjsLib.getDocument(source);
      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;

      // Get first page to determine aspect ratio
      const firstPage = await this.pdfDoc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      const pdfAspectRatio = viewport.width / viewport.height;

      // Recalculate dimensions based on actual PDF aspect ratio
      this.calculateDimensionsForPdf(pdfAspectRatio);

      // Create flipbook pages
      await this.createFlipbookPages();

      // Initialize Turn.js
      this.initTurnJs();

      // Render visible pages
      await this.renderVisiblePages();

      this.updateControls();
      this.showLoading(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.showError('Failed to load PDF. Please try another file.');
      this.showLoading(false);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Calculate dimensions based on PDF aspect ratio
   */
  calculateDimensionsForPdf(aspectRatio) {
    const wrapper = document.querySelector('.flipbook-wrapper');
    if (!wrapper) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const availableWidth = wrapperRect.width - 60;
    const availableHeight = wrapperRect.height - 60;

    let pageHeight = availableHeight;
    let pageWidth = pageHeight * aspectRatio;

    if (pageWidth * 2 > availableWidth) {
      pageWidth = availableWidth / 2;
      pageHeight = pageWidth / aspectRatio;
    }

    this.pageWidth = Math.floor(pageWidth);
    this.pageHeight = Math.floor(pageHeight);
  }

  /**
   * Create empty page containers for the flipbook
   */
  async createFlipbookPages() {
    this.flipbook.innerHTML = '';
    this.renderedPages.clear();

    // Add pages (including potential empty page for even total)
    const pageCount = this.totalPages % 2 === 0 ? this.totalPages : this.totalPages + 1;

    for (let i = 1; i <= pageCount; i++) {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'page';
      pageDiv.dataset.pageNum = i;

      if (i <= this.totalPages) {
        const canvas = document.createElement('canvas');
        canvas.id = `page-canvas-${i}`;
        pageDiv.appendChild(canvas);
      }

      this.flipbook.appendChild(pageDiv);
    }
  }

  /**
   * Initialize Turn.js flipbook
   */
  initTurnJs() {
    const $flipbook = $(this.flipbook);

    $flipbook.turn({
      width: this.pageWidth * 2,
      height: this.pageHeight,
      autoCenter: true,
      display: 'double',
      acceleration: true,
      gradients: true,
      elevation: 50,
      when: {
        turning: (event, page) => {
          this.currentPage = page;
          this.updateControls();
        },
        turned: (event, page) => {
          this.currentPage = page;
          this.renderVisiblePages();
          this.updateControls();
        }
      }
    });

    // Set initial page
    this.currentPage = 1;
  }

  /**
   * Render pages that are currently visible or about to be visible
   */
  async renderVisiblePages() {
    const view = $(this.flipbook).turn('view');
    const pagesToRender = [];

    // Current visible pages
    view.forEach(pageNum => {
      if (pageNum > 0 && pageNum <= this.totalPages && 
          !this.renderedPages.has(pageNum) && 
          !this.renderingPages.has(pageNum)) {
        pagesToRender.push(pageNum);
      }
    });

    // Preload adjacent pages
    const adjacentPages = [
      view[0] - 1,
      view[0] - 2,
      view[view.length - 1] + 1,
      view[view.length - 1] + 2
    ];

    adjacentPages.forEach(pageNum => {
      if (pageNum > 0 && pageNum <= this.totalPages && 
          !this.renderedPages.has(pageNum) && 
          !this.renderingPages.has(pageNum)) {
        pagesToRender.push(pageNum);
      }
    });

    // Render all pages in parallel (now safe - each page renders only once)
    await Promise.all(pagesToRender.map(pageNum => this.renderPage(pageNum)));
  }

  /**
   * Render a single PDF page to canvas
   */
  async renderPage(pageNum) {
    // Skip if already rendered or currently being rendered
    if (this.renderedPages.has(pageNum) || 
        this.renderingPages.has(pageNum) || 
        pageNum > this.totalPages) {
      return;
    }

    // Mark as currently rendering
    this.renderingPages.add(pageNum);

    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const canvas = document.getElementById(`page-canvas-${pageNum}`);
      
      if (!canvas) {
        this.renderingPages.delete(pageNum);
        return;
      }

      const context = canvas.getContext('2d');
      
      // Calculate scale to fit page dimensions
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(
        this.pageWidth / viewport.width,
        this.pageHeight / viewport.height
      );
      
      const scaledViewport = page.getViewport({ scale: scale * 2 }); // 2x for retina

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = `${this.pageWidth}px`;
      canvas.style.height = `${this.pageHeight}px`;

      await page.render({
        canvasContext: context,
        viewport: scaledViewport
      }).promise;

      this.renderedPages.add(pageNum);
    } catch (error) {
      console.error(`Error rendering page ${pageNum}:`, error);
    } finally {
      // Always remove from renderingPages when done (success or error)
      this.renderingPages.delete(pageNum);
    }
  }

  /**
   * Navigate to previous page
   */
  previousPage() {
    if (this.currentPage <= 1) return;
    $(this.flipbook).turn('previous');
  }

  /**
   * Navigate to next page
   */
  nextPage() {
    const totalFlipbookPages = $(this.flipbook).turn('pages');
    if (this.currentPage >= totalFlipbookPages) return;
    $(this.flipbook).turn('next');
  }

  /**
   * Go to specific page
   */
  goToPage(pageNum) {
    if (pageNum < 1 || pageNum > this.totalPages) return;
    $(this.flipbook).turn('page', pageNum);
  }

  /**
   * Update navigation controls state
   */
  updateControls() {
    const totalFlipbookPages = $(this.flipbook).turn('pages');
    
    // Update button states
    if (this.prevBtn) {
      this.prevBtn.disabled = this.currentPage <= 1;
    }
    
    if (this.nextBtn) {
      this.nextBtn.disabled = this.currentPage >= totalFlipbookPages;
    }

    // Update page indicator
    if (this.pageIndicator) {
      const view = $(this.flipbook).turn('view');
      const displayPages = view.filter(p => p > 0 && p <= this.totalPages);
      
      if (displayPages.length === 2) {
        this.pageIndicator.innerHTML = `
          <span class="current">${displayPages[0]}-${displayPages[1]}</span> of ${this.totalPages}
        `;
      } else if (displayPages.length === 1) {
        this.pageIndicator.innerHTML = `
          <span class="current">${displayPages[0]}</span> of ${this.totalPages}
        `;
      }
    }
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyboard(e) {
    switch (e.key) {
      case 'ArrowLeft':
        this.previousPage();
        break;
      case 'ArrowRight':
        this.nextPage();
        break;
    }
  }

  /**
   * Handle file selection
   */
  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      const fileUrl = URL.createObjectURL(file);
      this.loadPdf(fileUrl);
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    if (!this.pdfDoc) return;

    // Debounce resize
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(async () => {
      // Get PDF aspect ratio
      const firstPage = await this.pdfDoc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      const aspectRatio = viewport.width / viewport.height;

      // Recalculate dimensions
      this.calculateDimensionsForPdf(aspectRatio);

      // Resize flipbook
      $(this.flipbook).turn('size', this.pageWidth * 2, this.pageHeight);

      // Re-render all visible pages
      this.renderedPages.clear();
      await this.renderVisiblePages();
    }, 250);
  }

  /**
   * Destroy existing flipbook
   */
  destroyFlipbook() {
    if ($(this.flipbook).turn('is')) {
      $(this.flipbook).turn('destroy');
    }
    this.flipbook.innerHTML = '';
    this.renderedPages.clear();
    this.renderingPages.clear();
  }

  /**
   * Show/hide loading overlay
   */
  showLoading(show) {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.toggle('hidden', !show);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    console.error(message);
    // Could implement a toast notification here
  }
}

// Initialize viewer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for jQuery and Turn.js to be available
  if (typeof $ !== 'undefined' && $.fn.turn) {
    new FlipbookViewer();
  } else {
    // Retry after a short delay
    setTimeout(() => {
      if (typeof $ !== 'undefined' && $.fn.turn) {
        new FlipbookViewer();
      } else {
        console.error('Required libraries (jQuery, Turn.js) not loaded');
      }
    }, 500);
  }
});
