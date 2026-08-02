// dailyContent.js — Daily/Oracle/Horoscope static content, ported 1:1 from
// the website's daily.js so the app shows the exact same messages, oracle
// deck and horoscope readings. No backend, no AI cost — matches the
// website's design intentionally (see daily.js header comment there).
// Update by re-running the extraction against a fresh daily.js export.
import { DAILY_MESSAGES, MORNING_INTENTIONS, ORACLE_CARDS, HOROSCOPE_30_DAYS } from './dailyContent.data';

export { DAILY_MESSAGES, MORNING_INTENTIONS, ORACLE_CARDS, HOROSCOPE_30_DAYS };

export const ZODIAC_SIGNS = [
  { key: 'Aries', symbol: '♈', label: 'Aries' },
  { key: 'Taurus', symbol: '♉', label: 'Taurus' },
  { key: 'Gemini', symbol: '♊', label: 'Gemini' },
  { key: 'Cancer', symbol: '♋', label: 'Cancer' },
  { key: 'Leo', symbol: '♌', label: 'Leo' },
  { key: 'Virgo', symbol: '♍', label: 'Virgo' },
  { key: 'Libra', symbol: '♎', label: 'Libra' },
  { key: 'Scorpio', symbol: '♏', label: 'Scorpio' },
  { key: 'Sagittarius', symbol: '♐', label: 'Sagittarius' },
  { key: 'Capricorn', symbol: '♑', label: 'Capricorn' },
  { key: 'Aquarius', symbol: '♒', label: 'Aquarius' },
  { key: 'Pisces', symbol: '♓', label: 'Pisces' },
];

function dayOfYear(now = new Date()) {
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}

// Matches website's loadDailyPanel(): dayOfYear % length, no off-by-one.
export function getTodaysMessage(now = new Date()) {
  return DAILY_MESSAGES[dayOfYear(now) % DAILY_MESSAGES.length];
}

export function getTodaysIntention(now = new Date()) {
  return MORNING_INTENTIONS[dayOfYear(now) % MORNING_INTENTIONS.length];
}

// Matches website's getStaticHoroscope(): (dayOfYear - 1 + 30) % 30.
export function getStaticHoroscope(signKey, now = new Date()) {
  const idx = (dayOfYear(now) - 1 + 30) % 30;
  const rows = HOROSCOPE_30_DAYS[signKey];
  return rows ? (rows[idx] || rows[0] || null) : null;
}

// Fisher-Yates, same algorithm as website's shuffleOracle().
export function shuffleOracleDeck() {
  const a = ORACLE_CARDS.map((_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
