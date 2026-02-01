# Troubleshooting

- **relation does not exist**: open `/api/setup` once
- **API connection refused**: backend not running or wrong URL
- **CSV upload fails**: check column names `name, roll_no, branch, year`
- **SMTP errors**: verify `SMTP_*` in `server/.env`
- **401 Unauthorized**: restart backend after env changes
