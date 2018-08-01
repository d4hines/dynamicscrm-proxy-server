#! /usr/bin/env node

const express = require('express');
const cors = require('cors');
const app = express();
const chalk = require('chalk');
const ntlm = require('request-ntlm-continued');

const argv = require('yargs')
  .usage('Usage: $0 [options]')
  .env('CRMPROXY')
  .describe({
    username: 'CRM Username',
    password: 'CRM Password',
    apiUrl: 'CRM API URL',
    verbose: 'Verbose Log Level',
    port: 'Port the proxy server should liston on'
  })
  .example('$0 -u user1 -p mypass1337 -o https://internalcrm.mydomain.com/CRMRECRUIT/api/data/v8.0 -v')
  .example('$0 --username user1 -password mypass1337 -apiurl https://salescrm.mydomain.com/SALESCRM/api/data/v8.1/ --port 1337')
  .boolean('v')
  .alias({
    username: 'u',
    password: 'p',
    apiUrl: 'a',
    verbose: 'v'
  })
  .demandOption([
    'username', 'password',
    'apiUrl'
  ]).argv;

const VERBOSE_FLAG = argv.verbose;
const APIURL = argv.apiUrl;
const USERNAME = argv.username
const PASSWORD = argv.password;
const PORT = argv.port || 3000

/**
 * @param {string} message - the message to be logged.
 * @param {boolean} verbose - boolean that sets the verbose level of the log item.
 */
function log(message, verbose) {
  if (!verbose || VERBOSE_FLAG) {
    console.log(message);
  }
}

const HEADERS = {
  'Accept': 'application/json',
  'OData-MaxVersion': '4.0',
  'OData-Version': '4.0',
  'Prefer': 'odata.include-annotations="*"',
  'Content-Type': 'application/json; charset=utf-8'
}

/** Performs an NTLM enabled request against the CRM, then passes the response to the callback */
function CRMRequest({
  method,
  url,
  headers,
  body
}, cb) {
  delete headers.host;
  var opts = {
    username: USERNAME,
    password: PASSWORD,
    headers: HEADERS,
    url: APIURL + url,
    ntlm_domain: 'REGENTNT',
    workstation: process.env.COMPUTERNAME,
  }
  log(chalk.yellow(`Forwarding ${method} to ${url}`), true);
  ntlm[method.toLowerCase()](opts, body || null, (err, res, resBody) => {
    if (err) {
      throw err;
    }
    cb(res);
  });
}

function startServer() {
  // This line tells express to parse the body of the request as JSON, giving us access to it later
  app.use(express.json());
  // This middleware enables CORS
  app.use(cors({
    exposedHeaders: 'odata-entityid'
  }));

  app.all('/*', (origReq, origRes) => {
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
    });
  });
  app.listen(PORT, () => log('CRM Web API Proxy listening on port 3000!'));
}

// Perform a test request to validate the configuration is correct, 
// then start the server
CRMRequest({
  method: 'GET',
  url: 'WhoAmI()',
  headers: HEADERS
}, ({
  status,
  statusCode,
  body
}) => {
  log(chalk.green('Successfully connected to ' + APIURL));
  startServer();
});
