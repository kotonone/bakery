/**
 * 数値をフォーマットします。
 * @param num 数値
 */
export function formatNumber(num: number): string {
    if (num < 1000) return (Math.round(num * 100) / 100).toString();
    if (num < 1000 ** 2) return (num / 1000).toFixed(1) + "K";
    if (num < 1000 ** 3) return (num / 1000 ** 2).toFixed(1) + "M";
    if (num < 1000 ** 4) return (num / 1000 ** 3).toFixed(1) + "G";
    if (num < 1000 ** 5) return (num / 1000 ** 4).toFixed(1) + "T";
    if (num < 1000 ** 6) return (num / 1000 ** 5).toFixed(1) + "P";
    if (num < 1000 ** 7) return (num / 1000 ** 6).toFixed(1) + "E";
    if (num < 1000 ** 8) return (num / 1000 ** 7).toFixed(1) + "Z";
    return (num / 1000 ** 8).toFixed(1) + "Y";
}
