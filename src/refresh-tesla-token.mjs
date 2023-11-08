import request from 'request';
import fs from 'fs';

function req(parameters) {
  return new Promise(function (resolve, reject) {
      request(parameters, function (error, response, body) {
          if (error /*|| response.statusCode >= 400*/) {
              return reject(error || new Error("HTTP error " + response.statusCode));
          }
          resolve({response: response, body: body});
      });
  });
}

async function refreshTokens(authFile) {
  const apiTokens = loadTokens(authFile);
  const {response, body} = await req({
    method: 'POST',
    url: 'https://auth.tesla.com/oauth2/v3/token',
    json: true,
    headers: {},
    body: {
        "grant_type": "refresh_token",
        "client_id": "ownerapi",
        "refresh_token": apiTokens.refresh_token,
        "scope": "openid email offline_access"
    }
  });

  if (response.statusCode != 200) {
    throw TypeError(`Unexpected response status ${response.statusCode}`);
  }
  
  console.log(JSON.stringify(body, null, 2));
  
  fs.writeFileSync(authFile, JSON.stringify(body, null, 2), 'utf8');
  return body;
}

function loadTokens(authFile) {
  return JSON.parse(fs.readFileSync(authFile, "utf8"));
}

export { refreshTokens, loadTokens }; 