---
title: Options
layout: default
---

# Options

```js
const Condor = require('condor-framework');
const options = {
  'listen': 'myservice.example.com:50051',
  'rootProtoPath': '../protos',
  'rootCert': '/path/to/root/cert',
  'checkClientCert': true,
  'certChain': '/path/to/cert/chain',
  'privateKey': '/path/to/private/key',
};
const app = new Condor(options);
```

All the options are not required. Their default values are:

| Option          | Description                                                                            | Default       |
|-----------------|----------------------------------------------------------------------------------------|---------------|
| listen          | The hostname and port the server will listen into                                      | 0.0.0.0:50051 |
| host            | The hostname. *Valid only if `listen` is not set*                                      | 0.0.0.0       |
| port            | The port. *Valid only if `listen` is not set*                                          | 50051         |
| rootProtoPath   | Root path of the proto files                                                           |               |
| rootCert        | Path to the root cert file                                                             |               |
| checkClientCert | Indicates that the server should request, require and verify the client's certificates | false         |
| certChain       | Path to the cert chain file                                                            |               |
| privateKey      | Path to the private key file                                                           |               |

Next: [Related modules and middleware](related-modules-and-middleware.md)
