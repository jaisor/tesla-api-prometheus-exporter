import tjs from 'teslajs';

async function poll(apiTokens) {
  var products = await tjs.productsAsync({ authToken: apiTokens.access_token });
  console.log(`Found ${products.length} products`);
  
  let response = [];

  for (const p of products) {

    console.log(`Polling live status for site '${p.energy_site_id}'`);
    //console.log(p);
    let status = await tjs.solarStatusAsync({ authToken: apiTokens.access_token, siteId: p.energy_site_id });
    //console.log(status);

    let product = {
      energy_site_id: p.energy_site_id, 
      site_name: p.site_name, 
      resource_type: p.resource_type,
      metrics: {}
    };

    for (const m in status) {
      let v = status[m];
      if (typeof v !== 'object' && !Array.isArray(v) && v !== null && !isNaN(v)) {
        //console.log(`${m} === ${status[m]}`);
        product.metrics[m] = Number(v);
      }
    }

    response.push(product);
  }

  return response;
}

export { poll }; 
