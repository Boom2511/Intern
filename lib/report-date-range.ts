const BANGKOK_OFFSET_MINUTES = 7 * 60;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function getBangkokMidnight(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError('วันที่รายงานไม่ถูกต้อง');

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const utcMidnight = Date.UTC(year, month - 1, day);
  const parsedDate = new Date(utcMidnight);

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new RangeError('วันที่รายงานไม่ถูกต้อง');
  }

  return utcMidnight - BANGKOK_OFFSET_MINUTES * 60 * 1000;
}

export function getReportDateRange(startDate: string, endDate = startDate) {
  const start = getBangkokMidnight(startDate);
  const end = getBangkokMidnight(endDate);
  if (end < start) throw new RangeError('วันที่สิ้นสุดต้องไม่อยู่ก่อนวันที่เริ่มต้น');

  return {
    gte: new Date(start),
    lt: new Date(end + DAY_IN_MILLISECONDS),
  };
}
