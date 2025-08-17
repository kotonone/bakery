import { type DeepReadonly } from "vue";
import type { GameState, IUpgrade, IUpgradeData, Price } from "./types";
import type { Clicker } from ".";

/** アップグレード表現クラス */
export class Upgrade implements IUpgrade, IUpgradeData {
    public readonly id;
    public readonly name;
    public readonly description;
    public readonly withUnlock;
    public readonly effect;
    public readonly baseCost;
    public readonly costMultiplier;
    public readonly maxLevel;

    #clicker: DeepReadonly<Clicker>;
    #state: GameState;

    public constructor(clicker: DeepReadonly<Clicker>, state: GameState, upgrade: IUpgrade & IUpgradeData) {
        this.#clicker = clicker;
        this.#state = state;
        this.id = upgrade.id;
        this.name = upgrade.name;
        this.description = upgrade.description;
        this.withUnlock = upgrade.withUnlock;
        this.effect = upgrade.effect;
        this.baseCost = upgrade.baseCost;
        this.costMultiplier = upgrade.costMultiplier;
        this.maxLevel = upgrade.maxLevel;
        this.level = upgrade.level;
    }

    /** このアップグレードの現在のレベル */
    public get level(): number {
        return this.#state.upgrades[this.id]!.level;
    }
    public set level(value: number) {
        this.#state.upgrades[this.id]!.level = value;
    }

    /**
     * アップグレードの現在のコスト
     */
    public get cost(): Price[] {
        const multiplier = Math.pow(this.costMultiplier, this.level);

        return this.baseCost.map((price) => ({
            currency: price.currency,
            amount: Math.floor(price.amount * multiplier),
        }));
    }

    /**
     * アップグレードが購入可能かどうか
     */
    public get canPurchase(): boolean {
        const isEnough = this.cost.every((price) => this.#state.currencies[price.currency] >= price.amount);
        return isEnough && this.level < this.maxLevel;
    }

    /**
     * アップグレードを購入します。
     */
    public purchase(): boolean {
        if (!this.canPurchase) return false;

        // NOTE: 料金を取る
        for (const price of this.cost) {
            this.#state.currencies[price.currency] -= price.amount;
        }

        // NOTE: アップグレードする
        this.level++;

        // NOTE: withUnlock が有効の場合、生産ラインを解放
        if (this.withUnlock) {
            for (const producerId of new Set(this.effect.map((e) => e.producerId))) {
                this.#clicker.getProducerById(producerId)?.unlock();
            }
        }

        // TODO: 実績チェック
        // this.#clicker.checkAchievements();
        this.#clicker.saveGame();
        this.#clicker.dispatchEvent(
            new CustomEvent("upgradePurchased", {
                detail: {
                    upgradeId: this.id,
                    cost: this.cost,
                    newLevel: this.level,
                },
            }),
        );
        return true;
    }

    public toJSON(): IUpgradeData {
        return {
            level: this.level,
        };
    }
}
