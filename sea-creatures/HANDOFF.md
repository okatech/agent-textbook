# おさかなを英語で発音練習 — 設計書・引き継ぎ資料・作業手順書

このファイルは、次にこのアプリの作業を担当する人（AI を含む）が、これだけ読めば
**アプリの中身・設計の考え方・これまでの経緯・次にやる作業**がわかるように書いたものです。

- 公開URL：https://okatech.github.io/agent-textbook/sea-creatures/
- リポジトリ：`okatech/agent-textbook`（このアプリは `sea-creatures/` フォルダ）
- 制作：アーヒスタ制作（オーナーは非エンジニア。成果物を自分で理解したいので、説明は日本語でていねいに）

---

## 1. アプリの概要

| 項目 | 内容 |
|---|---|
| 目的 | 海の生き物12種類の**英語の発音（アメリカ英語）**を、日本人が正しく聞いて覚える |
| 主な利用者 | 日本人の学習者。**iPhone（Safari）と Android（Chrome）**が最優先 |
| 画面の言語 | 日本語（英単語と発音記号だけ英語） |
| 元にした素材 | オーナーが用意した12枚のカード画像（1枚の画像から切り出し） |

### 生き物12種類

shark（サメ）／dolphin（イルカ）／penguin（ペンギン）／sea turtle（ウミガメ）／ray（エイ）／
jellyfish（クラゲ）／hammerhead shark（シュモクザメ）／orca（シャチ）／mackerel（サバ）／
clownfish（カクレクマノミ）／sardine（イワシ）／bonito（カツオ）

---

## 2. 現在の機能（これで全部）

1. **カードをタップ → その生き物の英語を読み上げる**（アメリカ英語）
2. **声の切り替え：「👩 女性の声」「👨 男性の声」**（押しても音は鳴らない。設定が変わるだけ）
3. **「詳しく見る」→ 詳細画面**
   - 発音記号（IPA）、音節の区切り、強く読むところ（赤い下線）
   - 「🔊 聞く」ボタン（押したときだけ音が鳴る）
   - 💡 発音のコツ（日本人が間違えやすい点）
   - 🐠 おもしろ豆知識
   - 「閉じる」（背景タップ・Esc でも閉じる）
4. **⚠️ 注意表示**（必要なときだけ表示。例：男性の声がない端末、LINE などのアプリ内ブラウザ）
5. 声の設定は端末に保存され、次回も同じ設定で開く
6. スマホのホーム画面に追加できる（アイコン・名前つき）

### 意図的に「やらない」こと（オーナーの判断で削除済み）

| 削除した機能 | 理由 |
|---|---|
| アクセントの選択（米・英・豪・印） | 端末の読み上げ機能が指定を無視することがあり、正しく切り替わる保証ができなかった |
| 速さの選択（ゆっくり／ふつう） | 同上。オーナーの端末で「全然変わらない」と確認された |
| 声を切り替えたときの試し再生 | 「ボタンを押したらサメの声が鳴る」＝ボタンに書いていない動きでバグに見えた |
| 詳細画面を開いたときの自動再生 | 同上。音は「🔊 聞く」を押したときだけ |

> **注意：これらを勝手に復活させないこと。** 復活させる場合は、下の「8. 次の作業」で
> 音声ファイル方式に切り替えて、確実に動くことを確認してから、オーナーに確認する。

---

## 3. 設計の考え方（守ってほしいルール）

1. **ボタンは書いてあることだけをする。** 余計な音・動きを付けない（過去にこれでバグ報告が出た）。
2. **シンプル第一。** 機能を足すより、確実に動くことを優先。迷ったら削る。
3. **iPhone Safari・Android Chrome で確実に動くこと**を最優先に考える。
4. **正直に表示する。** 代わりの方法で再生するときは ⚠️ で伝える。できないことを「できる」と言わない。
5. **発音の正確さが最重要。** 発音記号は辞書（Cambridge／Merriam-Webster のアメリカ英語）に合わせる。
6. 見た目の統一：ボタンはすべて**丸いピル型・高さ44px以上**、青（`--accent`）が基本色。

---

## 4. ファイル構成

```
sea-creatures/
├── index.html        … アプリ本体（HTML・CSS・JavaScript が1ファイルに入っている）
├── img/              … 生き物の画像 12枚（360×360、白背景、ファイル名 = id）
├── icon-180/192/512.png … ホーム画面用アイコン（カクレクマノミ）
├── manifest.json     … ホーム画面に追加したときの名前・アイコンの設定
└── HANDOFF.md        … この資料
```

サイト全体は Jekyll（GitHub Pages）で公開されている。`sea-creatures/` 内の HTML は Jekyll では加工されず、そのまま公開される。

---

## 5. コードの解説（`index.html`）

