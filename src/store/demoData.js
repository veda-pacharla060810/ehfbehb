// Showcase dataset. Generated relative to today so the demo always looks current,
// using a fixed seed so every reset produces the same sample records.
import { addDays, startOfDay, startOfWeek, toKey } from '../lib/date.js';
import { mulberry32 } from '../lib/util.js';
import { normalizeData } from './schema.js';

export function generateDemoData(weekStart = 1) {
  const rnd = mulberry32(108);
  const today = startOfDay(new Date());
  const day = (n) => toKey(addDays(today, n));
  const at = (n, h, m = 0) => {
    const d = addDays(today, n);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };

  const categories = [
    { id: 'd-cat-study', name: 'Studies', color: 'rose' },
    { id: 'd-cat-proj', name: 'Projects', color: 'mauve' },
    { id: 'd-cat-home', name: 'Personal', color: 'sage' },
    { id: 'd-cat-well', name: 'Wellbeing', color: 'peach' },
  ];

  const T = (id, title, cat, priority, due, opts = {}) => ({
    id: `d-t${id}`,
    title,
    categoryId: cat,
    priority,
    due: due == null ? null : day(due),
    status: opts.done != null ? 'done' : opts.doing ? 'doing' : 'todo',
    completedAt: opts.done != null ? at(-opts.done, 11 + (id % 8), 15) : null,
    createdAt: at(-(opts.created ?? 18), 9),
    notes: opts.notes || '',
    subtasks: (opts.subtasks || []).map((s, i) => ({ id: `d-t${id}-s${i}`, title: s[0], done: s[1] })),
    order: id,
  });

  const tasks = [
    T(1, 'Revise organic chemistry: aldehydes and ketones', 'd-cat-study', 'high', 0, {
      doing: true,
      notes: 'Focus on nucleophilic addition and the Tollens test.',
      subtasks: [['Summary sheet for reactions', true], ['Past paper Q4–Q9', false], ['Flashcards for named reactions', false]],
    }),
    T(2, 'Submit statistics problem set 6', 'd-cat-study', 'high', 2, { subtasks: [['Questions 1–5', true], ['Questions 6–10', false]] }),
    T(3, 'Draft portfolio case study for the botanical journal app', 'd-cat-proj', 'medium', 4, { notes: 'Include before/after layouts.' }),
    T(4, 'Call Amma about the weekend plans', 'd-cat-home', 'medium', 0),
    T(5, 'Read chapter 7 of Thermodynamics', 'd-cat-study', 'medium', 1),
    T(6, 'Evening walk by the lake', 'd-cat-well', 'low', 0),
    T(7, 'Clean up the project README', 'd-cat-proj', 'low', 6),
    T(8, 'Book library study room for exam week', 'd-cat-study', 'medium', -1),
    T(9, 'Physics lab report: pendulum damping', 'd-cat-study', 'high', -2, { done: 2 }),
    T(10, 'Make revision timetable', 'd-cat-study', 'medium', -4, { done: 4 }),
    T(11, 'Water the tulsi and repot the money plant', 'd-cat-home', 'low', -3, { done: 3 }),
    T(12, 'Statistics problem set 5', 'd-cat-study', 'high', -6, { done: 6 }),
    T(13, 'Sketch homepage wireframes', 'd-cat-proj', 'medium', -5, { done: 5 }),
    T(14, 'Yoga session', 'd-cat-well', 'low', -1, { done: 1 }),
    T(15, 'Organic chemistry quiz prep', 'd-cat-study', 'high', -9, { done: 9 }),
    T(16, 'Reply to club newsletter email', 'd-cat-proj', 'low', -8, { done: 8 }),
    T(17, 'Summarise biology unit 3 notes', 'd-cat-study', 'medium', -11, { done: 11 }),
    T(18, 'Grocery list for the week', 'd-cat-home', 'low', 0, { done: 0 }),
  ];

  const labels = [
    ['Organic chemistry revision', 'd-t1'],
    ['Statistics problem set', 'd-t2'],
    ['Thermodynamics reading', 'd-t5'],
    ['Portfolio case study', 'd-t3'],
    ['Deep work', null],
  ];
  const sessions = [];
  for (let n = 27; n >= 0; n--) {
    const count = n === 0 ? 1 : rnd() < 0.18 ? 0 : 1 + Math.floor(rnd() * 3);
    let hour = 8 + Math.floor(rnd() * 3);
    for (let k = 0; k < count; k++) {
      const planned = [25, 45, 60][Math.floor(rnd() * 3)];
      const early = rnd() < 0.2;
      const actualMin = early ? Math.round(planned * (0.4 + rnd() * 0.45)) : planned;
      const [label, taskId] = labels[Math.floor(rnd() * labels.length)];
      let start = at(-n, hour, Math.floor(rnd() * 50));
      // Never place a sample session in the future.
      if (start + actualMin * 60000 > Date.now()) start = Date.now() - actualMin * 60000 - 600000;
      const task = tasks.find((t) => t.id === taskId);
      sessions.push({
        id: `d-s${n}-${k}`,
        label,
        taskId,
        taskTitle: task ? task.title : '',
        contractId: null,
        plannedSec: planned * 60,
        actualSec: actualMin * 60,
        startedAt: start,
        endedAt: start + actualMin * 60000 + (early ? 0 : Math.floor(rnd() * 4) * 60000),
        outcome: early ? 'ended-early' : 'completed',
        note: k === 0 && n % 5 === 0 ? 'Felt settled after the first ten minutes.' : '',
      });
      hour += 2 + Math.floor(rnd() * 3);
    }
  }
  sessions.sort((a, b) => b.startedAt - a.startedAt);

  const outcomes = ['fulfilled', 'fulfilled', 'partial', 'fulfilled', 'not-fulfilled', 'fulfilled', 'partial', 'fulfilled'];
  const intentions = [
    'Finish the summary sheet for carbonyl reactions',
    'Solve five statistics questions without notes',
    'Outline the case study sections',
    'Read and annotate 12 pages of chapter 7',
    'Complete the lab report discussion section',
    'Make 30 flashcards for named reactions',
    'Draft the README introduction',
    'Review last week’s quiz mistakes',
  ];
  const contracts = intentions.map((intention, i) => {
    const s = sessions[2 + i * 3];
    return {
      id: `d-c${i}`,
      intention,
      taskId: s?.taskId || null,
      customTask: s?.taskId ? '' : 'Deep work block',
      minutes: s ? s.plannedSec / 60 : 45,
      success: 'Done when the written outcome exists and I could explain it to a friend.',
      status: outcomes[i],
      sessionId: s?.id || null,
      note: outcomes[i] === 'not-fulfilled' ? 'Started late; the goal was too large for one sitting. Split it next time.' : '',
      createdAt: s ? s.startedAt - 60000 : at(-3, 9),
      reviewedAt: s ? s.endedAt + 60000 : at(-3, 10),
    };
  });
  contracts.forEach((c) => {
    const s = sessions.find((x) => x.id === c.sessionId);
    if (s) s.contractId = c.id;
  });
  contracts.unshift(
    {
      id: 'd-c-p1',
      intention: 'Work through past paper Q4–Q9 on aldehydes',
      taskId: 'd-t1',
      customTask: '',
      minutes: 45,
      success: 'All six questions attempted and marked against the scheme.',
      status: 'pending',
      sessionId: null,
      note: '',
      createdAt: at(0, 8),
      reviewedAt: null,
    },
  );

  const events = [
    { id: 'd-e1', type: 'exam', title: 'Organic Chemistry midterm', subject: 'Chemistry', topic: 'Carbonyl compounds, units 4–6', date: day(6), time: '09:30' },
    { id: 'd-e2', type: 'exam', title: 'Statistics final', subject: 'Statistics', topic: 'Hypothesis testing & regression', date: day(13), time: '14:00' },
    { id: 'd-e3', type: 'exam', title: 'Thermodynamics quiz', subject: 'Physics', topic: 'Chapters 6–8', date: day(24), time: '11:00' },
    { id: 'd-e4', type: 'exam', title: 'Biology unit test', subject: 'Biology', topic: 'Unit 3: cell signalling', date: day(-10), time: '10:00' },
    { id: 'd-e5', type: 'assignment', title: 'Statistics problem set 6', subject: 'Statistics', topic: 'Due by midnight', date: day(2), time: '23:59' },
    { id: 'd-e6', type: 'assignment', title: 'Design studio critique', subject: 'Design', topic: 'Bring printed boards', date: day(9), time: '15:00' },
    { id: 'd-e7', type: 'personal', title: 'Cousin’s sangeet', subject: '', topic: '', date: day(5), time: '18:30' },
    { id: 'd-e8', type: 'personal', title: 'Dentist appointment', subject: '', topic: '', date: day(1), time: '16:00' },
    { id: 'd-e9', type: 'study', title: 'Group study: chemistry', subject: 'Chemistry', topic: 'Library room 2B', date: day(0), time: '17:00' },
    { id: 'd-e10', type: 'study', title: 'Past paper session', subject: 'Statistics', topic: '', date: day(3), time: '10:00' },
  ].map((e) => ({ notes: '', ...e }));

  const lastWeek = toKey(addDays(startOfWeek(today, weekStart), -7));
  const reviews = {
    [lastWeek]: {
      weekStart: lastWeek,
      wins: 'Finished the statistics problem set early and kept a steady morning routine on four days.',
      unfinished: 'Thermodynamics reading slipped to this week.',
      challenges: 'Afternoons after lab were hard to focus in.',
      adjustments: 'Move reading to mornings and keep afternoons for lighter review.',
      notes: 'The lotus pond on campus is blooming again.',
      nextGoals: 'Two chemistry sessions a day before the midterm.',
      importantTasks: 'Chemistry past papers, statistics set 6.',
      status: 'complete',
      updatedAt: at(-2, 20),
    },
  };

  return normalizeData({ tasks, categories, sessions, contracts, events, reviews, activeSession: null });
}
