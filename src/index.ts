import { computed, reactive, type ComputedRef, type DeepReadonly } from "vue";
import type { GameState, ExtendedGameState, IAchievement, IProducer, IUpgrade, Price, CurrencyType } from "./types";
import { formatNumber } from "./utils/formatters";
import type { TypedEventTarget } from "./utils/event";
import { Producer } from "./producer";
import { Upgrade } from "./upgrade";

const ClickerEventTarget = EventTarget as new () => TypedEventTarget<ClickerEventMap>;

/** Clicker クラスのイベント型定義 */
export interface ClickerEventMap {
    producerUnlocked: CustomEvent<{ producerId: string; producerName: string }>;
    upgradeUnlocked: CustomEvent<{ upgradeId: string; upgradeName: string }>;
    upgradePurchased: CustomEvent<{ upgradeId: string; cost: Price[]; newLevel: number }>;
    achievementUnlocked: CustomEvent<{ achievementId: string; achievementName: string }>;
    gameStateChanged: CustomEvent<{ state: ExtendedGameState }>;
}

/** Clicker クラスのコンストラクタオプション */
export interface ClickerOptions {
    currencies: Record<
        CurrencyType,
        {
            icon: string;
            color: string;
        }
    >;
    producers: ReadonlyArray<IProducer>;
    upgrades: ReadonlyArray<IUpgrade>;
    achievements: ReadonlyArray<IAchievement>;
    saveKey?: string;
}

/** クリッカー */
export class Clicker extends ClickerEventTarget {
    #interval: number;

    /** 生産ラインデータ */
    public readonly producers: Record<string, Producer>;
    /** アップグレードデータ */
    public readonly upgrades: Record<string, Upgrade>;
    /** 実績マスターデータ */
    public readonly achievements: ReadonlyArray<IAchievement>;

    /** セーブデータに利用するキー */
    public readonly saveKey: string;

    /** UI表示用の拡張されたゲーム状態 */
    public viewState: DeepReadonly<ComputedRef<ExtendedGameState>>;

    #state: GameState;

