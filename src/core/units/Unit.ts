import type { Heat } from "../quantities/Heat";
import type { Quantity } from "../quantities/Quantity";

/** 単位（ゲーム内で扱われるリソース） */
export interface Unit {
    /**
     * リソースを熱に変換します。
     * @param value 熱に変換するリソース量
     */
    toHeat(value: Quantity<this>): Heat;
}
