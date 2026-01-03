import { BigNumber } from "../../math/BigNumber";
import type { Unit } from "../units/Unit";
import type { Heat } from "./Heat";

/** 単位を持つ {@link BigNumber} */
export class Quantity<U extends Unit> extends BigNumber {
    /** この値が持つ単位 */
    public readonly unit: U;

    public constructor(unit: U, mantissa: number, exponent: number = 0) {
        super(mantissa, exponent);
        this.unit = unit;
    }

    public override clone(): Quantity<U> {
        return this.as(this.unit);
    }

    /**
     * このリソースを指定された単位に変換します。
     *
     * この関数は Immutable です。
     * @param unit 変換先の単位
     */
    public as<T extends Unit>(unit: T): Quantity<T> {
        return new Quantity<T>(unit, this.mantissa, this.exponent);
    }

    /**
     * このリソースを熱に変換した際の熱リソース量を返します。
     *
     * この関数は Immutable です。
     */
    public toHeat(): Heat {
        return this.unit.toHeat(this.clone());
    }
}
