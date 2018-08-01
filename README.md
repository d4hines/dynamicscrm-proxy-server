# dynamicscrm-proxy-server

A simple proxy server that allows a client to bypass NTLM authentication with an On-Premise instance of Dynamics CRM

## Quick Start

``` bash
dynamics-crm-proxy -u yourusername -p yourpassword -d YOURDOMAIN -a https://your.domain.com/YOURORG/api/data/v8.0/
```

Run `dynamics-crm-proxy --help` for more info/examples, or keep reading below.

## Configuration

Before using the proxy, you must configure it with the CRM's api url and the credentials you want it to use. You may also optionally configure a port the proxy should listen on (defaults to 3000).

There are two ways you can configure the proxy server. You may:

- Set environmental variables `CRMPROXY_USERNAME`, `CRMPROXY_PASSWORD`, `CRMPROXY_API_URL`, `CRMPROXY_DOMAIN` and, optionally, `CRMPROXY_PORT`
- Pass in command-line arguments. Here's the Yargs output:

  ``` bash
  Usage: index.js [options]

  Options:
  --help          Show help                                            [boolean]
  --version       Show version number                                  [boolean]
  --username, -u  CRM Username                                        [required]
  --password, -p  CRM Password                                        [required]
  --domain, -d    The Active Directory Domain to authenticate with    [required]
  --apiUrl, -a    CRM API URL                                         [required]
  --verbose, -v   Verbose Log Level                                    [boolean]
  --port          Port the proxy server should liston on

  Examples:
    index.js -u user1 -p mypass1337 -o -d yourdomain https://your.domain.edu/CRMSALES/api/data/v8.0 -v
    index.js --username user1 -password mypass1337 --domain yourdomain -apiurl https://your.domain.org/CRMINTERNAL/api/data/v8.1/ --port 1337

  ```

## Docker support

You can also run the proxy server as a docker file. E.g:

``` bash
docker run \
-e CRMPROXY_USERNAME=yourusernam \
-e CRMPROXY_PASSWORD=yourpassword \
-e CRMPROXY_DOMAIN=yourdomain \
-e CRMPROXY_API_URL=https://rctrdevcrm.regent.edu/CRMRECRUITTEST/api/data/v8.0/ \
-p 3000:3000 \
d4hines/dynamicscrm-proxy-server

```
