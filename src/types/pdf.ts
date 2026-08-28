export type ElementType = 'text' | 'image' | 'signature' | 'pencil';

export type FontFamily =
  | 'Helvetica'
  | 'Times-Roman'
  | 'Courier'
  | 'Roboto'
  | 'Montserrat'
  | 'Dancing Script';

export interface BaseElement {
  id: string;
  type: ElementType;
  pageIndex: number;
  x: number; // PDF points relative to page top-left
  y: number; // PDF points relative to page top-left
  width: number; // PDF points
  height: number; // PDF points
  rotation: number; // angle in degrees (0..360)
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number; // PDF points
  fontFamily: FontFamily;
  color: string; // Hex color e.g. "#000000"
  isBold?: boolean;
  isItalic?: boolean;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  imageDataUrl: string;
  imageType: 'png' | 'jpg';
}

export interface SignatureElement extends BaseElement {
  type: 'signature';
  imageDataUrl: string;
}

export interface PencilElement extends BaseElement {
  type: 'pencil';
  imageDataUrl: string;
  color: string;
  strokeWidth: number;
}

export type PdfElement = TextElement | ImageElement | SignatureElement | PencilElement;

export interface PageDimensions {
  width: number; // in PDF points
  height: number; // in PDF points
}

export type ActiveTool = 'select' | 'text' | 'image' | 'signature' | 'pencil';

export interface HistoryState {
  elements: PdfElement[];
}
