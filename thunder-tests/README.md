## Thunder Client Route Tests

Import these files in Thunder Client to test all API routes in this project.

### Files

- `thunder-tests/3bodyui-api-routes.thunder_collection.json`
- `thunder-tests/3bodyui-api-https.thunder_environment.json`
- `thunder-tests/3bodyui-api-local.thunder_environment.json`

### Routes Covered

1. `GET /api/wallets/balance`
2. `POST /api/quotes/usdt-inr`
3. `GET /api/liquidity/exposure`
4. `POST /api/liquidity/deposit`
5. `GET /api/transactions/list`
6. `POST /api/transactions/create`
7. `POST /api/transactions/execute`
8. `POST /api/merchants/payout`

### Import Steps

1. Open Thunder Client in VS Code.
2. Import collection file: `3bodyui-api-routes.thunder_collection.json`.
3. Import one environment file:
   - `3bodyui-api-local.thunder_environment.json` for local dev.
   - `3bodyui-api-https.thunder_environment.json` for deployed HTTPS.
4. Select the imported environment in Thunder Client.
5. Run requests.

### Notes

- For HTTPS testing, set `baseUrl` in the HTTPS environment to your deployed domain.
- If your backend requires auth headers, add them per request or as collection defaults.
