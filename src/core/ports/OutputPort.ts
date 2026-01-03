import { Quantity } from "../quantities/Quantity";
import type { Unit } from "../units/Unit";
import type { InputPort } from "./InputPort";

/** 施設の出力ポート */
export class OutputPort<U extends Unit> {
    /** この出力ポートが出力できるリソース */
    public readonly unit: U;

    #destination: InputPort<U> | null;

    public constructor(unit: U) {
        this.unit = unit;
        this.#destination = null;
    }

    /** この出力ポートにおける、出力先の入力ポート */
    public get destination(): InputPort<U> | null {
        return this.#destination;
    }
    private set destination(value: InputPort<U> | null) {
        this.#destination = value;
    }

    /** 出力先の入力ポートを指定します。 */
    public connect(port: InputPort<U> | null): this {
        this.destination = port;
        // TODO: invalid unit error
        return this;
    }
    /** 入力ポートへの接続を解除します。 */
    public disconnect(): this {
        this.connect(null);
        return this;
    }

    /**
     * 指定されたリソースを出力先の入力ポートに出力した時、出力先からオーバーフローする量を取得します。
     * @param resource リソース
     */
    public getOverflowed(resource: Quantity<U>): Quantity<U> {
        const destination = this.destination;
        if (!destination) return resource.clone();

        const overflowedValue = destination.value.clone().add(resource).sub(destination.max);
        if (overflowedValue.greaterThan(new Quantity(overflowedValue.unit, 0))) {
            // TODO: ここで new Quantity しているのは、パフォーマンス上よくない
            return overflowedValue;
        }
        return new Quantity(overflowedValue.unit, 0);
    }

    /**
     * 指定されたリソースを、出力先の入力ポートに出力しても、出力先がオーバーフローしないかどうかを確認します。
     *
     * この関数は {@link getOverflowed} のラッパーです。
     * 数量を取得する場合は、{@link getOverflowed} を使用してください。
     * @param resource リソース
     */
    public isSafe(resource: Quantity<U>): boolean {
        return !this.getOverflowed(resource).greaterThan(new Quantity(resource.unit, 0));
    }

    /**
     * 指定されたリソースを、出力先の入力ポートに出力します。
     * @param resource リソース
     */
    public push(resource: Quantity<U>): this {
        // TODO: OutputPort で、出力先が null のとき、リソースを完全に無に破棄する問題（OutputPort が熱を出すようにする？）
        // TODO: 出力先の単位が合わなかった場合でも出力してしまう
        this.#destination?.put(resource);
        return this;
    }
}
