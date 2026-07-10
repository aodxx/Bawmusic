/**
 * Notification.gs
 * Sends reminder emails for upcoming jobs, pending deposits, and pending
 * payments. Intended to run on a daily time-driven trigger (see
 * setupDailyTrigger() below — run it once from the Apps Script editor).
 */

const REMINDER_DAYS_BEFORE = [7, 3, 1];

function setupDailyTrigger() {
  // Remove existing triggers for this function to avoid duplicates.
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'runDailyNotifications')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('runDailyNotifications')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  return 'Daily reminder trigger created (runs ~08:00 every day).';
}

function runDailyNotifications() {
  const settings = dbGetSettings();
  const jobs = dbList('JOBS').filter(j => j.status !== 'cancelled');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toEmail = settings.notifyEmail || Session.getEffectiveUser().getEmail();
  const lines = [];

  jobs.forEach(job => {
    const eventDate = new Date(job.eventDate);
    eventDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((eventDate - today) / (1000 * 60 * 60 * 24));

    if (REMINDER_DAYS_BEFORE.includes(diffDays)) {
      lines.push('📅 อีก ' + diffDays + ' วัน: งาน "' + job.customerName + '" ที่ ' + job.venue + ' (' + job.eventDate + ')');
    }
    if (job.status === 'pending_deposit') {
      lines.push('💰 รอมัดจำ: งาน "' + job.customerName + '" (' + job.eventDate + ')');
    }
    if (Number(job.remaining) > 0 && eventDate < today) {
      lines.push('⚠️ ค้างชำระ: งาน "' + job.customerName + '" ยอดคงเหลือ ' + job.remaining + ' บาท');
    }
  });

  if (lines.length && toEmail) {
    MailApp.sendEmail({
      to: toEmail,
      subject: '🎵 Bawmusic — สรุปการแจ้งเตือนวันนี้',
      body: lines.join('\n\n'),
    });
  }
  return 'Checked ' + jobs.length + ' jobs, sent ' + lines.length + ' reminder line(s).';
}