### 5-1. 生き物データ（`CREATURES`）

生き物の情報はすべてこの配列にまとまっている。**内容を直すときはここだけ直せばよい。**

```js
const CREATURES = [
  { id: "sardine",            // 画像ファイル名（img/sardine.png）にも使う
    word: "sardine",          // 読み上げる英語
    ja: "イワシ",
    ipa: "/sɑːrˈdiːn/",       // アメリカ英語の発音記号
    syl: ["sar", "dine"],     // 音節の区切り（表示用）
    stress: [1],              // 強く読む音節の番号（0始まり）→ 赤い下線
    tip: "…",                 // 💡 発音のコツ（HTMLの <b> 可）
    fun: "…" },               // 🐠 おもしろ豆知識（HTMLの <b> 可）
  ...
];
```

> ⚠️ 文字列の中で半角の `"` を使うとプログラムが壊れる（実際に一度起きた）。
> 英語の引用は全角の `“ ”` を使うこと。

### 5-2. 音声の仕組み（現在：端末の読み上げ機能）

ブラウザの **Web Speech API（`speechSynthesis`）** を使い、端末に入っている英語の声で読ませている。

- `loadVoices()`：端末の声の一覧から **アメリカ英語（en-US）だけ**を集め、自然に聞こえる順に並べる
- `voiceScore()`：声の名前で順位付け（Natural/Enhanced/Google などを優先、効果音のような声は除外）
- `genderOf()`：**声の名前から男女を判定**（ブラウザは性別を教えてくれないため。例：Samantha=女性、Aaron=男性）
- `pickVoice()`：選んだ性別の一番良い声を返す。男性の声がない端末では、声の高さ（pitch 0.8）で男性らしくする
- `speak()`：読み上げる。スマホ特有の不具合対策を含む
  - 再生中の音声を変数 `current` で保持（Chrome で終了通知が消える問題の対策）
  - 6秒で「再生中」表示を必ず消す（Android で終了通知が来ない問題の対策）
  - 再生中に次を押したときは少し待ってから再生（止めた直後の再生が無視される端末の対策）
- `showNote()`：⚠️ 表示を1か所で管理（アプリ内ブラウザ／声がない／男性の声がない）

**この方式の限界（重要）**：音は**端末次第**。速さ・アクセントの指定は端末によって無視される。
男女の声も、端末に入っている声によって変わる。→ だから「8. 次の作業」で**音声ファイル方式**に切り替える予定。

### 5-3. 画面まわり

- `renderGrid()`：12枚のカードと「詳しく見る」ボタンを作る
- `openDetail(c)`：詳細画面（`<dialog>`）を作って開く。開いたときは**音を鳴らさない**。必ず一番上から表示
- 声の設定は `localStorage` のキー `seaPron` に `{"gender":"female"}` の形で保存（壊れた値は無視）
- スマホ対策：ダブルタップ拡大の防止（`touch-action`）、画像長押しメニューの防止、詳細表示中は背景スクロール停止、別アプリに切り替えたら読み上げ停止
- ダークモード対応：色はすべて `:root` の変数（`--accent` など）で管理

---

## 6. 公開（デプロイ）の仕組み

1. 作業用ブランチで変更してコミット・プッシュ
2. GitHub でプルリクエストを作り、`main` に取り込む
3. `main` への取り込みで **GitHub Actions（`.github/workflows/pages.yml`）が自動で Jekyll をビルドして公開**（約1分）
4. Actions の結果が success になったら、公開URLで確認（古い画面なら再読み込み）

> 過去の失敗：`Gemfile` の `github-pages` が古い版に解決されてビルドが失敗したため、
> **Jekyll 4.3 を直接指定する形に変更済み**。`Gemfile` を元に戻さないこと。

---

## 7. 確認（テスト）のやり方

作業環境のブラウザには本物の読み上げ音声がないため、**`speechSynthesis` を偽物（モック）に差し替えて**、
「どの単語を・どの声で・どの高さで読ませたか」を記録して確認している（Playwright を使用）。

最低限チェックすること（前回は24項目すべて合格）：

- 男女ボタン・「詳しく見る」を押しても**音が鳴らない**
- 12枚のカードがそれぞれ**正しい単語**を読む
- 女性／男性で**違う声**が選ばれる
- 「🔊 聞く」でその単語だけ鳴る／閉じる・背景タップ・Esc で閉じる
- 幅 320／375／390／412px で**横にはみ出さない**、詳細画面のタイトルが切れない
- ダークモードで文字が読める／LINE 内ブラウザで ⚠️ 案内が出る
- 壊れた保存値でもエラーにならない

**限界**：この方法では「実際の音が正しいか」は確認できない。音の確認は実機で行う必要がある。

---

