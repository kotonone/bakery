import { Quantity } from "../quantities/Quantity";
import type { Unit } from "../units/Unit";
import { Units } from "../units/definitions";
import { InputPort } from "../ports/InputPort";
import type { OutputPort } from "../ports/OutputPort";
import { Storage } from "../storage/Storage";

// TODO: 実装レベルでの Unit チェック（Quantity での演算、およびポートの接続）

export interface Recipe {
    inputs: Quantity<Unit>[];
    outputs: Quantity<Unit>[];
}
// TODO: 加工に熱も同時に出力するレシピ（現状は熱も単位の一つなので、出力ポートを探してしまい、施設の熱として登録されない）

/** 入力・出力数量に対するポートをバインドしたレシピ */
interface RecipeBinding {
    inputs: Map<InputPort<Unit>, Quantity<Unit>>;
    outputs: Map<OutputPort<Unit>, Quantity<Unit>>;
}

/** 施設 */
export abstract class Facility {
    /** この施設の入力ポート */
    public abstract readonly inputs: Readonly<Record<keyof any, InputPort<Unit>>>;

    /** この施設の出力ポート */
    public abstract readonly outputs: Readonly<Record<keyof any, OutputPort<Unit>>>;

    /** この施設の加工ルール */
    public abstract readonly recipes: ReadonlyArray<Recipe>;

    /**
     * この施設が安全に保持できる最大の熱リソース。
     * 詳しくは {@link heatSink} を参照してください。
     */
    public abstract readonly maxHeat: number | Quantity<typeof Units.Heat>;

    /** 次の施設の入力が満杯の際、この施設が加工を制限するかどうか */
    public hasSafety: boolean;

    /** この施設が熱暴走したかどうか */
    public exploded: boolean;

    /** この施設が保持している熱リソース */
    public readonly heatSink: Storage<typeof Units.Heat>;

    #bindings: RecipeBinding[] | null;

    public constructor() {
        this.hasSafety = true;
        this.exploded = false;
        this.heatSink = new Storage(Units.Heat, -Infinity);

        this.#bindings = null;
    }

    // TODO: 動的な recipes や inputs/outputs の変更に対応する
    /** {@link this.recipes} から算出された、ポート情報なども含む加工ルール */
    private get _bindings(): RecipeBinding[] {
        if (this.#bindings === null) {
            // TODO: 同じ単位の複数のパイプから RecipeBinding を生成（例: リソースAを供給するパイプが2つあり、リソースAはその2つから取るようにする）
            this.#bindings = this.recipes
                .map((recipe) => {
                    const binding: RecipeBinding = {
                        inputs: new Map(),
                        outputs: new Map(),
                    };

                    // NOTE: このレシピにおいて、どの入力ポートからリソースを取得する必要があるか
                    const inputs = Object.values(this.inputs);
                    for (const quantity of recipe.inputs) {
                        const input = inputs.find((input) => input.value.unit === quantity.unit);
                        if (!input) return null;
                        binding.inputs.set(input, quantity);
                    }

                    // NOTE: このレシピにおいて、どの出力ポートにリソースを出力する必要があるか
                    const outputs = Object.values(this.outputs);
                    for (const quantity of recipe.outputs) {
                        const output = outputs.find((output) => output.unit === quantity.unit);
                        if (!output) return null;
                        binding.outputs.set(output, quantity);
                    }

                    return binding;
                })
                .filter((entry): entry is NonNullable<typeof entry> => !!entry);
            // TODO: レシピで要求されたリソースの型を持つポートがない場合、現状レシピは強制的に〝なかったこと〟になる問題
        }
        return this.#bindings;
    }

    public update() {
        if (this.exploded) return;

        // NOTE: heatSink.max が未設定の場合、maxHeat の値で初期化する
        if (!this.heatSink.max.greaterThan(new Quantity(Units.Heat, 0)) && !this.heatSink.max.isFinite()) {
            this.heatSink.max.copyFrom(
                typeof this.maxHeat === "number" ? new Quantity(Units.Heat, this.maxHeat) : this.maxHeat,
            );
        }

        // TODO: インベントリを実装し、毎ティックごとに内部インベントリを満杯にするようにリソースを吸い、優先的に内部インベントリからリソースを使用する

        for (const binding of this._bindings) {
            // NOTE: 必要なリソースが入力ポートから受け取れない場合、このレシピは作成できない
            if (!binding.inputs.entries().every(([port, quantity]) => port.canTake(quantity))) break;

            // NOTE: セーフティーが有効で、かつ作成したリソースがオーバーフローする場合、このレシピは作成できない
            if (this.hasSafety && !binding.outputs.entries().every(([port, quantity]) => port.isSafe(quantity))) break;
            // TODO: 出力ポートに無理に詰めたリソースを、熱ではなくちゃんとリソースとしてどこかに回収する施設（ユーザーが熱出力ポートを作成し、ライブラリは collectHeat した後に熱出力ポートを優先的に探す？）

            // NOTE: 入力ポートからリソースを取得し、出力ポートにプッシュ
            for (const [port, quantity] of binding.inputs) port.take(quantity);
            for (const [port, quantity] of binding.outputs) port.push(quantity);
        }

        // NOTE: 1 Tick が終わった後、入力ポートからオーバーフローしているリソースを熱として処理
        for (const input of Object.values(this.inputs)) {
            // TODO: 他の施設から熱を回収する施設
            const heat = input.collectHeat();
            this.heatSink.put(heat);
            if (this.heatSink.value.greaterThan(this.heatSink.max)) {
                this.exploded = true;
                break;
            }
        }
    }
}

export class SampleFacility extends Facility {
    public readonly inputs = {
        abc: new InputPort(Units.Heat),
    };
    public override outputs = {};
    public override recipes = [];
    public override maxHeat = 100;
}

/*
ライブラリに付属させたい施設:
- SourceFacility (無限/有限に吐き出す)
- VoidFacility (無限/有限に吸い込む)
- StorageFacility (無限/有限に溜め込む)
無限か有限かは指定可能

InputPort.max が最大で流せるリソース
Facility.storage (未実装) でストアできるリソース
*/
