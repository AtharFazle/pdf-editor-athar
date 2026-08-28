import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import type { PdfElement } from '../types/pdf';
import { domYToPdfY, domRotationToPdfDegrees, hexToRgbNormalized } from './coordinates';

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64Str = dataUrl.split(',')[1] || dataUrl;
  const binaryStr = atob(base64Str);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

export async function exportPdf(originalBytes: ArrayBuffer, elements: PdfElement[]): Promise<Uint8Array> {
  // Always create a fresh copy of the ArrayBuffer to avoid detached ArrayBuffer errors
  const freshBuffer = originalBytes.slice(0);
  const pdfDoc = await PDFDocument.load(freshBuffer);

  // Pre-embed standard PDF fonts
  const helvetica = {
    normal: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
  };

  const times = {
    normal: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    italic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
    boldItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
  };

  const courier = {
    normal: await pdfDoc.embedFont(StandardFonts.Courier),
    bold: await pdfDoc.embedFont(StandardFonts.CourierBold),
    italic: await pdfDoc.embedFont(StandardFonts.CourierOblique),
    boldItalic: await pdfDoc.embedFont(StandardFonts.CourierBoldOblique),
  };

  const fontFamiliesMap: Record<string, typeof helvetica> = {
    Helvetica: helvetica,
    'Times-Roman': times,
    Courier: courier,
    Roboto: helvetica,
    Montserrat: helvetica,
    'Dancing Script': times,
  };

  const pagesCount = pdfDoc.getPageCount();

  for (const element of elements) {
    if (element.pageIndex < 0 || element.pageIndex >= pagesCount) {
      continue;
    }

    const page = pdfDoc.getPage(element.pageIndex);
    const { height: pageHeight } = page.getSize();
    const pdfY = domYToPdfY(element.y, element.height, pageHeight);
    const rotDegrees = domRotationToPdfDegrees(element.rotation);

    if (element.type === 'text') {
      const familyFonts = fontFamiliesMap[element.fontFamily] || helvetica;
      let fontObj = familyFonts.normal;
      if (element.fontFamily === 'Dancing Script') {
        fontObj = familyFonts.italic;
      } else if (element.isBold && element.isItalic) {
        fontObj = familyFonts.boldItalic;
      } else if (element.isBold) {
        fontObj = familyFonts.bold;
      } else if (element.isItalic) {
        fontObj = familyFonts.italic;
      }

      const { r, g, b } = hexToRgbNormalized(element.color);

      // Handle multiline text
      const lines = element.content.split('\n');
      const lineHeight = element.fontSize * 1.2;

      for (let i = 0; i < lines.length; i++) {
        const lineText = lines[i];
        const linePdfY = pdfY + (lines.length - 1 - i) * lineHeight;

        page.drawText(lineText, {
          x: element.x,
          y: linePdfY,
          size: element.fontSize,
          font: fontObj,
          color: rgb(r, g, b),
          rotate: degrees(rotDegrees),
        });
      }
    } else if (element.type === 'image' || element.type === 'signature' || element.type === 'pencil') {
      try {
        const bytes = dataUrlToBytes(element.imageDataUrl);
        const isPng =
          element.imageDataUrl.includes('image/png') ||
          element.type === 'signature' ||
          element.type === 'pencil';

        const pdfImage = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

        page.drawImage(pdfImage, {
          x: element.x,
          y: pdfY,
          width: element.width,
          height: element.height,
          rotate: degrees(rotDegrees),
        });
      } catch (err) {
        console.error(`Failed to embed ${element.type} element into PDF:`, err);
      }
    }
  }

  return await pdfDoc.save();
}
