import type { BigNumber } from "./BigNumber";

/**
 * a + b > limit かどうかを判定します。
 */
export function isSumGreaterThan<N extends BigNumber>(a: N, b: N, limit: N): boolean {
    // NOTE: NaN は即座に false
    if (Number.isNaN(a.mantissa) || Number.isNaN(b.mantissa) || Number.isNaN(limit.mantissa)) {
        return false;
    }

    const aIsFinite = a.isFinite();
    const bIsFinite = b.isFinite();
    const limitIsFinite = limit.isFinite();
    if (!aIsFinite || !bIsFinite || !limitIsFinite) {
        // Case: a と b が逆符号の無限大 (NaN)
        if (!aIsFinite && !bIsFinite && Math.sign(a.mantissa) !== Math.sign(b.mantissa)) {
            return false;
        }

        // Case: limit が無限大
        if (!limitIsFinite) {
            // NOTE: limit が +Inf なら、(NaNでない限り) 超えることはできない -> false
            if (limit.mantissa > 0) return false;
            // NOTE: limit が -Inf の場合、合計も -Inf (a か b が -Inf) なら false、それ以外は true
            if ((!aIsFinite && a.mantissa < 0) || (!bIsFinite && b.mantissa < 0)) return false;
            return true;
        }

        // Case: limit は有限、a または b が無限大
        // 正の無限大が含まれていれば limit を超える
        if (!aIsFinite && a.mantissa > 0) return true;
        if (!bIsFinite && b.mantissa > 0) return true;

        // NOTE: どちらかが -Inf (かつ +Inf 相殺なし) なら limit を超えない
        return false;
    }

    const signA = Math.sign(a.mantissa);
    const signB = Math.sign(b.mantissa);
    const signLimit = Math.sign(limit.mantissa);

    // NOTE: limit が負で、a と b が非負なら、計算不要で true
    if (signLimit < 0 && signA >= 0 && signB >= 0) return true;
    // NOTE: limit が正で、a と b が共に負なら、計算不要で false
    if (signLimit > 0 && signA < 0 && signB < 0) return false;

    // NOTE: 指数差による判定
    if (signLimit > 0) {
        const diffA = limit.exponent - a.exponent;
        const diffB = limit.exponent - b.exponent;
        // 両方とも limit より 20 桁（JavaScript の number の仮数部 52 bits、10進数で 15.95 桁）以上小さければ、足しても絶対に届かない
        if (diffA > 20 && diffB > 20) return false;
    }

    // NOTE: 最後の手段として、正規化して比較
    const maxExp = Math.max(a.exponent, b.exponent, limit.exponent);
    // NOTE: すべてを maxExp に合わせた仮数に変換する
    // NOTE: 指数差が大きい場合、Math.pow(10, -huge) は 0 になるため安全
    const valA = a.mantissa * Math.pow(10, a.exponent - maxExp);
    const valB = b.mantissa * Math.pow(10, b.exponent - maxExp);
    const valLimit = limit.mantissa * Math.pow(10, limit.exponent - maxExp);
    return valA + valB > valLimit;
}
