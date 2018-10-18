#! /usr/bin/env node

const express = require('express');
const cors = require('cors');
const app = express();
const chalk = require('chalk');
const ntlm = require('request-ntlm-continued');
const request = require('request');

const argv = require('yargs')
  .usage('Usage: $0 [options]')
  .env('CRMPROXY')
  .describe({
    username: 'CRM Username',
    password: 'CRM Password',
    domain: 'The Active Directory Domain to authenticate with',
    apiUrl: 'CRM API URL',
    verbose: 'Verbose Log Level',
    port: 'Port the proxy server should liston on'
  })
  .example('$0 -u user1 -p mypass1337 -d MYDOMAINNT -o https://internalcrm.mydomain.com/CRMRECRUIT/api/data/v8.0 -v')
  .example('$0 --username user1 -password mypass1337 --domain MYDOMAINNT -apiurl https://salescrm.mydomain.com/SALESCRM/api/data/v8.1/ --port 1337')
  .boolean('v')
  .alias({
    username: 'u',
    password: 'p',
    domain: 'd',
    apiUrl: 'a',
    verbose: 'v'
  })
  .demandOption([
    'username',
    'password',
    'domain',
    'apiUrl'
  ]).argv;

const VERBOSE_FLAG = argv.verbose;
const API_URL = argv.apiUrl;
const USERNAME = argv.username;
const PASSWORD = argv.password;
const DOMAIN = argv.domain;
const PORT = argv.port || 3000

if (VERBOSE_FLAG) {
  request.debug = true;
}

/**
 * @param {string} message - the message to be logged.
 * @param {boolean} verbose - boolean that sets the verbose level of the log item.
 */
function log(message, verbose) {
  if (!verbose || VERBOSE_FLAG) {
    console.log(message);
  }
}

/** Performs an NTLM enabled request against the CRM, then passes 
 * the response to the callback */
function CRMRequest({
  method,
  url,
  headers,
  body
}, cb, errorCb) {
  delete headers.host;
  /* We have to delete the accept-encoding header, otherwise 
     the proxy doesn't know to deflate the gzipped response.*/
  delete headers['accept-encoding'];
  var opts = {
    headers,
    username: USERNAME,
    password: PASSWORD,
    url: API_URL + url,
    ntlm_domain: DOMAIN,
    workstation: process.env.COMPUTERNAME,
  }
  log(chalk.yellow(`Forwarding ${method} to ${url}`), true);
  ntlm[method.toLowerCase()](opts, body || null, (err, res, resBody) => {
    if (err) {
      errorCb(err)
    } else {
      cb(res);
    }
  });
}

function startServer() {
  // This line tells express to parse the body of the request as JSON, giving us access to it later
  app.use(express.json());
  // This middleware enables CORS
  app.use(cors({
    exposedHeaders: 'odata-entityid'
  }));

  app.all('/*', (origReq, origRes, next) => {
    CRMRequest(origReq, ({
      headers,
      body,
      statusCode,
      statusMessage
    }) => {
      const id = headers['odata-entityid'] || headers['OData-EntityId']
      if (headers && id) {
        origRes.setHeader('odata-entityid', id);
      }
      origRes.status(statusCode);
      origRes.statusMessage = statusMessage;
      origRes.send(body);
      log(chalk.green('Response sent!'), true);
    }, next);
  });
  app.listen(PORT, () => log('CRM Web API Proxy listening on port 3000!'));
}

const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'OData-MaxVersion': '4.0',
  'OData-Version': '4.0',
  'Prefer': 'odata.include-annotations="*"',
  'Content-Type': 'application/json; charset=utf-8'
}

// Perform a test request to validate the configuration is correct, 
// then start the server
const isAPIEndpoint = /(api\/data\/v\d\.\d\/?)$/.test(API_URL);
const prepend = /\/$/.test(API_URL) ? '' : '/';
CRMRequest({
  method: 'GET',
  url: isAPIEndpoint ? prepend + 'WhoAmI()' : '',
  headers: DEFAULT_HEADERS
}, ({
  statusCode,
}) => {
  if (statusCode !== 200) {
    throw new Error(isAPIEndpoint ?
      `WhoAmI() request failed at ${API_URL} with status code ${statusCode}` :
      `Could not connect to ${API_URL}. Request failed with status code ${statusCode}`)
  }
  log(chalk.green('Successfully connected to ' + API_URL));
  startServer();
}, (err) => { throw err });
