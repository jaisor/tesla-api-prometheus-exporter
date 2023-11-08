import dotenv from 'dotenv'
import fs from 'fs';
import express from 'express';
import * as client from 'prom-client';
import schedule from 'node-schedule';
import moment from 'moment';
import { poll } from './poll-tesla-metrics.mjs'
import { refreshTokens, loadTokens } from './refresh-tesla-token.mjs'

dotenv.config();
const server = express();
const register = new client.Registry()

register.setDefaultLabels({
  app: 'tesla-api'
})
client.collectDefaultMetrics({ register })

//

process.on('SIGINT', function () {
	schedule.gracefulShutdown()
		.then(() => process.exit(0))
});

//

const authFile = process.env.CONFIG_PATH + "/auth.json";
var apiTokens = loadTokens(authFile);
var registeredMetrics = {};

function runTask(fireDate) {
  console.log(moment().format('lll') + ` (${fireDate}) : Polling Tesla API metrics`)
  poll(apiTokens).then((products) => {

      for (const p of products) {
        console.log(`Updating '${p.energy_site_id}'`);
        for (const m in p.metrics) {
          let v = p.metrics[m];
          const fqm = p.energy_site_id + '.' + m;
          //console.log(`${fqm} === ${v}`);
          if (!(fqm in registeredMetrics)) {
            const metrics = new client.Gauge({
              name: m,
              help: `Tesla API metric ${m}`,
              labelNames: ['energy_site_id', 'site_name', 'resource_type'],
            });
            register.registerMetric(metrics);
            registeredMetrics[fqm] = metrics;
          }
          registeredMetrics[fqm].labels( p.energy_site_id, p.site_name, p.resource_type ).set(Number(v));
        }
      };

    }).catch(err => {
      console.error(`Failed to poll metrics (${err})`);
      if (err == "Unauthorized") {
        console.log("Updating tokens");
        refreshTokens(authFile).then((newApiTokens) => {
          apiTokens = newApiTokens;
          runTask(fireDate);
        }).catch(err => {
          console.error(`Failed to refresh tokens (${err})`);
        });
      }
      console.error(err)
  });
}

runTask(moment().format('lll'));
const mySQLJob = schedule.scheduleJob("*/1 * * * *", function(fireDate){
  runTask(fireDate);
});

// Populate metrics
server.get('/metrics', async (req, res) => {
	try {
		res.set('Content-Type', register.contentType);
		res.end(await register.metrics());
	} catch (ex) {
		console.error(ex);
		res.status(500).end(ex);
	}
});

const port = process.env.PORT || 8080;
console.log(
	`Server listening to ${port}, metrics exposed on /metrics endpoint`,
);
server.listen(port);