// Shared by the /upcoming-games page's Upcoming/Past split and the publish
// filter, so both agree on what "today" is (design D3).

const LONDON_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Today's date in the UK as "YYYY-MM-DD" (en-CA formats dates that way). A
// game dated today counts as upcoming for the whole of match day.
export function todayInLondon(now: Date = new Date()): string {
  return LONDON_DATE.format(now);
}

// "20:30" → "8:30 PM", the legacy upcoming-games.json time format.
export function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}
