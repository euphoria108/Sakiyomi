# ローカル開発・テスト（ホストを汚さない Docker 分離）

Cloudflare のクラウド資源（実 D1 / KV / Workers）に一切触れず、**ローカルで API + DB を起動・テストしてからデプロイ**するための仕組みです。
すべて Docker コンテナ内で完結し、ホストに必要なのは **Docker のみ**。状態（依存・DB）は named volume に隔離され、`make clean` で完全破棄できます。

## 前提

- Docker / Docker Compose v2（`docker compose`）
- （手動フロント確認をする場合のみ）Node.js 20+ と Expo

## 仕組み

`docker compose` が以下を起動します（`docker-compose.yml`）。

| サービス | 役割 |
|---|---|
| `api` | `wrangler dev`（Miniflare）。ローカル D1(SQLite) + KV をシミュレート。`:8787` で待受。起動時に migrate → seed を自動適用 |
| `feed-fixtures` | 固定 RSS を配信。`addFeed` の外部 fetch をオフライン化・決定的化 |
| `test`（profile: test） | `api` が healthy になってから統合テストを実行 |

- `wrangler dev` の起動・migrate・seed は `.docker/api-entrypoint.sh` が実施。
- ローカル秘密 `JWT_SECRET` は `workers/api/.dev.vars`（未存在なら `.dev.vars.example` から自動生成、gitignore 済み）。

## よく使うコマンド

```bash
make up      # API を起動（http://localhost:8787）。手動確認・フロント接続用
make test    # デプロイ前ゲート: 新規ローカル API に対し統合テストを実行（失敗で exit≠0）
make logs    # API ログを追う
make seed    # 起動中の DB にシードを再適用
make down    # 停止（DB 状態は保持）
make clean   # 停止し、依存・DB を含む全状態を破棄
make test-unit  # バックエンド単体テスト（サーバー不要）
```

ルート `package.json` にも同等の薄いラッパ（`pnpm docker:up` / `docker:test` / `docker:clean`）があります。

## デモ資格情報（シード）

| email | password |
|---|---|
| `demo@example.com` | `password123` |

シードには上記ユーザー、デモフィード 1 件、記事 3 件が含まれます（`workers/api/seed/seed.sql`）。

## 推奨フロー（テストしてからデプロイ）

1. 機能を実装。
2. `make test` でローカル統合テストがグリーンであることを確認。
3. `make up` + Expo（`apps/mobile/.env.local` に `EXPO_PUBLIC_API_URL=http://localhost:8787`）で手動確認。
4. `develop` へ PR → CI（`.github/workflows/test.yml`）が単体 + 統合テストを実行。
5. `main` へマージ → `deploy-api.yml` がテスト通過後にのみデプロイ。

## 手動でローカル API を叩く例

```bash
make up   # 別ターミナルで起動したまま
curl localhost:8787/health
curl -X POST localhost:8787/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"password123"}'
```

## トラブルシュート

- **状態をリセットしたい** → `make clean`（named volume を削除）。
- **依存が壊れた** → `make clean` 後に `make up`（コンテナ内で再インストール）。ホストの `node_modules` には影響しません。
- **ポート 8787 が使用中** → 既存の `wrangler dev` を停止するか、`docker-compose.yml` の `ports` を変更。
