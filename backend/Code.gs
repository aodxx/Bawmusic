/**
 * Code.gs
 * Entry points for the Google Apps Script Web App deployment, plus a
 * convenience menu for first-time setup when opening the bound spreadsheet.
 */

/** Handles all POST requests from the frontend (BawmusicAPI.call). */
function doPost(e) {
  try {
    initDatabase(); // idempotent — ensures sheets exist before every request
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;
    if (!action) return jsonError('ไม่พบ action ในคำขอ');
    const result = handleAction(action, body);
    return jsonOk(result);
  } catch (err) {
    return jsonError(err.message || String(err));
  }
}

/** GET is used only for a simple health check / manual browser test. */
function doGet(e) {
  try {
    initDatabase();
    if (e.parameter.action) {
      const result = handleAction(e.parameter.action, e.parameter);
      return jsonOk(result);
    }
    return ContentService.createTextOutput('Bawmusic API is running ✅').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return jsonError(err.message || String(err));
  }
}

/** Adds a "Bawmusic" menu to the spreadsheet UI for one-click setup tasks. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎵 Bawmusic')
    .addItem('เริ่มต้นระบบ (สร้างชีตทั้งหมด)', 'initDatabase')
    .addItem('ตั้งเวลาแจ้งเตือนรายวัน', 'setupDailyTrigger')
    .addItem('ซิงค์งานทั้งหมดไป Google Calendar', 'calendarSyncAll')
    .addToUi();
}
