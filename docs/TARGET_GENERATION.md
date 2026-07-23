# MindAR ターゲット生成の記録（forest-page.mind）

今回の認識ターゲットは **この環境内で完全オフライン生成** しました（外部Webツール不要）。

## 使用した元画像
- `public/pages/4.jpg`（= `4.jpg`、月夜の森。SCENE 04）
- コンパイル用に `public/targets/forest-page-source.jpg` として同一内容を保存

## 生成物
- `public/targets/forest-page.mind`（668 KB）
- 検証：1 target / 1024×576 / matching 9 scales / tracking 2 scales / 特徴点 108

## 生成コマンド
```bash
# 1) 元画像を 1024x576 のRGBAへ（スケール不変なのでトラッキングに十分・高速）
python3 scripts/make-assets.py    # WebP等も生成（任意）
# 実際の生成に使ったのは以下（PILでRGBA化 → Nodeでコンパイル）:
python3 - <<'PY'
from PIL import Image
im = Image.open('public/pages/4.jpg').convert('RGB')
im.resize((1024,576), Image.LANCZOS).convert('RGBA').tobytes()  # → p4.rgba
PY
node scripts/compile-target.mjs <p4.rgba> public/targets/forest-page.mind 1024 576
```

## 仕組み（なぜ node-canvas 不要でできたか）
MindAR の `OfflineCompiler` は画像を canvas 経由でグレースケール化してから特徴抽出します。
`canvas`（node-canvas）はネイティブビルドが必要で本環境では入りませんでしたが、
**コンパイラが必要とするのは drawImage → getImageData の受け渡しだけ**なので、
純JSの薄いシム（`node_modules/canvas/index.js` を置換）で代替し、
特徴抽出は `@tensorflow/tfjs` の CPU バックエンドで実行しました（1枚 約8.5秒）。

## 別ページ／複数ページを作るには
```bash
# 単一ページ（例: page 5 を第2候補ターゲットに）
python3 - <<'PY'
from PIL import Image
Image.open('public/pages/5.jpg').convert('RGB').resize((1024,576)).convert('RGBA').tobytes()
PY
node scripts/compile-target.mjs <p5.rgba> public/targets/forest-page-5.mind 1024 576
```
複数ターゲットを1ファイルにまとめる場合は `compileImageTargets([img1,img2,...])` に
複数渡すよう `scripts/compile-target.mjs` を拡張してください（順番＝認識index）。

## 参考：公式Webツール（フォールバック）
生成がうまくいかない場合の代替として、ブラウザだけで作れる公式ツールもあります：
https://hiukim.github.io/mind-ar-js-doc/tools/compile （画像を入れて Start → Download）
