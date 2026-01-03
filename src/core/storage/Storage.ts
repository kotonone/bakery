import type { BigNumber } from "../../math/BigNumber";
import { Quantity } from "../quantities/Quantity";
import type { Unit } from "../units/Unit";

/** ストレージ */
export class Storage<U extends Unit> {
    /** ポートに存在する一時的なリソース */
    public readonly value: Quantity<U>;
    /** ポートが最大で保持できるリソース */
    public readonly max: Quantity<U>;

    public constructor(unit: U, max: number | BigNumber = Infinity) {
        this.value = new Quantity(unit, 0);
        this.max = typeof max === "number" ? new Quantity(unit, max) : new Quantity(unit, max.mantissa, max.exponent);
    }

    /**
     * このストレージからリソースが提供できるか確認します。
     *
     * 提供できる場合は `true` を、バッファの残量が要求された量に満たない場合は `false` を返します。
     * @param value 要求するリソース
     */
    public canTake(value: Quantity<U>): boolean {
        return this.value.greaterThan(value) || this.value.equals(value);
    }
    /**
     * 要求された数量のリソースを提供（減算）します。
     *
     * これは、0 以下になることを確認しません。
     * 0 以下になるかどうか事前に確認するためには、{@link canTake} を使用してください。
     *
     * この関数は Mutable です。
     * @param value 要求するリソース
     */
    public take(value: Quantity<U>): this {
        this.value.sub(value);
        return this;
    }

    /**
     * このストレージにリソースを追加できるか確認します。
     *
     * 追加できる場合は `true` を、追加するとオーバーフローする場合は `false` を返します。
     * @param value 要求するリソース
     */
    public canPut(value: Quantity<U>): boolean {
        return !this.value.clone().add(value).greaterThan(this.max);
    }
    /**
     * このストレージにリソースを追加します。
     * これは、{@link max} の値を確認しません。
     *
     * オーバーフロー分は、{@link Heat} として扱われます。
     * オーバーフローするかどうか事前に確認するためには、{@link canPut} を使用してください。
     *
     * この関数は Mutable です。
     * @param value 要求するリソース
     */
    public put(value: Quantity<U>): this {
        this.value.add(value);
        return this;
    }
}
