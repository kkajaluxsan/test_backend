import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';

export function buildPdfBuffer(
  title: string,
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(title, { underline: true });
    doc.moveDown();

    if (rows.length === 0) {
      doc.fontSize(12).text('No data available.');
    } else {
      for (const row of rows) {
        for (const [key, value] of Object.entries(row)) {
          doc.fontSize(10).text(`${key}: ${value ?? ''}`);
        }
        doc.moveDown(0.5);
      }
    }

    doc.end();
  });
}

export function buildCsvBuffer(rows: Record<string, unknown>[]): Buffer {
  if (rows.length === 0) {
    return Buffer.from('message\nNo data available\n');
  }

  const csv = stringify(rows, { header: true });
  return Buffer.from(csv);
}
