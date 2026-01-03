import { Heat } from "../quantities/Heat";
import { Storage } from "../storage/Storage";
import type { Unit } from "../units/Unit";

/** 施設の入力ポート */
export class InputPort<U extends Unit> extends Storage<U> {
    /**
     * この入力ポートからオーバーフローしているリソースを、リソースの単位の定義に従って熱リソースに変換します。
     *
     * この関数は Mutable です。つまり、熱リソースに変換されたオーバーフロー分は、この入力ポートから消失します。
     */
    public collectHeat(): Heat {
        if (this.value.greaterThan(this.max)) {
            const heat = this.value.clone().sub(this.max).toHeat();
            this.value.copyFrom(this.max);
            return heat;
        } else {
            return new Heat(0);
        }
    }
}