    /**
     * Clicker ゲームインスタンスを作成します。
     * @param options ゲーム設定オプション
     */
    public constructor(options: ClickerOptions) {
        super();

        // NOTE: ステートを設定
        this.#state = reactive({
            currencies: Object.fromEntries(Object.keys(options.currencies).map((c) => [c, 0])),
            totalCurrencies: Object.fromEntries(Object.keys(options.currencies).map((c) => [c, 0])),
            producers: Object.fromEntries(options.producers.map((producer) => [producer.id, { unlocked: false }])),
            upgrades: Object.fromEntries(options.upgrades.map((upgrade) => [upgrade.id, { level: 0 }])),
            achievements: [] as string[],
        });

        // NOTE: インスタンス化
        this.producers = Object.fromEntries(
            options.producers.map((v) => [v.id, new Producer(this, this.#state, { ...v, unlocked: false })]),
        );
        this.upgrades = Object.fromEntries(
            options.upgrades.map((v) => [v.id, new Upgrade(this, this.#state, { ...v, level: 0 })]),
        );
        this.achievements = options.achievements;
        this.saveKey = options.saveKey || "clicker-game-save";

        // NOTE: 表示用ステートを設定
        this.viewState = computed(() => ({
            ...this.#state,
            currenciesText: Object.fromEntries(
                Object.entries(this.#state.currencies).map(([id, value]) => [id, formatNumber(value)]),
            ),
            totalCurrenciesText: Object.fromEntries(
                Object.entries(this.#state.totalCurrencies).map(([id, value]) => [id, formatNumber(value)]),
            ),
            productionPerSecondText: Object.fromEntries(
                Object.entries(this.productionPerSecond).map(([id, value]) => [id, formatNumber(value)]),
            ),
            productionPerSecondPerProducerText: Object.fromEntries(
                Object.entries(this.producers).map(([id, value]) => [
                    id,
                    Object.fromEntries(value.production.map((price) => [price.currency, formatNumber(price.amount)])),
                ]),
            ),
            achievements: this.achievements.map((achievement) => ({
                ...achievement,
                unlocked: this.#state.achievements.includes(achievement.id),
            })),
        }));

        // NOTE: ゲームをロード
        this.loadGame();

        // NOTE: 自動生産のタイマー
        this.#interval = setInterval(() => {
            for (const producer of Object.values(this.producers)) {
                if (producer.unlocked && producer.auto) producer.tick();
            }

            this.checkAchievements();
            this.saveGame();
        }, 1000);
    }

    /**
     * ID から Producer を取得します。
     * @param id 生産ラインID
     */
    public getProducerById(id: string): Producer | null {
        return this.producers[id] ?? null;
    }

    /**
     * ID から Upgrade を取得します。
     * @param id アップグレードID
     */
    public getUpgradeById(id: string): Upgrade | null {
        return this.upgrades[id] ?? null;
    }

    /**
     * ID から Achievement の情報を取得します。
     * @param id 実績ID
     */
    public getAchievementById(id: string): IAchievement | null {
        return this.achievements.find((achievement) => achievement.id === id) ?? null;
    }

    /** 毎秒の生産量 */
    private get productionPerSecond(): Record<CurrencyType, number> {
        const production: Record<CurrencyType, number> = Object.fromEntries(
            Object.keys(this.#state.currencies).map((c) => [c, 0]),
        );

        for (const producer of Object.values(this.producers)) {
            if (producer.unlocked && producer.auto) {
                for (const price of producer.production) {
                    production[price.currency] += price.amount;
                }
            }
        }

        return production;
    }

    /** ゲーム状態 */
    public get state(): DeepReadonly<GameState> {
        return this.#state;
    }

    /**
     * 実績の解除状態をチェックします。
     */
    private checkAchievements(): void {
        let achievementUnlocked = false;
        this.achievements.forEach((achievement) => {
            if (
                !this.#state.achievements.includes(achievement.id) &&
                achievement.condition(this.viewState.value as ExtendedGameState)
            ) {
                this.#state.achievements.push(achievement.id);
                achievementUnlocked = true;

                this.dispatchEvent(
                    new CustomEvent("achievementUnlocked", {
                        detail: {
                            achievementId: achievement.id,
                            achievementName: achievement.name,
                        },
                    }),
                );
            }
        });

        if (achievementUnlocked) {
            this.saveGame();
        }
    }

    /**
     * ゲーム状態を localStorage に保存します。
     */
    public saveGame(): void {
        localStorage.setItem(
            this.saveKey,
            JSON.stringify({
                ...this.#state,
                currencies: Object.fromEntries(
                    Object.entries(this.#state.currencies).map(([key, value]) => [
                        key,
                        Math.round(value * 10000) / 10000,
                    ]),
                ),
                totalCurrencies: Object.fromEntries(
                    Object.entries(this.#state.totalCurrencies).map(([key, value]) => [
                        key,
                        Math.round(value * 10000) / 10000,
                    ]),
                ),
            } satisfies GameState),
        );
    }

    /**
     * localStorage からゲーム状態を読み込みます。
     */
    public loadGame(): void {
        const saveDataStr = localStorage.getItem(this.saveKey);
        if (!saveDataStr) return;
        const saveData: GameState = JSON.parse(saveDataStr);

        this.#state.currencies = saveData.currencies;
        this.#state.totalCurrencies = saveData.totalCurrencies;
        this.#state.producers = saveData.producers;
        this.#state.upgrades = saveData.upgrades;
        this.#state.achievements = saveData.achievements;
    }

    /**
     * セーブデータを削除します。
     */
    public resetGame(): void {
        this.dispose();
        localStorage.removeItem(this.saveKey);
    }

    /**
     * このゲームインスタンスを破棄します。
     */
    public dispose(): void {
        this.saveGame();
        clearInterval(this.#interval);
    }
}

export type {
    CurrencyType,
    Price,
    IProducer,
    IProducerData,
    IUpgrade,
    IUpgradeData,
    IAchievement,
    GameState,
    ExtendedGameState,
} from "./types";

export { formatNumber } from "./utils/formatters";