## 8. 次の作業：Azure の音声で「音声ファイル方式」に切り替える（作業手順書）

### 目的

端末の読み上げ機能に頼るのをやめ、**Microsoft Azure の高品質な音声で発音を1回だけ作って、音声ファイルとしてアプリに入れる**。
これで、**どのスマホでも同じ正しい発音・確実な男女の声**になる。

- 作るのは**発音だけ**：12語 × 女性・男性 = **24個の MP3**
- API キーは**公開ページに入れない**（誰でも見られて悪用されるため）。作業環境で1回だけ使う

### 8-1. オーナーがやること（人の作業）

1. **Azure で音声サービスを作る**
   1. Azure ポータル（https://portal.azure.com）→「リソースの作成」→「Speech（音声サービス）」
   2. 価格レベルは **Free（F0）** でよい（毎月50万文字まで無料。今回は数百文字）
   3. 作成後、「キーとエンドポイント」で **キー** と **リージョン**（例：`japaneast`）を確認
2. **Claude Code の作業環境の設定を変える**（セッションのタイトル部分のクラウド環境メニュー →「編集」）
   - **Network access → Allowed domains** に次の2つを追加（リージョンが違う場合は `japaneast` を置き換える）
     - `japaneast.tts.speech.microsoft.com`（音声を作る）
     - `japaneast.stt.speech.microsoft.com`（作った音声を聞き取って確認する）
     - 「Allow package managers」のチェックは付けたまま
   - **Network secrets**（古いアプリでは「API credentials」、なければ環境変数）に保存
     - `AZURE_SPEECH_KEY` … キー
     - `AZURE_SPEECH_REGION` … リージョン名（例：`japaneast`）
   - 参考：https://code.claude.com/docs/en/cloud-environments#network-access
3. **新しいセッションを始めて、AI に依頼する**（下の「9. AI への依頼文」を貼る）
   - ⚠️ キーは**チャットに貼らない**こと

### 8-2. AI がやること（作業の手順）

**ステップ1：接続の確認**
- 環境変数 `AZURE_SPEECH_KEY`・`AZURE_SPEECH_REGION` があるか確認（値は表示しない）
- `https://{region}.tts.speech.microsoft.com/cognitiveservices/voices/list` に接続できるか確認

**ステップ2：声を選ぶ**
- 女性：`en-US-AvaNeural`、男性：`en-US-AndrewNeural`（どちらも自然なアメリカ英語）
- 声の一覧（上のURL）で存在を確認。なければ `en-US-JennyNeural`／`en-US-GuyNeural` を使う

**ステップ3：24個の MP3 を作る**（下のスクリプト例）
- 保存先：`sea-creatures/audio/{id}-female.mp3`、`sea-creatures/audio/{id}-male.mp3`
- 形式：`audio-24khz-48kbitrate-mono-mp3`（小さくて十分きれい）

```python
# make_audio.py — Azure の音声合成で 24 個の MP3 を作る（標準ライブラリのみ）
import os, re, urllib.request, pathlib

KEY = os.environ["AZURE_SPEECH_KEY"]
REGION = os.environ["AZURE_SPEECH_REGION"]
URL = f"https://{REGION}.tts.speech.microsoft.com/cognitiveservices/v1"
VOICES = {"female": "en-US-AvaNeural", "male": "en-US-AndrewNeural"}

# index.html の CREATURES から id と word を取り出す
html = pathlib.Path("sea-creatures/index.html").read_text(encoding="utf-8")
items = re.findall(r'id: "([a-z-]+)", word: "([^"]+)"', html)
assert len(items) == 12, items

out = pathlib.Path("sea-creatures/audio"); out.mkdir(exist_ok=True)
for cid, word in items:
    for gender, voice in VOICES.items():
        ssml = (f"<speak version='1.0' xml:lang='en-US'>"
                f"<voice name='{voice}'>{word}</voice></speak>")
        req = urllib.request.Request(URL, data=ssml.encode("utf-8"), headers={
            "Ocp-Apim-Subscription-Key": KEY,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
            "User-Agent": "sea-creatures-pronunciation",
        })
        with urllib.request.urlopen(req) as r:
            (out / f"{cid}-{gender}.mp3").write_bytes(r.read())
        print("ok", cid, gender)
```

> 発音が辞書と違うと判断した単語だけ、SSML で発音記号を指定できる：
> `<phoneme alphabet="ipa" ph="sɑːrˈdiːn">sardine</phoneme>`
> （まずは指定なしで作り、ステップ4で問題があった単語だけ使う）

