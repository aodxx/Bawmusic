/**
 * API.gs
 * Single entry point router. The frontend POSTs { action, token, ...payload }
 * and this file dispatches to the right handler, always returning JSON via
 * jsonOk()/jsonError() (see Utils.gs).
 *
 * Actions:
 *   auth.login          { email, password }
 *   auth.me             { token }
 *   sheet.list          { sheet }
 *   sheet.get           { sheet, id }
 *   sheet.create        { sheet, record }
 *   sheet.update        { sheet, id, record }
 *   sheet.delete        { sheet, id }
 *   dashboard.summary   {}
 *   settings.get        {}
 *   settings.save       { settings }
 *   report.monthly      { year }
 *   pdf.generate        { jobId, docType }
 *   calendar.sync       { jobId } | calendar.syncAll
 */

const WRITE_SHEETS = ['CUSTOMERS', 'JOBS', 'MEMBERS', 'EQUIPMENT', 'EXPENSES', 'PAYMENTS'];

function handleAction(action, p) {
  switch (action) {
    case 'auth.login':
      return authLogin(p.email, p.password);
    case 'auth.me':
      return authMe(p.token);

    case 'sheet.list':
      assertKnownSheet(p.sheet);
      return dbList(p.sheet);
    case 'sheet.get':
      assertKnownSheet(p.sheet);
      return dbGet(p.sheet, p.id);
    case 'sheet.create':
      assertKnownSheet(p.sheet);
      assertWritable(p.sheet);
      return dbCreate(p.sheet, p.record || {});
    case 'sheet.update':
      assertKnownSheet(p.sheet);
      assertWritable(p.sheet);
      return dbUpdate(p.sheet, p.id, p.record || {});
    case 'sheet.delete':
      assertKnownSheet(p.sheet);
      assertWritable(p.sheet);
      return dbDelete(p.sheet, p.id);

    case 'dashboard.summary':
      return buildDashboardSummary();

    case 'settings.get':
      return dbGetSettings();
    case 'settings.save':
      return dbSaveSettings(p.settings || {});

    case 'report.monthly':
      return buildMonthlyReport(p.year || new Date().getFullYear());

    case 'pdf.generate':
      return generateJobPdf(p.jobId, p.docType);

    case 'calendar.sync':
      return { eventId: calendarSyncJob(dbGet('JOBS', p.jobId)) };
    case 'calendar.syncAll':
      return { message: calendarSyncAll() };

    default:
      throw new Error('ไม่รู้จัก action: ' + action);
  }
}

function assertKnownSheet(name) {
  if (!SCHEMA[name]) throw new Error('ไม่รู้จักชีต: ' + name);
}
function assertWritable(name) {
  if (WRITE_SHEETS.indexOf(name) === -1) throw new Error('ไม่อนุญาตให้แก้ไขชีตนี้ผ่าน API: ' + name);
}

function buildDashboardSummary() {
  const jobs = dbList('JOBS');
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const upcoming = jobs.filter(j => j.eventDate >= today && j.status !== 'cancelled');
  const completed = jobs.filter(j => j.status === 'completed');
  return {
    todayJobs: jobs.filter(j => j.eventDate === today).length,
    upcomingJobs: upcoming.length,
    monthlyIncome: completed.reduce((s, j) => s + Number(j.price || 0), 0),
    pendingDeposit: jobs.filter(j => j.status === 'pending_deposit').length,
    pendingPayment: jobs.filter(j => Number(j.remaining) > 0 && j.status !== 'cancelled').length,
    recent: jobs.sort((a, b) => String(b.eventDate).localeCompare(String(a.eventDate))).slice(0, 5),
  };
}

function buildMonthlyReport(year) {
  const jobs = dbList('JOBS').filter(j => j.status === 'completed' && String(j.eventDate).startsWith(String(year)));
  const expenses = dbList('EXPENSES').filter(e => String(e.date).startsWith(String(year)));
  const byMonth = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
  jobs.forEach(j => { const m = new Date(j.eventDate).getMonth(); byMonth[m].income += Number(j.price || 0); });
  expenses.forEach(e => { const m = new Date(e.date).getMonth(); byMonth[m].expense += Number(e.amount || 0); });
  return { year, byMonth };
}
