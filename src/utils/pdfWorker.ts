import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker URL matching the installed version to ensure zero worker load errors in production/dev Vite
const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export { pdfjsLib };
