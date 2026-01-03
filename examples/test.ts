import { Facility, type Recipe } from "../src/core/facility/Facility";
import { InputPort } from "../src/core/ports/InputPort";
import { OutputPort } from "../src/core/ports/OutputPort";
import { Quantity } from "../src/core/quantities/Quantity";
import type { Unit } from "../src/core/units/Unit";
import { Units as DefaultUnits } from "../src/core/units/definitions";

const Units = {
    RawEther: {
        toHeat(value) {
            const heatValue = value.mul(new Quantity(value.unit, 0.1)); // 10% of RawEther converts to Heat
            return heatValue.as(DefaultUnits.Heat);
        },
    },
    PureMana: {
        toHeat(value) {
            const heatValue = value.mul(new Quantity(value.unit, 0.05)); // 5% of PureMana converts to Heat
            return heatValue.as(DefaultUnits.Heat);
        },
    },
    ManaCrystal: {
        toHeat(value) {
            const heatValue = value.mul(new Quantity(value.unit, 0.02)); // 2% of ManaCrystal converts to Heat
            return heatValue.as(DefaultUnits.Heat);
        },
    },
} satisfies Record<string, Unit>;

/**
 * 施設1: エーテル抽出機
 * 空間から毎ティック、粗製エーテル(RawEther)を生成する（入力なし、出力のみのソース施設）
 */
class EtherExtractor extends Facility {
    public readonly inputs = {};
    public readonly outputs = {
        mainOutput: new OutputPort(Units.RawEther),
    };
    public readonly maxHeat = 1000;
    public override hasSafety: boolean = false; // 安全装置なし
    public readonly recipes: Recipe[] = [
        {
            inputs: [],
            outputs: [new Quantity(Units.RawEther, 100)], // 100 RawEther / tick
        },
    ];
}

/**
 * 施設2: マナ精製機
 * 粗製エーテル(RawEther)を濾過し、純粋マナ(PureMana)に変換する。
 * レート: 5 Ether -> 2 Mana
 */
class ManaRefinery extends Facility {
    public readonly inputs = {
        intake: new InputPort(Units.RawEther, 500),
    };
    public readonly outputs = {
        discharge: new OutputPort(Units.PureMana),
    };
    public readonly maxHeat = 500; // 精製は熱を持ちやすいとする
    public override hasSafety: boolean = false; // 安全装置なし
    public readonly recipes: Recipe[] = [
        {
            inputs: [new Quantity(Units.RawEther, 5)],
            outputs: [new Quantity(Units.PureMana, 2)],
        },
    ];
}

/**
 * 施設3: 魔石プレス機
 * 純粋マナ(PureMana)を高圧で固形化し、魔力結晶(ManaCrystal)にする。
 * レート: 10 Mana -> 1 Crystal
 */
class CrystalPress extends Facility {
    public readonly inputs = {
        inject: new InputPort(Units.PureMana, 200),
    };
    public readonly outputs = {
        product: new OutputPort(Units.ManaCrystal),
    };
    public readonly maxHeat = 2000; // 高圧に耐えるため許容熱量が高い
    public readonly recipes: Recipe[] = [
        {
            inputs: [new Quantity(Units.PureMana, 10)],
            outputs: [new Quantity(Units.ManaCrystal, 1)],
        },
    ];
}

async function main() {
    // インスタンス化
    const extractor = new EtherExtractor();
    const refinery = new ManaRefinery();
    const press = new CrystalPress();

    // 施設間のパイプ接続
    extractor.outputs.mainOutput.connect(refinery.inputs.intake);
    refinery.outputs.discharge.connect(press.inputs.inject);

    // プレス機の出力先（今回は倉庫代わりのダミーポートへ）
    const warehouseStorage = new InputPort(Units.ManaCrystal, Infinity);
    press.outputs.product.connect(warehouseStorage);
    const printStatus = (tick: number) => {
        console.log(`\n--- Tick ${tick} ---`);

        // 施設ごとの詳細ステータス
        const stats = [
            {
                Facility: "Refinery",
                Buffer: `${refinery.inputs.intake.value.toString()} / ${refinery.inputs.intake.max.toString()}`,
                Heat: `${refinery.heatSink.value.toString()} / ${refinery.heatSink.max.toString()}`,
                Status: refinery.exploded ? "EXPLODED" : "OK",
            },
            {
                Facility: "Press",
                Buffer: `${press.inputs.inject.value.toString()} / ${press.inputs.inject.max.toString()}`,
                Heat: `${press.heatSink.value.toString()} / ${press.heatSink.max.toString()}`,
                Status: press.exploded ? "EXPLODED" : "OK",
            },
        ];
        console.table(stats);
        console.log(`> Warehouse: ${warehouseStorage.value.toString()}`);
    };

    // シミュレーションループ
    for (let i = 1; i <= 10000000; i++) {
        // Update 順序は下流から上流へ
        // 3. 結晶化
        press.update();
        // 2. 精製
        refinery.update();
        // 1. 抽出
        extractor.update();

        // 状態表示
        if (i % 100000 === 0) {
            printStatus(i);
        }

        // 爆発チェック
        if (refinery.exploded) {
            console.error(`!! CRITICAL ALERT: Refinery Meltdown at Tick ${i} !!!`);
            break;
        }
        if (press.exploded) {
            console.error(`!!! CRITICAL ALERT: Press Meltdown at Tick ${i} !!!`);
            break;
        }
    }
}
main();
