/**
 * Config.gs
 * Central configuration for the Bawmusic backend.
 * -----------------------------------------------------------------------
 * SETUP: Nothing to edit here for a basic setup — the spreadsheet bound
 * to this Apps Script project is used automatically. If you want to point
 * at a specific external spreadsheet instead, set SPREADSHEET_ID below.
 */

const CONFIG = {
  SPREADSHEET_ID: '', // leave blank to use the bound spreadsheet
  APP_NAME: 'Bawmusic',
  TOKEN_SECRET: 'bawmusic-secret-change-me', // change this before production use
  SESSION_HOURS: 24 * 7, // login session validity, in hours
};

/** Returns the active Spreadsheet (bound, or by SPREADSHEET_ID if set). */
function getSpreadsheet() {
  return CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

/** Sheet name -> column headers. Used to auto-create sheets on first run. */
const SCHEMA = {
  USERS: ['id', 'name', 'email', 'phone', 'role', 'password', 'status', 'created'],
  CUSTOMERS: ['id', 'name', 'phone', 'line', 'facebook', 'address', 'province', 'googleMaps', 'note', 'created'],
  JOBS: ['id', 'bookingDate', 'eventDate', 'startTime', 'endTime', 'customerId', 'customerName', 'venue', 'googleMaps', 'province', 'jobType', 'package', 'price', 'deposit', 'remaining', 'status', 'paymentStatus', 'memberList', 'equipmentList', 'remark', 'created'],
  MEMBERS: ['id', 'name', 'nickname', 'instrument', 'phone', 'salary', 'bank', 'account', 'status'],
  EQUIPMENT: ['id', 'name', 'category', 'qty', 'condition', 'storage', 'remark'],
  EXPENSES: ['id', 'jobId', 'date', 'category', 'desc', 'amount', 'remark'],
  PAYMENTS: ['id', 'jobId', 'date', 'amount', 'method', 'reference', 'remark'],
  SETTINGS: ['key', 'value'],
};
