# REA — what the TikTok Shop web client reports

Captured with a headless Chrome using our own logged-in profile while loading
`/vn` and `/vn/s?q=serum`. Raw bodies are stored locally under
`crawler/data/rea/tracking/`; values are not reproduced here.

## Tracking endpoints observed (74 requests)

| Endpoint | Hits | Purpose |
|---|---|---|
| `mcs-sg.tiktokv.com/v1/list` | 24 | Config/feature lists |
| `mon.tiktokv.com/monitor_browser/collect/batch/` | 11 | Browser telemetry batches |
| `mon.tiktokv.com/monitor_web/settings/browser-settings` | 8 | Telemetry settings |
| `sgali-mcs.byteoversea.com/list` | 8 | Config lists |
| `mon-va.byteoversea.com/monitor_browser/collect/batch/` | 4 | Telemetry batches |
| `mssdk-sg.tiktok.com/web/report` | 3 | Encrypted device/risk reports |
| `api-verification.tiktokshop.com/vc/setting` | 2 | Verification/risk settings |
| `api-verification.tiktokshop.com/api/v1/bs/setting` | 2 | Behaviour settings |
| `sgali-mcs.byteoversea.com/webid` | 2 | User/device identity |
| `libraweb-sg.tiktok.com/service/2/abtest_config/` | 2 | A/B test assignment |
| `api-verification.tiktokshop.com/captcha/get` | 1 | Captcha challenge fetch |
| `mssdk-sg.tiktok.com/mssdk/web_common` | 1 | Encrypted SDK report |

## Payload shapes

### Telemetry batch

```json
{
  "ev_type": "batch",
  "list": [
    {
      "common": { "bid": "...", "pid": "...", "view_id": "...", "user_id": "...", "device_id": "...", "session_id": "..." },
      "ev_type": "pageview",
      "payload": { "pid": "...", "source": "..." }
    }
  ]
}
```

Each batch in the sample carried 13 events. Event families include page views
and interaction events; every event carries the same identity block
(`user_id`, `device_id`, `session_id`, `view_id`).

### Identity beacon

`sgali-mcs.byteoversea.com/webid` sends `app_id`, `referer`, `url`,
`user_agent`, `user_unique_id` — a stable browser identity.

### Encrypted SDK report

`mssdk-sg.tiktok.com/web/report` and `/mssdk/web_common` send
`{magic, dataType, strData, tspFromClient, version}`. `strData` is ~4.5 KB of
opaque payload (dataType 8). It is not decoded here; it is protected content.

### Captcha / risk request

`api-verification.tiktokshop.com/captcha/get` carries `iid`, `did`,
`device_id`, `os_type=3`, `platform=h5`, `webdriver=false`, `h5_sdk_version`,
`aid=1988` and a `shark_log_id`. The `webdriver` flag is a direct automation
signal.

### Signatures

`mssdk` requests carry `msToken` and `X-Bogus` query parameters; these are
generated in-page by the client SDK and rotate per request.

## What this means for crawling

- The web client reports device/user/session identifiers and page events on
  every navigation, plus A/B assignments and risk settings.
- The risk layer sees `webdriver`, missing browser fingerprints and HTTP
  signatures. A plain Node `fetch` sends none of these, which matches the
  soft blocks (`301` without `Location`) we saw after a burst of requests.
- A real Chrome with the logged-in profile passes until the session itself is
  flagged; after that, PDP requests receive the puzzle challenge.
- Telemetry payloads (`strData`) are encrypted; we store the envelope only.

## Reproduce

```bash
cd crawler
CHROME_PROFILE_DIR=/tmp/tiktok-track-profile node scripts/rea-tracking.js
```
