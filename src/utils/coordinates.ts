/**
 * Converts top-left PDF point coordinates to pdf-lib bottom-left Y coordinate.
 * @param domY Y coordinate in PDF points from top-left
 * @param elementHeight Element height in PDF points
 * @param pageHeight Total PDF page height in PDF points
 */
export function domYToPdfY(domY: number, elementHeight: number, pageHeight: number): number {
  return pageHeight - domY - elementHeight;
}

/**
 * Converts degrees (0..360) clockwise (DOM orientation) to pdf-lib rotation angle.
 */
export function domRotationToPdfDegrees(rotation: number): number {
  // pdf-lib rotation is counter-clockwise for positive degrees or uses degrees(-rotation)
  return -rotation;
}

/**
 * Parses Hex color (e.g. #ff0000 or #f00) to RGB floats (0.0 to 1.0) for pdf-lib rgb()
 */
export function hexToRgbNormalized(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}
