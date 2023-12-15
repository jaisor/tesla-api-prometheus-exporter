import tjs from 'teslajs'
import logger from 'winston'

function getEnergyHistory(apiTokens, siteId) {

  tjs
  var req = {
    method: "GET",
    url: tjs.portalBaseURI + "/api/1/energy_sites/" + siteId + "/history?kind=energy&period=day",
    headers: {
      Authorization: "Bearer " + apiTokens,
      "Content-Type": "application/json; charset=utf-8"
    }
  }

  logger.debug(`Request: ${JSON.stringify(req)}`)

}

async function poll(apiTokens) {
  var products = await tjs.productsAsync({ authToken: apiTokens.access_token })
  logger.info(`Found ${products.length} products`)
  
  let response = []

  for (const p of products) {

    logger.info(`Polling live status for site '${p.energy_site_id}'`)
    //logger.debug(p)
    let status = await tjs.solarStatusAsync({ authToken: apiTokens.access_token, siteId: p.energy_site_id })
    //logger.debug(status)

    let product = {
      energy_site_id: p.energy_site_id, 
      site_name: p.site_name, 
      resource_type: p.resource_type,
      metrics: {}
    }

    for (const m in status) {
      let v = status[m]
      if (typeof v !== 'object' && !Array.isArray(v) && v !== null && !isNaN(v)) {
        //logger.debug(`${m} === ${status[m]}`)
        product.metrics[m] = Number(v)
      }
    }

    getEnergyHistory(apiTokens.access_token, p.energy_site_id)

    response.push(product)
  }

  return response
}

export { poll }
