# tmrl-dashboard

Angular frontend for TMRLTrackerHub.

Use this folder for frontend development only. Production orchestration is managed by the root `docker-compose.yml`.

## Local Development

```bash
cd tmrl-dashboard
npm install
npm start
```

Default dev URL:

```text
http://localhost:4200
```

Build:

```bash
npm run build:prod
```

The production build uses the relative API path `/api`, which is compatible with the dashboard Nginx proxy and external reverse proxies.

The full deployment guide and backend contract are in the root `README.md` and `docs/`.
