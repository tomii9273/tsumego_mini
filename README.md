# tsumego_mini

小路盤での囲碁パズルゲームの Web アプリです。  
https://tsumego-mini-239f0748ace2.herokuapp.com/

## データベース

最善手・スコアと初期盤面は、リポジトリ直下の読み取り専用SQLite DB `tsumego.db` に保存しています。Webアプリの実行に外部PostgreSQLや `DATABASE_URL` は必要ありません。

`tsumego.db` は、追跡済みの `data_3.json` と `filtered_init_boards.json` から次のコマンドで再生成できます。

```powershell
python build_tsumego_db.py
```

CSVを入力にする場合は、次のように指定します。CSVにはヘッダーがあってもなくても構いません。

```powershell
python build_tsumego_db.py --moves-source data_3.csv --boards-source filtered_init_boards.csv
```

生成処理は一時DBを完成させてから `tsumego.db` を置き換えるため、途中で失敗しても既存DBは維持されます。データを更新するときは、JSONまたはCSVを更新してDBを再生成し、両方をコミットしてください。

## 仮想環境について (暫定・自分用)

- 本番環境用: `requirements.txt`
  - このファイルは Heroku でデプロイ時に使われます。
- 開発環境 (`.venv`) 用: `requirements_dev.txt`
  - 本番環境のライブラリに加えて、分析用のものや linter, formatter が含まれます。

## プルリクエストについて

- 機能・コードに大幅な変更・拡張を加えるプルリクエストは、マージしない場合があります。

## 関連リンク

- 作成者 X (Twitter): https://x.com/Tomii9273
- Heroku 管理画面 (自分用): https://dashboard.heroku.com/apps/tsumego-mini