**ステップ4：作った音声を確認する**（実際の音は聞けないので、機械で確かめる）
- 24個すべて存在し、0.3〜3秒程度の長さであること（`ffprobe` で確認できる）
- 女性と男性のファイルが**別物**であること（中身が同一でない）
- **Azure の音声認識で聞き取らせて、正しい単語に聞こえるか確認する**（同じキーで使える）
  - `POST https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`
  - ヘッダー：`Ocp-Apim-Subscription-Key`、`Content-Type: audio/wav; codecs=audio/pcm; samplerate=16000`
  - MP3 は `ffmpeg -i x.mp3 -ar 16000 -ac 1 x.wav` で WAV に変換してから送る
  - 結果の `DisplayText` が単語と一致するか（大文字・句読点は無視）を24個すべて確認
- 結果を表にしてオーナーに報告（できれば代表の数個をオーナーに送って実際に聞いてもらう）

**ステップ5：アプリを音声ファイル方式に書き換える**
- `speechSynthesis` 関連（`loadVoices`／`voiceScore`／`genderOf`／`pickVoice`／声の一覧の取得など）を**削除**
- 代わりに音声ファイルを鳴らすだけにする：

```js
const player = new Audio();
function speak(creature, cardEl) {
  player.pause();
  player.src = `audio/${creature.id}-${state.gender}.mp3`;
  player.currentTime = 0;
  document.querySelectorAll(".card.playing").forEach(c => c.classList.remove("playing"));
  if (cardEl) {
    cardEl.classList.add("playing");
    const done = () => cardEl.classList.remove("playing");
    player.onended = player.onerror = done; // onpause は使わない（前の音を止めた通知で新しい表示が消えるため）
  }
  player.play().catch(() => {}); // タップの中で呼ぶので iPhone でも再生できる
}
```

- ⚠️ 注意表示は「アプリ内ブラウザ」だけ残し、声に関する ⚠️ は削除（もう不要）
- ページ下の説明文を「音声は Microsoft Azure の合成音声です。どの端末でも同じ発音で再生されます。」に変更
- iPhone の「拡張・プレミアムの声をダウンロード」の案内は削除（もう不要）
- この HANDOFF.md の「5-2」と「2」を新しい仕組みに合わせて更新

**ステップ6：テストと公開**
- 「7. 確認」の項目を音声ファイル方式に合わせて実施（`Audio` の再生先URLが正しいか、男女で別ファイルか等）
- iPhone SE／iPhone 13／Android（Pixel 7）の画面幅で表示確認
- 「6. 公開」の手順で公開し、Actions が success になったら URL をオーナーに伝える

### 8-3. 完了の条件

- [ ] 24個の MP3 が `sea-creatures/audio/` にあり、音声認識で全て正しい単語と確認できた
- [ ] アプリが音声ファイルで再生し、男女で別の声になる
- [ ] ボタンは書いてあることだけをする（男女ボタン・詳しく見るでは音が鳴らない）
- [ ] API キーがリポジトリ・公開ページ・チャットのどこにも含まれていない
- [ ] 公開済みで、オーナーが実機で確認できる状態

---

## 9. AI への依頼文（新しいセッションにそのまま貼る）

```
okatech/agent-textbook の sea-creatures/HANDOFF.md を最初に全部読んでください。
その「8. 次の作業」の手順どおりに、Azure の音声で発音の音声ファイル（12語×女性・男性=24個）を作り、
音声認識で全部正しいか確認してから、アプリを音声ファイル方式に切り替えて公開してください。
環境変数 AZURE_SPEECH_KEY と AZURE_SPEECH_REGION は設定済みです（値は表示しないでください）。
「3. 設計の考え方」のルールを必ず守ってください。説明は日本語で、非エンジニアにもわかるようにお願いします。
作業が終わったら、確認結果と公開URLを教えてください。
```

---

## 10. これまでの経緯（要点）

| 時期 | 内容 |
|---|---|
| 最初 | 端末の読み上げ機能で発音するアプリを作成。米/英アクセント・ゆっくり/ふつう付き |
| 公開 | GitHub Pages で公開。ビルド失敗 → Gemfile を Jekyll 4 に固定して解決 |
| 改善 | アプリ名「おさかなを英語で発音練習」・アーヒスタ制作、男女の声、画像の高画質化、豪・印アクセント追加 |
| 問題 | オーナーの端末で「アクセントも速さも全然変わらない」→ 端末が指定を無視していると判断 |
| 整理 | アクセント・速さを削除し、アメリカ英語・男女の声だけに。iPhone/Android 向けに最適化 |
| 追加 | 各生き物の「おもしろ豆知識」、発音記号を辞書と照合 |
| レビュー | 3つの観点（ユーザー目線のバグ探し／クリエイティブディレクター／シンプルさ・正確さの監査）で総点検し、「男女ボタンでサメが鳴る」などを修正 |
| 次 | Azure の音声で音声ファイル方式に切り替え（この資料の 8 章） |
