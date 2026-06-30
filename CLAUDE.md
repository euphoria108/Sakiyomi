# CLAUDE.md

このファイルは、このリポジトリのコードで作業するときに Claude Code (claude.ai/code) に指針を提供します。

## プロジェクト概要

**Sakiyomi** は feedly ライクな個人用フィードリーダーアプリケーションです。ブログの RSS/Atom フィードをフォローすると、アプリ上でフォロー済みブログの記事を一覧できます。フォロー中のブログが更新されるとモバイルアプリでプッシュ通知を受け取れます。

## リポジトリ構成

pnpm workspaces によるモノレポ。

```
apps/mobile/        # Expo アプリ（Expo Router）
workers/api/        # Cloudflare Workers API（Hono）
packages/shared/    # 共有型定義（フロント・バックエンド共用）
```

## 技術スタック

| 領域 | 技術 |
|---|---|
| アプリ | Expo v56 + Expo Router v5（web / iOS / Android） |
| バックエンド | Cloudflare Workers + Hono |
| DB | Cloudflare D1（SQLite） |
| キャッシュ | Cloudflare KV |
| 状態管理 | TanStack Query |
| ホスティング | Cloudflare（GitHub Actions で自動デプロイ） |

## GitHub 開発ルール

- **デフォルトブランチは `develop`**: 開発の起点は `develop` ブランチ
- **feature ブランチ運用**: 作業は `develop` から feature ブランチを作成して行う
- **PR のマージ先は `develop`**: feature ブランチの PR は `develop` にマージする
- **main への直接コミット禁止**: `main` ブランチに直接コミットしない

## 開発セットアップ

```bash
pnpm install          # 依存関係インストール（ルートで実行）
```

### ローカル統合テスト（Docker・ホストを汚さない）

クラウド資源に触れず、ローカルで API + DB を起動・テストしてからデプロイする仕組み。詳細は [docs/local-dev.md](docs/local-dev.md)。

```bash
make up      # ローカル API を起動（http://localhost:8787、migrate+seed 自動）
make test    # デプロイ前ゲート: 統合テストを実行
make clean   # 依存・DB を含む全状態を破棄
```

### API（Cloudflare Workers）

```bash
pnpm dev:api                              # ローカル開発サーバー起動（wrangler dev）
pnpm -F @sakiyomi/api db:migrate:local    # D1 マイグレーション（ローカル）
pnpm -F @sakiyomi/api typecheck           # 型チェック
```

`wrangler.toml` の `database_id` と `kv_namespaces.id` は実際のリソース ID に書き換えること。
`JWT_SECRET` は `wrangler secret put JWT_SECRET` で設定する。

### モバイルアプリ（Expo）

```bash
pnpm dev:mobile                             # Expo 開発サーバー起動
pnpm -F @sakiyomi/mobile typecheck          # 型チェック
```

`EXPO_PUBLIC_API_URL` を `.env.local` に設定して API エンドポイントを指定する。

## アーキテクチャ

クリーンアーキテクチャを採用。依存関係は外側から内側へ（UI → UseCase → Domain）向かうように設計する。

- **Domain 層**: エンティティとビジネスルール。外部依存なし
- **UseCase 層**: アプリケーション固有のビジネスロジック。Domain 層にのみ依存
- **Interface 層**: リポジトリ実装、外部 API アダプター（`infrastructure/` ディレクトリ）
- **Presentation 層**: Expo コンポーネント、画面、状態管理

バックエンドの定期フィード同期は Cloudflare Cron Trigger（30 分毎）で `SyncUseCase` を実行する。
新記事があれば Expo Push Notification Service 経由でプッシュ通知を送信する。
