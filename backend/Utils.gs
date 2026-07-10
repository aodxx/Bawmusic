/**
 * Utils.gs
 * Shared helper functions used across the backend.
 */

/** Builds a standard JSON success response. */
function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Builds a standard JSON error response. */
function jsonError(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: String(message) }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Generates a short sequential-looking ID, e.g. "JB-0007". */
function generateId(prefix, sheet) {
  const lastRow = sheet.getLastRow();
  const next = lastRow < 2 ? 1 : lastRow; // header row = row 1
  return prefix + '-' + String(next).padStart(4, '0');
}

const ID_PREFIX = {
  USERS: 'US', CUSTOMERS: 'CU', JOBS: 'JB', MEMBERS: 'ME',
  EQUIPMENT: 'EQ', EXPENSES: 'EX', PAYMENTS: 'PM',
};

/** Simple string hash for password storage (NOT cryptographically strong). */
function simpleHash(text) {
  return Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text + CONFIG.TOKEN_SECRET)
  );
}

/** Creates a session token embedding userId + expiry, signed with TOKEN_SECRET. */
function createToken(userId) {
  const expiry = Date.now() + CONFIG.SESSION_HOURS * 3600 * 1000;
  const payload = userId + '|' + expiry;
  const sig = Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload + CONFIG.TOKEN_SECRET)
  );
  return Utilities.base64EncodeWebSafe(payload) + '.' + sig;
}

/** Validates a session token; returns userId or null if invalid/expired. */
function verifyToken(token) {
  try {
    if (!token) return null;
    const [encPayload, sig] = token.split('.');
    const payload = Utilities.newBlob(Utilities.base64DecodeWebSafe(encPayload)).getDataAsString();
    const expectedSig = Utilities.base64Encode(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload + CONFIG.TOKEN_SECRET)
    );
    if (sig !== expectedSig) return null;
    const [userId, expiry] = payload.split('|');
    if (Number(expiry) < Date.now()) return null;
    return userId;
  } catch (e) {
    return null;
  }
}

/** Converts a full sheet's data range into an array of row objects keyed by header. */
function sheetToObjects(sheet) {
  const range = sheet.getDataRange().getValues();
  if (range.length < 2) return [];
  const headers = range[0];
  return range.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = normalizeCell(row[i]); });
      return obj;
    });
}

function normalizeCell(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v;
}

/** Finds the 1-indexed row number for a given id in a sheet (id must be column "id"). */
function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) return i + 1; // 1-indexed
  }
  return -1;
}

/** Logs an audit entry to a hidden "AUDIT_LOG" sheet (created on demand). */
function auditLog(action, detail) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('AUDIT_LOG');
    if (!sheet) {
      sheet = ss.insertSheet('AUDIT_LOG');
      sheet.appendRow(['timestamp', 'action', 'detail']);
      sheet.hideSheet();
    }
    sheet.appendRow([new Date(), action, JSON.stringify(detail)]);
  } catch (e) {
    // never let logging break the main request
  }
}
