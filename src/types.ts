/** ゲーム内に登場するすべての通貨 */
export type CurrencyType = string;

/** 通貨とその量を表す汎用型 */
export type Price = {
    currency: CurrencyType;
    amount: number;
};

/** 生産ラインのマスターデータ */
export interface IProducer {
    id: string;
    name: string;
    description: string;

    /** 自動で生産ラインのクロックが進むかどうか */
    auto: boolean;

    /** この生産ラインがレベル1の時に、毎秒生産できる通貨の量 */
    baseProduction: Price[];
}

/** 生産ラインの動的データ */
export interface IProducerData {
    /** 生産ラインが解放されたかどうか */
    unlocked: boolean;
}

/** アップグレードのマスターデータ */
export interface IUpgrade {
    id: string;
    name: string;
    description: string;

    /** このアップグレードのレベル1で effect に含まれた生産ラインを解放するかどうか */
    withUnlock: boolean;

    /** アップグレードの効果（生産量を2倍にする、など） */
    effect: {
        /** 生産ライン ID */
        producerId: string;
        type: "multiplier" | "additive";
        value: number;
    }[];

    /** 購入に必要な初期コスト */
    baseCost: Price[];

    /** 1つ購入するごとに、次の購入コストが何倍になるか */
    costMultiplier: number;

    /** このアップグレードを最大何回まで購入できるか */
    maxLevel: number;
}

/** アップグレードの動的データ */
export interface IUpgradeData {
    /** アップグレードの購入回数（レベル） */
    level: number;
}

/** 実績のマスターデータ */
export interface IAchievement {
    id: string;
    name: string;
    description: string;
    condition: (state: ExtendedGameState) => boolean;
}

/** ゲームの進行状況 */
export interface GameState {
    /** 各通貨の現在の所持量 */
    currencies: Record<CurrencyType, number>;
    /** 各通貨の総生産量 */
    totalCurrencies: Record<CurrencyType, number>;

    /** 各生産ラインの所有状況 */
    producers: Record<string, IProducerData>;
    /** 購入済みのアップグレード */
    upgrades: Record<string, IUpgradeData>;

    /** 達成した実績 */
    achievements: string[];
}

/** UI表示用の拡張されたゲームの進行状況 */
export interface ExtendedGameState extends Omit<GameState, "achievements"> {
    /** 現在保有している通貨の、フォーマット済み文字列 */
    currenciesText: Record<CurrencyType, string>;
    /** 総生産通貨の、フォーマット済み文字列 */
    totalCurrenciesText: Record<CurrencyType, string>;
    /** 毎秒の生産量の、フォーマット済み文字列 */
    productionPerSecondText: Record<CurrencyType, string>;
    /** 生産ラインごとの毎秒の生産量の、フォーマット済み文字列 */
    productionPerSecondPerProducerText: Record<string, Record<CurrencyType, string>>;

    /** 実績 */
    achievements: (IAchievement & {
        unlocked: boolean;
    })[];
}
