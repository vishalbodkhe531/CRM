const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getISTDate(date: Date = new Date()): Date {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

function fromISTDate(date: Date): Date {
  return new Date(date.getTime() - IST_OFFSET_MS);
}

export function istStartOfDay(date: Date = new Date()): Date {
  const ist = getISTDate(date);
  ist.setUTCHours(0, 0, 0, 0);
  return fromISTDate(ist);
}

export function istEndOfDay(date: Date = new Date()): Date {
  const ist = getISTDate(date);
  ist.setUTCHours(23, 59, 59, 999);
  return fromISTDate(ist);
}

export function istStartOfWeek(date: Date = new Date()): Date {
  const ist = getISTDate(date);
  ist.setUTCHours(0, 0, 0, 0);
  const day = ist.getUTCDay(); // 0 = Sunday
  const diff = ist.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  ist.setUTCDate(diff);
  return fromISTDate(ist);
}

export function istStartOfMonth(date: Date = new Date()): Date {
  const ist = getISTDate(date);
  ist.setUTCDate(1);
  ist.setUTCHours(0, 0, 0, 0);
  return fromISTDate(ist);
}
