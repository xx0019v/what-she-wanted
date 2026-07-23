# 🚀 公開手順（HTTPS / iPhone Safari）

> この環境からは外部ホスト（GitHub/Netlify/Vercel/Cloudflare）へ到達できず（API応答 000）、
> 認証も不可のため、**私が直接公開URLを発行することはできませんでした**（実測済み）。
> 代わりに、**あなたの操作1つで即公開**できる形に全て整えてあります。base は相対パス（`./`）なので
> GitHub Pages のサブパスでも Netlify/Vercel のルートでも**そのまま動きます**。

---

## 方法A（最速・アカウント/CLI不要）: Netlify Drop
1. **`public-deploy/what-she-wanted-ar.zip`** を用意（`dist` を丸ごと圧縮済み）
2. https://app.netlify.com/drop を開く
3. zip（または `dist` フォルダ）を**ドラッグ&ドロップ**
4. 数十秒で **`https://<ランダム>.netlify.app`** が発行される → これが公開URL
5. スマホで開く：**`https://…netlify.app/open-on-phone.html`**（QRが出ます）
   - AR直接：`https://…netlify.app/`
   - デバッグ：`https://…netlify.app/?debug=1`

## 方法B（継続運用向き・自動デプロイ）: GitHub Pages
リポジトリに push すると **GitHub Actions が自動でビルド&公開**します（`.github/workflows/deploy-pages.yml` 同梱）。
```bash
cd WHAT_SHE_WANTED
git init && git add -A && git commit -m "WHAT SHE WANTED WebAR"
git branch -M main
git remote add origin https://github.com/<あなた>/<repo>.git
git push -u origin main
```
その後 GitHub の **Settings → Pages → Build and deployment → Source = “GitHub Actions”** を選択（初回のみ）。
数分で **`https://<あなた>.github.io/<repo>/`** が公開されます（Actionsログに `page_url` 表示）。
- 修正後は `git push` するだけで再デプロイ。
- ※ Node 20 でビルドされます（`npm ci` で `canvas` は prebuilt を取得、ビルド不要）。

## QRコード
- 公開URLで **`/open-on-phone.html`** を開けば、QR表示＋PNG/SVGダウンロードができます（設定不要・自動でURL認識）。
- 静的ファイルが欲しい場合：`node public-deploy/make-qr.mjs https://<公開URL>/`
  → `public-deploy/what-she-wanted-ar-qr.png` / `.svg`

---

## 公開後の確認（curlで200を確認）
```bash
U=https://<あなたの公開URL>
for p in "" index.html targets/forest-page.mind pages/4.webp manifest.webmanifest sw.js open-on-phone.html; do
  echo "$p -> $(curl -s -o /dev/null -w '%{http_code}' $U/$p)"
done
```
すべて 200 なら配信OK。あとは iPhone Safari で実機カメラ確認だけです。

## キャッシュ更新（古い版が出るとき）
- Service Worker は**ドキュメントをネットワーク優先**にしてあるため、再デプロイは基本自動反映されます。
- それでも古い場合：`?debug=1` を開き **「CLEAR CACHE & RELOAD」**。または Safari で「履歴と Web サイトデータを消去」。
- デバッグ画面の **BUILD** 表示で、最新ビルドか確認できます。

## 再デプロイの最短
- Netlify Drop：`npm run build` → 新しい `dist` を再度ドラッグ（または `zip -r what-she-wanted-ar.zip dist`）
- GitHub Pages：`git commit -am "fix" && git push`（Actionsが自動再公開）
