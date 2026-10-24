// Minimal iCalendar (.ics) export/import for calendar events.
import { pad } from './date.js';
import { uid } from './util.js';

const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const unesc = (s) => String(s || '').replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

export function eventsToICS(events) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//vaa kannamma//EN', 'CALSCALE:GREGORIAN'];
  events.forEach((e) => {
    const d = e.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${e.id}@vaa-kannamma`, `DTSTAMP:${stamp}`);
    if (e.time) {
      lines.push(`DTSTART:${d}T${e.time.replace(':', '')}00`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${d}`);
    }
    lines.push(`SUMMARY:${esc(e.title)}`, `CATEGORIES:${e.type.toUpperCase()}`);
    const desc = [e.subject && `Subject: ${e.subject}`, e.topic && `Topic: ${e.topic}`, e.notes].filter(Boolean).join('\n');
    if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function icsToEvents(text) {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const blocks = unfolded.split(/BEGIN:VEVENT/).slice(1);
  if (!blocks.length) throw new Error('No events were found in that calendar file.');
  return blocks
    .map((b) => {
      const get = (name) => {
        const m = b.match(new RegExp(`^${name}(;[^:\\n]*)?:(.*)$`, 'mi'));
        return m ? m[2].trim() : '';
      };
      const start = get('DTSTART');
      const m = start.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?(Z)?/);
      if (!m) return null;
      let date = `${m[1]}-${m[2]}-${m[3]}`;
      let time = m[4] ? `${m[4]}:${m[5]}` : '';
      if (m[6] && m[4]) {
        const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
        date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      const cat = get('CATEGORIES').toLowerCase();
      const type = ['exam', 'assignment', 'personal', 'study'].find((t) => cat.includes(t)) || 'personal';
      const title = unesc(get('SUMMARY')) || 'Untitled event';
      return { id: uid('e'), type, title: title.slice(0, 200), subject: '', topic: '', date, time, notes: unesc(get('DESCRIPTION')).slice(0, 2000) };
    })
    .filter(Boolean);
}
