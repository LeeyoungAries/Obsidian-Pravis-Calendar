declare module "lunar-javascript" {
  export const Solar: {
    fromYmd(year: number, month: number, day: number): {
      getLunar(): {
        getMonthInChinese(): string;
        getDayInChinese(): string;
      };
    };
  };
}
