import { Solar } from "lunar-javascript";

export function getLunarString(date: Date): string {
  try {
    const solar = Solar.fromYmd(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
    const lunar = solar.getLunar();
    return lunar.getMonthInChinese() + "月" + lunar.getDayInChinese();
  } catch {
    return "";
  }
}
