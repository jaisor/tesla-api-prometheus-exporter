import tjs from 'teslajs'
import logger from 'winston'

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

    response.push(product)
  }

  return response
}

export { poll }
