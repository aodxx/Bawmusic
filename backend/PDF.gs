/**
 * PDF.gs
 * Generates simple PDF documents (quotation, receipt, invoice) for a job by
 * rendering HTML and converting it via a temporary Google Doc.
 * Returns a Drive file URL that the frontend can open/download.
 *
 * ⚠️ SETUP REQUIRED: this file uses the advanced "Drive API" service.
 * In the Apps Script editor: Services (+) → find "Drive API" → Add.
 * (This is separate from the built-in DriveApp, which can't import HTML.)
 */

function generateJobPdf(jobId, docType) {
  const job = dbGet('JOBS', jobId);
  if (!job) throw new Error('ไม่พบงาน: ' + jobId);
  const settings = dbGetSettings();

  const titleMap = {
    quotation: 'ใบเสนอราคา',
    receipt: 'ใบเสร็จรับเงิน',
    confirmation: 'ใบยืนยันการจอง',
    invoice: 'ใบแจ้งหนี้',
  };
  const title = titleMap[docType] || 'เอกสาร';

  const html = `
    <div style="font-family:sans-serif; padding:24px;">
      <h2 style="margin-bottom:0;">${settings.companyName || 'Bawmusic Band'}</h2>
      <p style="color:#666; margin-top:4px;">${settings.phone || ''} ${settings.line ? '· LINE: ' + settings.line : ''}</p>
      <hr>
      <h3>${title} — ${job.id}</h3>
      <table style="width:100%; font-size:14px; border-collapse:collapse;">
        <tr><td style="padding:4px 0;">ลูกค้า</td><td><b>${job.customerName}</b></td></tr>
        <tr><td style="padding:4px 0;">วันจัดงาน</td><td>${job.eventDate} (${job.startTime}-${job.endTime})</td></tr>
        <tr><td style="padding:4px 0;">สถานที่</td><td>${job.venue} (${job.province})</td></tr>
        <tr><td style="padding:4px 0;">ประเภทงาน</td><td>${job.jobType || '-'}</td></tr>
        <tr><td style="padding:4px 0;">ราคารวม</td><td>${Number(job.price).toLocaleString()} บาท</td></tr>
        <tr><td style="padding:4px 0;">มัดจำ</td><td>${Number(job.deposit).toLocaleString()} บาท</td></tr>
        <tr><td style="padding:4px 0;">คงเหลือ</td><td><b>${Number(job.remaining).toLocaleString()} บาท</b></td></tr>
      </table>
      <p style="margin-top:32px; color:#999; font-size:12px;">สร้างโดยระบบ Bawmusic — ${new Date().toLocaleDateString('th-TH')}</p>
    </div>
  `;

  // Apps Script cannot convert an HTML blob straight to PDF via blob.getAs().
  // The reliable path is: create a temporary Google Doc, inject the HTML as
  // its body, export that Doc as PDF, then clean up the temp Doc.
  const pdfBlob = htmlToPdfBlob(html, title + '-' + job.id);
  const folder = getOrCreatePdfFolder();
  const file = folder.createFile(pdfBlob).setName(title + '-' + job.id + '.pdf');
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { url: file.getUrl(), downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId() };
}

/**
 * Converts an HTML string to a PDF Blob by round-tripping through a
 * temporary Google Doc (Apps Script has no direct HTML->PDF blob converter).
 * The temp Doc is trashed immediately after the PDF is exported.
 */
function htmlToPdfBlob(html, docName) {
  // Google Docs can import HTML directly when created from an HTML blob
  // via the Drive API's "convert" option.
  const htmlBlob = Utilities.newBlob(html, 'text/html', docName + '.html');
  const resource = { title: docName, mimeType: MimeType.GOOGLE_DOCS };
  const tempDocFile = Drive.Files.insert(resource, htmlBlob, { convert: true });

  const pdfBlob = DriveApp.getFileById(tempDocFile.id).getAs('application/pdf').setName(docName + '.pdf');
  DriveApp.getFileById(tempDocFile.id).setTrashed(true); // clean up the temp Doc
  return pdfBlob;
}

function getOrCreatePdfFolder() {
  const name = 'Bawmusic PDFs';
  const folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}
