import dotenv from 'dotenv'
import express from 'express'
import logger from 'winston'
import * as client from 'prom-client'
import schedule from 'node-schedule'
import moment from 'moment'
import { poll } from './poll-tesla-metrics.mjs'
import { refreshTokens, loadTokens } from './refresh-tesla-token.mjs'

dotenv.config()
const register = new client.Registry()

logger.configure({
  level: process.env.LOG_LEVEL || 'info',
  format: logger.format.cli(),
  transports: [new logger.transports.Console()],
})

register.setDefaultLabels({
  app: 'tesla-api'
})
client.collectDefaultMetrics({ register })

//

process.on('SIGINT', function () {
	schedule.gracefulShutdown()
		.then(() => process.exit(0))
})

//

const authFile = process.env.CONFIG_PATH + "/auth.json"
var apiTokens = loadTokens(authFile)

function runTask(fireDate) {
  logger.info(moment().format('lll') + ` (${fireDate}) : Polling Tesla API metrics`)
  poll(apiTokens).then((products) => {

      for (const p of products) {
        logger.info(`Updating '${p.energy_site_id}'`)
        for (const m in p.metrics) {
          let v = p.metrics[m]
          //logger.debug(`${fqm} === ${v}`)
          let metric = register.getSingleMetric(m)
          if (!metric) {
            metric = new client.Gauge({
              name: m,
              help: `Tesla API metric ${m}`,
              labelNames: ['energy_site_id', 'site_name', 'resource_type'],
            })
            register.registerMetric(metric)
          }
          metric.labels( p.energy_site_id, p.site_name, p.resource_type ).set(Number(v))
        }
      }

    }).catch(err => {
      logger.error(`Failed to poll metrics (${err})`)
      if (err == "Unauthorized") {
        logger.info("Updating tokens")
        refreshTokens(authFile).then((newApiTokens) => {
          apiTokens = newApiTokens
          runTask(fireDate)
        }).catch(err => {
          logger.error(`Failed to refresh tokens (${err})`)
        })
      }
      logger.error(err)
  })
}

runTask(moment().format('lll'))
const mySQLJob = schedule.scheduleJob("*/1 * * * *", function(fireDate) {
  runTask(fireDate)
})

// Populate metrics
const server = express()
server.get('/metrics', async (req, res) => {
	try {
		res.set('Content-Type', register.contentType)
		res.end(await register.metrics())
	} catch (ex) {
		logger.error(ex)
		res.status(500).end(ex)
	}
})

const port = process.env.PORT || 8080
logger.info(`Server listening to ${port}, metrics exposed on /metrics endpoint`)
server.listen(port)