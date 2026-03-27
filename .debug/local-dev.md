## 运行上下文
- OS: Windows (PowerShell)
- Repo: `E:\Development\mcp-congress_gov_server`

## 配置来源与优先级
**优先级**：Defaults < `config.local.json`（可选） < Environment Variables

### 推荐本地配置方式
- **`.env`**：只放敏感信息（API key），参考 `.env.example`
- **`config.local.json`**：本地部署/服务管理器友好（已被 `.gitignore` 忽略）
- 自定义 JSON 路径：`CONGRESS_GOV_CONFIG_PATH=./path/to/config.json`

## api.data.gov / Congress.gov 关键行为
- API key 传递方式（可配置）：
  - `query`：`api_key=...`
  - `header`：`X-Api-Key: ...`（可自定义 header 名）
  - `basic`：HTTP Basic Auth username=api key（空密码）
- 上游限流头（若返回）：`X-RateLimit-Limit` / `X-RateLimit-Remaining`
- 标准网关错误码（响应体可能包含 `error.code`）：
  - `API_KEY_MISSING` / `API_KEY_INVALID` / `API_KEY_DISABLED` / `API_KEY_UNAUTHORIZED` / `API_KEY_UNVERIFIED`
  - `OVER_RATE_LIMIT`

## MCP 使用与检索策略（给大模型的提示）
- **强制两步工作流**：
  1) `congress_search` 找实体并抽取 ID/路径参数
  2) `congress_getSubResource` 用真实 `parentUri` 拉 actions/text/cosponsors 等
- 遇到 403/429：
  - 优先查看错误里是否带 `gatewayCode`（例如 `API_KEY_INVALID` / `OVER_RATE_LIMIT`）
  - 有 rate limit snapshot 时，用 remaining 规划分页/重试

## Checkfix（本仓库验证规则）
每次改动后至少跑：
```powershell
npm run lint
npm run build
```

## 已知修复/决策记录
- ESLint 升级到 v10 后使用 `eslint.config.js`（flat config）
- `.prettierrc.json` 需为合法 JSON（避免 BOM/解析失败）
