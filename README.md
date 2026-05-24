# Simulatte MCP Server

Run any of Simulatte's 26 SKUs from Claude, Cursor, Zed, or any MCP-compatible AI client. Get results back as structured JSON. No new UI to learn.

```
User: "Test this sleep coaching concept on 50 stressed parents."
Claude: [calls simulatte_estimate_cost] → 150 credits (~$1.80). Approve?
User: "yes"
Claude: [calls simulatte_run_study] → Results in 4 minutes.
```

---

## Installation

**One-off (no install):**
```bash
SIMULATTE_API_KEY=sim_live_your_key npx @simulatte-io/mcp-server
```

**Global install:**
```bash
npm install -g @simulatte-io/mcp-server
SIMULATTE_API_KEY=sim_live_your_key simulatte-mcp
```

---

## Get an API key

1. Go to [app.simulatte.io/settings/api-keys](https://app.simulatte.io/settings/api-keys)
2. Create a key — starts with `sim_live_`
3. Set it as `SIMULATTE_API_KEY` in your environment or MCP client config

---

## Claude Desktop setup

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "simulatte": {
      "command": "npx",
      "args": ["-y", "@simulatte-io/mcp-server"],
      "env": {
        "SIMULATTE_API_KEY": "sim_live_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. Simulatte tools appear automatically.

---

## Cursor setup

Edit `~/.cursor/mcp.json` (or your project's `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "simulatte": {
      "command": "npx",
      "args": ["-y", "@simulatte-io/mcp-server"],
      "env": {
        "SIMULATTE_API_KEY": "sim_live_your_key_here"
      }
    }
  }
}
```

---

## Zed setup

In `~/.config/zed/settings.json`, add:

```json
{
  "context_servers": {
    "simulatte": {
      "command": {
        "path": "npx",
        "args": ["-y", "@simulatte-io/mcp-server"],
        "env": {
          "SIMULATTE_API_KEY": "sim_live_your_key_here"
        }
      }
    }
  }
}
```

---

## Available tools

| Tool | What it does |
|------|-------------|
| `simulatte_run_study` | Run any of 26 research SKUs — concept testing, pricing, messaging, B2B committee, and more |
| `simulatte_get_results` | Retrieve full structured results for a completed study |
| `simulatte_ask_insights` | Ask a natural-language question across your entire study history |
| `simulatte_list_pools` | List all synthetic persona pools in your workspace |
| `simulatte_create_pool` | Create a new persona pool with custom demographic/psychographic specs |
| `simulatte_depth_interview` | Run a multi-turn simulated depth interview with a synthetic persona |
| `simulatte_estimate_cost` | Get a credit + USD cost estimate before running a study (local — no API call) |

### SKUs supported by `simulatte_run_study`

concept-viability · claim-credibility · brand-identity-test · message-resonance · price-sensitivity · feature-priority · ad-copy · b2b-committee · conjoint · iris-pulse · card-sort · open-end · ab-backlog · polarization-stress-test · name-test · founder-positioning · ad-concept-resonance · depth-interview · custom-study · iat · counterfactual-positioning · personalization-sensitivity · regulated-claim-preflight · volume-forecast · brand-tracker · creative-audit

---

## Example prompts

**Concept test:**
> "I have a new sleep coaching app concept. Test it on 50 stressed parent personas and tell me if it'll land."

**Pricing sensitivity:**
> "Run a price sensitivity study on my premium plan ($99/mo) against 100 millennial professionals. Use pool_abc123."

**Cross-study synthesis:**
> "What are the most common objections across all of our B2B studies this quarter?"

**Depth interview:**
> "Conduct a depth interview with a skeptical 35-year-old UK parent about our onboarding flow. 15 turns."

---

## Authentication

### Preferred: per-customer API key

Send your `sim_live_*` key in either of these headers — both are accepted:

```
x-api-key: sim_live_your_key_here
# or
Authorization: Bearer sim_live_your_key_here
```

### Deprecated: shared platform key

The shared key `forge-prod-2026` (used in internal integrations before v0.4) is
deprecated and **will be removed at v0.5**. If your integration sends
`x-api-key: forge-prod-2026`, migrate to a `sim_live_*` per-customer key now.
The worker logs a deprecation warning on every request that uses the shared key.

---

## Response headers

Every successful `/v1/forge/*` and `/v1/iris/*` response includes these headers:

| Header | Description |
|--------|-------------|
| `X-Simulatte-Credits-Used` | Credits charged for this request |
| `X-Simulatte-Credits-Remaining` | Workspace credit balance after this charge |
| `X-Simulatte-Spend-Warning` | Present only when your key has consumed ≥ 80% of its spend cap. Value: `"85%-of-cap-consumed"` (percentage varies). |

### Sample curl showing all headers

```bash
curl -X POST https://forge-worker-production.up.railway.app/v1/forge/concept-viability \
  -H "x-api-key: sim_live_your_key" \
  -H "x-workspace-id: your-workspace-uuid" \
  -H "Content-Type: application/json" \
  -d '{"concept":"A sleep app for stressed parents","population_id":"default","sample_size":20}' \
  -i
```

Expected response headers (2xx):
```
HTTP/2 201
x-simulatte-credits-used: 28
x-simulatte-credits-remaining: 472
```

If your key is at 85% of its spend cap:
```
x-simulatte-spend-warning: 85%-of-cap-consumed
```

---

## Error reference

| Status | `error` field | Meaning |
|--------|--------------|---------|
| `401` | `invalid_api_key` | Key not found, revoked, or expired |
| `401` | (message) | Bearer JWT invalid or expired |
| `402` | `key_spend_cap_exceeded` | Key has a spend cap and this request would exceed it. Body: `{"error":"key_spend_cap_exceeded","cap":500,"used":498,"would_charge":10}` |
| `429` | `rate_limited` | 60 req/min or 1000 req/hr limit hit. Check `Retry-After` header |
| `503` | `database_unavailable` | Worker DB not reachable — retry in 30s |

### Sample error bodies

**402 — spend cap exceeded:**
```json
{
  "detail": {
    "error": "key_spend_cap_exceeded",
    "cap": 500,
    "used": 498,
    "would_charge": 10
  }
}
```

**429 — rate limited:**
```json
{
  "detail": {
    "error": "rate_limited",
    "limit": "60/min",
    "retry_after_seconds": 42
  }
}
```
`Retry-After: 42` header is also present.

---

## Rate limits and quotas

Rate limits and credit caps are enforced per API key:

| Default limit | Value |
|---------------|-------|
| Per-minute | 60 req/min |
| Per-hour | 1,000 req/hr |

Spend caps are optional, set per-key by workspace admins. A key with no spend
cap has unlimited spend (bounded only by workspace credit balance).

See [app.simulatte.io/settings/billing](https://app.simulatte.io/settings/billing) for your current usage.

---

## Troubleshooting

**"Missing SIMULATTE_API_KEY"** — Make sure the `env` block in your MCP config contains your key. The key must start with `sim_live_`.

**Tool not appearing in Claude Desktop** — Restart Claude Desktop after editing `claude_desktop_config.json`. Check the MCP logs at `~/Library/Logs/Claude/mcp*.log`.

**`simulatte_get_results` returns `status: "running"`** — Studies take 2–8 minutes. Poll again in 30 seconds, or ask Claude to wait and retry.

**401 Unauthorized** — Your API key may be revoked or incorrect. Generate a new one at [app.simulatte.io/settings/api-keys](https://app.simulatte.io/settings/api-keys).

**429 Too Many Requests** — You've hit the rate limit for your tier. Upgrade at [app.simulatte.io/settings/billing](https://app.simulatte.io/settings/billing).

---

## Development

```bash
git clone https://github.com/Iqbalahmed7/simulatte-mcp-server
cd simulatte-mcp-server
npm install
npm run build    # compiles TypeScript → dist/
npm test         # runs vitest test suite
npm run dev      # runs directly via tsx (no build step)
```

---

## License

MIT — see [LICENSE](./LICENSE).
