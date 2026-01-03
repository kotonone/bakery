import type { Unit } from "./Unit";

/** デフォルトで利用される単位 */
export const Units: Readonly<{
    Heat: Unit & { readonly _type: "Heat" };
}> = {
    Heat: {
        _type: "Heat",
        toHeat(value) {
            return value.clone();
        },
    },
};
