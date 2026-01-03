import { Units } from "../units/definitions";
import { Quantity } from "./Quantity";

/** 熱リソース */
export class Heat extends Quantity<(typeof Units)["Heat"]> {
    public constructor(mantissa: number, exponent: number = 0) {
        super(Units.Heat, mantissa, exponent);
    }
}
