/**
 * Calendar.gs
 * Syncs JOBS rows into the user's Google Calendar so gigs show up alongside
 * everything else. Safe to call repeatedly — it upserts by job id stored in
 * the event description tag [BAWMUSIC:<jobId>].
 */

function getBawmusicCalendar() {
  const CAL_NAME = 'Bawmusic — งานจอง';
  const cals = CalendarApp.getCalendarsByName(CAL_NAME);
  return cals.length ? cals[0] : CalendarApp.createCalendar(CAL_NAME);
}

function calendarSyncJob(job) {
  const cal = getBawmusicCalendar();
  const tag = '[BAWMUSIC:' + job.id + ']';
  const existing = cal.getEvents(new Date(2020, 0, 1), new Date(2035, 0, 1))
    .find(ev => ev.getDescription().indexOf(tag) !== -1);

  const start = new Date(job.eventDate + 'T' + (job.startTime || '19:00'));
  const end = new Date(job.eventDate + 'T' + (job.endTime || '22:00'));
  const title = '🎵 ' + (job.customerName || 'งานจอง') + ' — ' + (job.venue || '');
  const description = tag + '\n' +
    'ลูกค้า: ' + job.customerName + '\n' +
    'สถานที่: ' + job.venue + ' (' + job.province + ')\n' +
    'สถานะ: ' + job.status + '\n' +
    'ราคา: ' + job.price + ' บาท / มัดจำ: ' + job.deposit + ' บาท';

  if (existing) {
    existing.setTime(start, end);
    existing.setTitle(title);
    existing.setDescription(description);
    return existing.getId();
  } else {
    const ev = cal.createEvent(title, start, end, { description, location: job.venue });
    return ev.getId();
  }
}

function calendarRemoveJob(jobId) {
  const cal = getBawmusicCalendar();
  const tag = '[BAWMUSIC:' + jobId + ']';
  const events = cal.getEvents(new Date(2020, 0, 1), new Date(2035, 0, 1))
    .filter(ev => ev.getDescription().indexOf(tag) !== -1);
  events.forEach(ev => ev.deleteEvent());
}

/** Syncs every JOBS row to Calendar in one pass. Run manually or on a trigger. */
function calendarSyncAll() {
  const jobs = dbList('JOBS').filter(j => j.status !== 'cancelled' && j.eventDate);
  jobs.forEach(calendarSyncJob);
  return 'Synced ' + jobs.length + ' jobs to Google Calendar';
}
