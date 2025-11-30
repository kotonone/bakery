<div align="center">
<h1>🍞<br>bakery <small>v0.1</small></h1>
</div>

Vue 3 向けのクリッカーゲーム用 TypeScript ライブラリです。
生産ライン・アップグレード・実績・複数通貨・自動保存など、複雑なクリッカー系ゲームを迅速に作れるように設計されています。

> [!IMPORTANT]
> 2025年11月末現在、v0.2 を開発中です。
> **この変更は破壊的変更です**。そのため、v0.1 は**非推奨**です。

> [!IMPORTANT]
> このライブラリはまだ実験段階のものです。API や設計が頻繁に変更される場合があります。

## 使い方

```typescript
import { Clicker } from "@kotonone/bakery";

const clicker = new Clicker({
    currencies: {
        gold: { icon: "🥐", color: "#FFD700" },
    },
    producers: [
        /* IProducer 配列 */
    ],
    upgrades: [
        /* IUpgrade 配列 */
    ],
    achievements: [
        /* IAchievement 配列 */
    ],
    saveKey: "my-clicker-save",
});

// UI で利用するリアクティブな状態
const state = clicker.viewState;
```

## TODO

- テストケースの作成
- リファクタリング
- Vue リアクティブへの依存を解消する
- 実績検知タイミングの修正
- strictNullChecks の有効化
