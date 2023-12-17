import tjs from 'teslajs'
import logger from 'winston'
import request from 'request'

request.defaults({
  headers: {
      "x-tesla-user-agent": "TeslaApp/3.4.4-350/fad4a582e/android/8.1.0",
      "user-agent": "Mozilla/5.0 (Linux; Android 8.1.0; Pixel XL Build/OPM4.171019.021.D1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/68.0.3440.91 Mobile Safari/537.36"
  },
  json: true,
  gzip: true,
  body: {}
})

function getEnergyHistory(apiTokens, siteId) {

  var req = {
    method: "GET",
    url: (process.env.TESLAJS_SERVER || tjs.portal) + "/api/1/energy_sites/" + siteId + "/history?kind=energy&period=day",
    headers: {
      Authorization: "Bearer " + apiTokens,
      "Content-Type": "application/json; charset=utf-8"
    }
  }

  //logger.debug(`Request: ${JSON.stringify(req)}`)

  return new Promise((resolve, reject) => {
    request(req, (error, response, body) => {
      if (error) {
        reject(error)
      }
  
      if (response.statusCode != 200) {
        reject(new Error(`Energy history response code ${response.statusCode}`))
      }
  
      try {
        resolve(JSON.parse(body))
      } catch (e) {
        reject(e)
      }
    })
  })
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

    await getEnergyHistory(apiTokens.access_token, p.energy_site_id).then(response => {
      if (Array.isArray(response.response?.time_series) && response.response?.time_series?.length >= 2) {
        //logger.debug(JSON.stringify(response))
        let today = response.response?.time_series?.pop()
        product.metrics = { ...product.metrics, ...today }
      }
    }).catch(err => {
      logger.error(`Failed to get energy history for site ${p.energy_site_id}`, err)
    })
    
    response.push(product)
  }

  return response
}

export { poll }
