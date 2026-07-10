/**
 * Database.gs
 * Handles Google Sheets auto-initialization and generic CRUD operations
 * that back the REST-style API (see API.gs).
 */

/** Ensures every sheet defined in SCHEMA exists with correct headers. Safe to re-run. */
function initDatabase() {
  const ss = getSpreadsheet();
  Object.keys(SCHEMA).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    const headers = SCHEMA[name];
    const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const hasHeaders = headers.every((h, i) => firstRow[i] === h);
    if (!hasHeaders) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4C6FFF').setFontColor('#FFFFFF');
    }
  });

  // Seed a default admin user if USERS is empty, so first login is always possible.
  const usersSheet = ss.getSheetByName('USERS');
  if (usersSheet.getLastRow() < 2) {
    usersSheet.appendRow(['US-0001', 'Admin', 'admin@bawmusic.local', '', 'admin', simpleHash('admin1234'), 'active', new Date()]);
  }

  // Seed default settings if empty.
  const settingsSheet = ss.getSheetByName('SETTINGS');
  if (settingsSheet.getLastRow() < 2) {
    settingsSheet.appendRow(['companyName', 'Bawmusic Band']);
    settingsSheet.appendRow(['phone', '']);
    settingsSheet.appendRow(['line', '']);
    settingsSheet.appendRow(['facebook', '']);
    settingsSheet.appendRow(['theme', 'light']);
  }

  return 'Database initialized: ' + Object.keys(SCHEMA).join(', ');
}

/** Returns all rows of a sheet as plain objects. */
function dbList(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('ไม่พบชีต: ' + sheetName);
  return sheetToObjects(sheet);
}

/** Returns one row by id. */
function dbGet(sheetName, id) {
  return dbList(sheetName).find(r => String(r.id) === String(id)) || null;
}

/** Inserts a new row; auto-generates id + created timestamp if applicable. */
function dbCreate(sheetName, record) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('ไม่พบชีต: ' + sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (!record.id && headers.includes('id')) {
    record.id = generateId(ID_PREFIX[sheetName] || 'ID', sheet);
  }
  if (headers.includes('created') && !record.created) {
    record.created = new Date();
  }
  // Auto-calc remaining for JOBS
  if (sheetName === 'JOBS') {
    record.remaining = Math.max(0, Number(record.price || 0) - Number(record.deposit || 0));
    record.bookingDate = record.bookingDate || new Date();
  }

  const row = headers.map(h => record[h] !== undefined ? record[h] : '');
  sheet.appendRow(row);
  auditLog('create', { sheet: sheetName, id: record.id });
  return record;
}

/** Updates an existing row by id (partial update — only provided fields change). */
function dbUpdate(sheetName, id, record) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('ไม่พบชีต: ' + sheetName);
  const rowIndex = findRowById(sheet, id);
  if (rowIndex === -1) throw new Error('ไม่พบข้อมูล id: ' + id);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existingValues = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const existing = {};
  headers.forEach((h, i) => existing[h] = existingValues[i]);

  const merged = Object.assign({}, existing, record, { id }); // id never changes

  if (sheetName === 'JOBS') {
    merged.remaining = Math.max(0, Number(merged.price || 0) - Number(merged.deposit || 0));
  }

  const newRow = headers.map(h => merged[h] !== undefined ? merged[h] : '');
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([newRow]);
  auditLog('update', { sheet: sheetName, id });
  return merged;
}

/** Deletes a row by id. */
function dbDelete(sheetName, id) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('ไม่พบชีต: ' + sheetName);
  const rowIndex = findRowById(sheet, id);
  if (rowIndex === -1) throw new Error('ไม่พบข้อมูล id: ' + id);
  sheet.deleteRow(rowIndex);
  auditLog('delete', { sheet: sheetName, id });
  return { id };
}

/** Reads all SETTINGS rows into a single key/value object. */
function dbGetSettings() {
  const rows = dbList('SETTINGS');
  const obj = {};
  rows.forEach(r => obj[r.key] = r.value);
  return obj;
}

/** Writes a key/value object back into the SETTINGS sheet (upsert per key). */
function dbSaveSettings(settingsObj) {
  const sheet = getSpreadsheet().getSheetByName('SETTINGS');
  const data = sheet.getDataRange().getValues();
  Object.keys(settingsObj).forEach(key => {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(settingsObj[key]);
        found = true;
        break;
      }
    }
    if (!found) sheet.appendRow([key, settingsObj[key]]);
  });
  return dbGetSettings();
}
