import React, { useState, useRef } from 'react';
import { Upload, FileText, Sparkles } from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  onBytesSelect: (bytes: ArrayBuffer, fileName: string) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect, onBytesSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCreatingSample, setIsCreatingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      } else {
        alert('Format file tidak didukung. Silakan unggah file PDF.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleCreateSamplePdf = async () => {
    try {
      setIsCreatingSample(true);
      const pdfDoc = await PDFDocument.create();
      const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
      const page2 = pdfDoc.addPage([595.28, 841.89]);

      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Page 1 Content
      page1.drawText('PDF EDITOR DEMO DOCUMENT', {
        x: 50,
        y: 770,
        size: 24,
        font: fontBold,
        color: rgb(0.1, 0.2, 0.4),
      });

      page1.drawText('Halaman 1: Dokumen Sampel', {
        x: 50,
        y: 740,
        size: 14,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.5),
      });

      page1.drawRectangle({
        x: 50,
        y: 500,
        width: 495,
        height: 200,
        color: rgb(0.95, 0.96, 0.98),
        borderColor: rgb(0.8, 0.85, 0.9),
        borderWidth: 1,
      });

      page1.drawText('Gunakan toolbar di atas untuk menambahkan:', {
        x: 70,
        y: 660,
        size: 14,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.2),
      });

      page1.drawText('• Teks baru (pilih font, ukuran, warna, & gaya)', {
        x: 80,
        y: 630,
        size: 12,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.3),
      });

      page1.drawText('• Gambar JPG / PNG (bisa digeser, di-resize & diputar)', {
        x: 80,
        y: 605,
        size: 12,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.3),
      });

      page1.drawText('• Tanda tangan digital (lukis di canvas atau upload gambar)', {
        x: 80,
        y: 580,
        size: 12,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.3),
      });

      page1.drawText('Catatan: Hasil ekspor 100% diproses di client-side.', {
        x: 80,
        y: 535,
        size: 11,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.6),
      });

      // Page 2 Content
      page2.drawText('Halaman 2: Lembar Persetujuan & Tanda Tangan', {
        x: 50,
        y: 770,
        size: 18,
        font: fontBold,
        color: rgb(0.1, 0.2, 0.4),
      });

      page2.drawText('Silakan tambahkan tanda tangan Anda di kotak berikut:', {
        x: 50,
        y: 730,
        size: 12,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.4),
      });

      page2.drawRectangle({
        x: 50,
        y: 550,
        width: 250,
        height: 120,
        borderColor: rgb(0.7, 0.7, 0.8),
        borderWidth: 1,
      });

      page2.drawText('Area Tanda Tangan', {
        x: 120,
        y: 605,
        size: 12,
        font: fontRegular,
        color: rgb(0.6, 0.6, 0.7),
      });

      const pdfBytes = await pdfDoc.save();
      const buffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength
      ) as ArrayBuffer;

      onBytesSelect(buffer, 'Sample_PDF_Document.pdf');
    } catch (err) {
      console.error(err);
      alert('Gagal membuat dokumen sampel.');
    } finally {
      setIsCreatingSample(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4 text-slate-100">
      <div className="max-w-2xl w-full text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          <span>100% Client-Side PDF Editor</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          PDF Editor Modern & Cepat
        </h1>
        <p className="text-slate-400 text-lg">
          Tambah teks, gambar, dan tanda tangan digital langsung di browser Anda. Privasi aman tanpa unggah ke server.
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full max-w-xl p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 bg-slate-900/60 backdrop-blur-md shadow-2xl ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-102'
            : 'border-slate-700 hover:border-slate-500 hover:bg-slate-900/90'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          className="hidden"
        />

        <div className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center shadow-inner">
          <Upload className="w-8 h-8 animate-bounce" />
        </div>

        <div className="text-center">
          <p className="text-xl font-semibold text-white mb-1">
            Tarik & Lepaskan File PDF di Sini
          </p>
          <p className="text-sm text-slate-400">
            atau klik untuk memilih file dari perangkat Anda
          </p>
        </div>

        <div className="text-xs text-slate-500 pt-2 border-t border-slate-800/80 w-full text-center">
          Mendukung dokumen PDF multi-halaman
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <span className="text-slate-500 text-sm">Belum punya dokumen?</span>
        <button
          onClick={handleCreateSamplePdf}
          disabled={isCreatingSample}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors shadow-lg disabled:opacity-50"
        >
          <FileText className="w-4 h-4 text-blue-400" />
          <span>{isCreatingSample ? 'Membuat Sampel...' : 'Coba PDF Sampel'}</span>
        </button>
      </div>
    </div>
  );
};
