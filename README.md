# tesla-api-prometheus-exporter
Prometheus exporter for Tesla API metrics

Dashboard snapshot https://snapshots.raintank.io/dashboard/snapshot/V8ReJsr79g4LfgzLlWVphFmZDIKP2Wp1
![Example Grafana dashboard](img/dash.png)

Grafana JSON exported in [grafana_dash.json](grafana_dash.json)

GitHub repo: https://github.com/jaisor/tesla-api-prometheus-exporter

# Tesla API auth

See https://github.com/adriankumpf/tesla_auth for instructions on how to generate access and refresh tokens

# Build & run

## Local npm

Create an `auth.json` file in the config path (ex: `.config/auth.json`) containing at-least a valid refresh token.
The script will populate access token and future refresh tokens in that file as needed.

```
{
  "refresh_token": "<REDACTED>"
}
```

Ensure the script has access to CONFIG_PATH environment variable pointing to the the folder containing `auth.json`. Example `.env` file to accomplish this:

```
CONFIG_PATH=.config
```

Install and run

```
npm install
npm start
```

## Docker container

```
docker build -t tesla-api-prometheus-exporter:latest .
```

```
docker run -dit --restart unless-stopped --name tesla-api-prometheus-exporter \
  -v .config:/config \
  -e CONFIG_PATH=/config -p 9004:8080 \
  tesla-api-prometheus-exporter:latest
```
