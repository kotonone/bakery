import { type DeepReadonly } from "vue";
import type { GameState, IProducer, Price, IProducerData } from "./types";
import type { Clicker } from ".";

/** 生産ライン表現クラス */
export class Producer implements IProducer, IProducerData {
    public readonly id;
    public readonly name;
    public readonly description;
    public readonly auto;
    public readonly baseProduction;

    #clicker: DeepReadonly<Clicker>;
    #state: GameState;

    public constructor(clicker: DeepReadonly<Clicker>, state: GameState, producer: IProducer & IProducerData) {
        this.#clicker = clicker;
        this.#state = state;
        this.id = producer.id;
        this.name = producer.name;
        this.description = producer.description;
        this.auto = producer.auto;
        this.baseProduction = producer.baseProduction;
        this.unlocked = producer.unlocked;
    }

    /** この生産ラインが解放されているかどうか */
    public get unlocked(): boolean {
        return this.#state.producers[this.id].unlocked;
    }
    public set unlocked(value: boolean) {
        this.#state.producers[this.id].unlocked = value;
    }

    /** この生産ラインの生産量 */
    public get production(): Price[] {
        if (!this.unlocked) return [];

        let multiplier = 1.0;
        for (const upgrade of Object.values(this.#clicker.upgrades)) {
            let upgradeLevel = upgrade.level || 0;
            if (upgradeLevel === 0) continue;
            if (upgrade.withUnlock && upgradeLevel === 1) continue;
            if (upgrade.withUnlock) upgradeLevel--;

            for (const effect of upgrade.effect) {
                if (effect.producerId === this.id) {
                    if (effect.type === "multiplier") {
                        multiplier *= Math.pow(effect.value, upgradeLevel);
                    } else if (effect.type === "additive") {
                        multiplier += effect.value * upgradeLevel;
                    }
                }
            }
        }

        return this.baseProduction.map((price) => ({
            currency: price.currency,
            amount: price.amount * multiplier,
        }));
    }

    /**
     * 生産ラインを解放します。
     */
    public unlock(): boolean {
        if (this.unlocked) return false;

        this.unlocked = true;

        // this.#clicker.checkAchievements();
        this.#clicker.saveGame();
        this.#clicker.dispatchEvent(
            new CustomEvent("producerUnlocked", {
                detail: {
                    producerId: this.id,
                    producerName: this.name,
                },
            }),
        );
        return true;
    }

    /**
     * 生産ラインを 1 秒進めます。
     */
    public tick(): void {
        if (!this.unlocked) return;

        for (const price of this.production) {
            this.#state.currencies[price.currency] += price.amount;
            this.#state.totalCurrencies[price.currency] += price.amount;
        }
    }

    public toJSON(): IProducerData {
        return {
            unlocked: this.unlocked,
        };
    }
}
