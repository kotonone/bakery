/**
 * `n * 10^m` の形式で数値を管理するクラス
 */
export class BigNumber {
    #mantissa: number;
    #exponent: number;

    private static readonly EPSILON = 1e-12;

    public constructor(mantissa: number, exponent: number = 0) {
        this.#mantissa = mantissa;
        this.#exponent = exponent;
        this._normalize();
    }

    /** 仮数 */
    public get mantissa(): number {
        return this.#mantissa;
    }
    private set mantissa(value: number) {
        this.#mantissa = value;
    }

    /** 指数 */
    public get exponent(): number {
        return this.#exponent;
    }
    private set exponent(value: number) {
        this.#exponent = value;
    }

    /**
     * 有限数かどうか判定します。
     */
    public isFinite(): boolean {
        return Number.isFinite(this.mantissa);
    }

    /**
     * 指定された数を加算します。
     * @param other 数
     */
    public add(other: this): this {
        // NOTE: どちらかが無限大の場合のガード節
        if (!this.isFinite() || !other.isFinite()) {
            // NOTE: 両方無限大かつ符号が逆の場合は NaN (不定) になるが、
            // NOTE: ここではJSの挙動に従い Infinity + (-Infinity) = NaN とする
            if (!this.isFinite() && !other.isFinite() && this.mantissa !== other.mantissa) {
                this.mantissa = NaN;
                this.exponent = 0;
                return this;
            }
            // 自身が有限で相手が無限なら、自身を無限にする
            if (this.isFinite() && !other.isFinite()) {
                this.mantissa = other.mantissa;
                this.exponent = other.exponent;
                return this;
            }
            // 自身が無限なら変化なし
            return this;
        }

        const diff = this.exponent - other.exponent;

        if (diff === 0) {
            this.mantissa += other.mantissa;
        } else if (diff > 0) {
            // NOTE: 自身の方が桁が大きい場合、相手を小さくして足す
            this.mantissa += other.mantissa / Math.pow(10, diff);
        } else {
            // NOTE: 相手の方が桁が大きい場合、自身を小さくして足し、指数を相手に合わせる
            this.mantissa = this.mantissa / Math.pow(10, -diff) + other.mantissa;
            this.exponent = other.exponent;
        }

        this._normalize();
        return this;
    }

    /**
     * 指定された数を減算します。
     * @param other 数
     */
    public sub(other: this): this {
        // NOTE: どちらかが無限大の場合のガード節
        if (!this.isFinite() || !other.isFinite()) {
            if (!this.isFinite() && !other.isFinite() && this.mantissa === other.mantissa) {
                // NOTE: 無限 - 無限 = NaN
                this.mantissa = NaN;
                this.exponent = 0;
                return this;
            }
            if (this.isFinite() && !other.isFinite()) {
                // NOTE: 有限 - 無限 = -無限
                this.mantissa = -other.mantissa;
                this.exponent = other.exponent;
                return this;
            }
            // NOTE: 自身が無限なら変化なし
            return this;
        }

        const diff = this.exponent - other.exponent;

        if (diff === 0) {
            this.mantissa -= other.mantissa;
        } else if (diff > 0) {
            this.mantissa -= other.mantissa / Math.pow(10, diff);
        } else {
            this.mantissa = this.mantissa / Math.pow(10, -diff) - other.mantissa;
            this.exponent = other.exponent;
        }

        this._normalize();
        return this;
    }

    /**
     * 指定された数を乗算します。
     * @param other 数
     */
    public mul(other: this): this {
        // NOTE: NaNが含まれる場合は常にNaN
        if (Number.isNaN(this.mantissa) || Number.isNaN(other.mantissa)) {
            this.mantissa = NaN;
            this.exponent = 0;
            return this;
        }

        // NOTE: 無限大の計算
        if (!this.isFinite() || !other.isFinite()) {
            // NOTE: Infinity * 0 = NaN (不定)
            if (this.mantissa === 0 || other.mantissa === 0) {
                this.mantissa = NaN;
                this.exponent = 0;
                return this;
            }
            // NOTE: Infinity * Finite = Infinity (符号は計算結果に従う)
            // mantissa同士を掛けることで符号と無限大の状態を適切に遷移させる
            this.mantissa = this.mantissa * other.mantissa;
            this.exponent = 0;
            return this;
        }

        // 通常の計算: (m1 * 10^e1) * (m2 * 10^e2) = (m1 * m2) * 10^(e1 + e2)
        this.mantissa *= other.mantissa;
        this.exponent += other.exponent;

        this._normalize();
        return this;
    }

