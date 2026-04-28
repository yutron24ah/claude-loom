# claude-loom Coding Principles (must follow)

> 本ファイルは **claude-loom 全 developer / reviewer agent が必ず守るべき** コーディング原則の SSoT。
> 編集時は `docs/DOC_CONSISTENCY_CHECKLIST.md` の M0.9 セクションを通すこと。
> personality preset で friendly-mentor を使っとっても、**原則自体は曲げない**（伝え方のみ可変）。

---

## 設計層

### 1. SRP (Single Responsibility Principle)

1 つのモジュールには 1 つの責務しか持たせない。変更理由が複数あるならクラス/関数を割れ。

### 2. DRY (with AHA — Avoid Hasty Abstractions)

重複は悪、ただし **rule of three**：3 回目で抽象化、2 回目までは複製許容。早すぎる抽象化（premature abstraction）が一番有害。

### 3. YAGNI (You Aren't Gonna Need It)

使うとわかるまで書かない。想定機能 / 拡張ポイント / "あとで必要になるかも" を盛らない。

### 4. KISS (Keep It Simple, Stupid)

動く最小実装が最強。賢さは負債、読み手の認知コストを上げる。

### 5. Composition over Inheritance

継承ツリーよりオブジェクト合成。継承は強結合、合成は弱結合で柔軟。

### 6. Make illegal states unrepresentable

型で防げる不正状態は型でガードする。runtime check より compile-time / static check。

---

## プロセス層

### 7. TDD: Red → Green → Refactor

実装前に失敗テスト書く。最小実装で green、その後 refactor。`loom-tdd-cycle` skill と整合。

### 8. Test behavior, not implementation

内部関数名 / private / 実装詳細を test するな。**外から見える振る舞い** を test せよ。implementation 変更で test が壊れるなら test 設計が悪い。

### 9. Fail fast at boundaries

入口（user input / external API / file IO）で validate。内部関数間は信頼関係で動く（defensive copy 不要）。

### 10. No premature optimization

Knuth 御大いわく「premature optimization is the root of all evil」。benchmark / profiling 取ってから最適化、勘で書くな。

---

## コード品質層

### 11. Principle of Least Surprise

読み手が予想する通りに動け。賢さより予測可能性、convention より consistency。

### 12. Boy Scout Rule (scoped)

触ったファイルは綺麗にして去る。**ただし sprawl 禁止** — タスク外の refactor は別 PR で。

### 13. Comments: WHY > WHAT

コードは何をしてるか自分で語る。コメントは **なぜそうしたか**（hidden constraint / subtle invariant / workaround の根拠）だけ書く。

---

## 不変条件（reviewer も参照）

- **personality preset によらず原則は曲げない**（friendly-mentor でも違反は厳しく指摘）
- 全 reviewer agent はレビュー時にこの 13 原則 list を参照、違反検出を必須観点とする
- 原則同士の優先順位：プロセス層（TDD / fail fast / no premature opt）> 設計層 > コード品質層

---

## 参照

- 設計 SSoT: `docs/plans/specs/2026-04-29-m0.9-design.md` §6
- 整合性 check: `docs/DOC_CONSISTENCY_CHECKLIST.md`
- TDD 詳細: `skills/loom-tdd-cycle/SKILL.md`