    /**
     * 指定された数で除算します。
     * @param other 数
     */
    public div(other: this): this {
        // NOTE: NaNが含まれる場合は常にNaN
        if (Number.isNaN(this.mantissa) || Number.isNaN(other.mantissa)) {
            this.mantissa = NaN;
            this.exponent = 0;
            return this;
        }

        // NOTE: 無限大の絡む除算
        if (!this.isFinite() || !other.isFinite()) {
            if (!this.isFinite() && !other.isFinite()) {
                // NOTE: Infinity / Infinity = NaN
                this.mantissa = NaN;
                this.exponent = 0;
                return this;
            }
            if (!other.isFinite()) {
                // NOTE: Finite / Infinity = 0
                this.mantissa = 0;
                this.exponent = 0;
                return this;
            }
            // NOTE: Infinity / Finite = Infinity (符号計算含む)
            this.mantissa = this.mantissa / other.mantissa;
            this.exponent = 0;
            return this;
        }

        // NOTE: 0除算の処理
        if (other.mantissa === 0) {
            if (this.mantissa === 0) {
                // NOTE: 0 / 0 = NaN
                this.mantissa = NaN;
                this.exponent = 0;
                return this;
            }
            // NOTE: Finite / 0 = Infinity (符号計算含む)
            this.mantissa = this.mantissa / 0; // JSの標準挙動でInfinity/-Infinityになる
            this.exponent = 0;
            return this;
        }

        // 通常の計算: (m1 * 10^e1) / (m2 * 10^e2) = (m1 / m2) * 10^(e1 - e2)
        this.mantissa /= other.mantissa;
        this.exponent -= other.exponent;

        this._normalize();
        return this;
    }

    /**
     * 自身が対象より大きいかどうかを判定します。
     * @param other 比較対象
     */
    public greaterThan(other: this): boolean {
        // NOTE: NaNが含まれる場合は常にfalse (IEEE 754準拠)
        if (Number.isNaN(this.mantissa) || Number.isNaN(other.mantissa)) return false;

        // NOTE: 無限大の判定
        if (!this.isFinite() || !other.isFinite()) {
            if (this.mantissa === other.mantissa) return false; // 同符号の無限大同士
            return this.mantissa > other.mantissa;
        }

        // NOTE: 符号が異なる場合
        if (Math.sign(this.mantissa) !== Math.sign(other.mantissa)) {
            return this.mantissa > other.mantissa;
        }

        if (this.mantissa === 0 && other.mantissa === 0) {
            // NOTE: 両方0の場合
            return false;
        } else if (this.mantissa > 0) {
            // NOTE: 両方正の場合
            if (this.exponent > other.exponent) return true;
            if (this.exponent < other.exponent) return false;
            return this.mantissa > other.mantissa;
        } else {
            // NOTE: 両方負の場合
            if (this.exponent > other.exponent) return false;
            if (this.exponent < other.exponent) return true;
            return this.mantissa > other.mantissa;
        }
    }

    /**
     * 自身と対象が等しいかどうかを判定します。
     * @param other 比較対象
     */
    public equals(other: this): boolean {
        if (this.exponent !== other.exponent) return false;

        // NOTE: 仮数部の差が EPSILON 以内なら等しいとみなす
        return Math.abs(this.mantissa - other.mantissa) < BigNumber.EPSILON;
    }

    /**
     * 自身と対象のうち、大きな方のインスタンスを返します。
     * @param other 比較対象
     */
    public max(other: this): this {
        if (this.greaterThan(other)) {
            return this;
        } else {
            return other;
        }
    }

    /** 文字列表現を返します。 */
    public toString(): string {
        if (!Number.isFinite(this.mantissa)) return this.mantissa.toString();

        const fractionDigits = -Math.log10(BigNumber.EPSILON);

        if (this.exponent < fractionDigits) {
            // NOTE: 小数点以下を丸めて表示
            const val = this.mantissa * Math.pow(10, this.exponent);
            return parseFloat(val.toFixed(fractionDigits)).toString();
        }

        // NOTE: 指数が大きい場合は 1.23e+10 のように表示
        return `${this.mantissa.toFixed(fractionDigits)}e${this.exponent}`;
    }

    /**
     * 指定された値を自身にコピーします。
     * @param other コピー元
     */
    public copyFrom(other: this): this {
        this.#mantissa = other.mantissa;
        this.#exponent = other.exponent;
        this._normalize();
        return this;
    }

    /**
     * 自身の複製を作成して返します。
     */
    public clone(): BigNumber {
        return new BigNumber(this.mantissa, this.exponent);
    }

    /**
     * 1 <= |mantissa| < 10 になるよう、数値を正規化します。
     */
    protected _normalize(): void {
        // NOTE: 無限か 0 であれば、指数部を 0 にしてやめる
        if (!Number.isFinite(this.mantissa)) {
            this.exponent = 0;
            return;
        }
        if (this.mantissa === 0) {
            this.exponent = 0;
            return;
        }

        // NOTE: すでに正規化されていれば、やめる
        let absMantissa = Math.abs(this.mantissa);

        // NOTE: 大まかな正規化（指数の調整）
        if (absMantissa >= 10 || absMantissa < 1) {
            const offset = Math.floor(Math.log10(absMantissa));
            this.mantissa /= Math.pow(10, offset);
            this.exponent += offset;
        }

        // NOTE: 有効数字 12 桁に丸める
        const precision = 1 / BigNumber.EPSILON;
        this.mantissa = Math.round(this.mantissa * precision) / precision;

        // NOTE: 丸め処理後の再正規化（9.999... -> 10 になる可能性がある）
        absMantissa = Math.abs(this.mantissa);
        if (absMantissa >= 10) {
            this.mantissa /= 10;
            this.exponent++;
        } else if (absMantissa < 1) {
            this.mantissa *= 10;
            this.exponent--;
        }
    }
}
