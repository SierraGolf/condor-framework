const grpc = require('grpc');
const fs = require('fs');
const Promise = require('bluebird');
const _ = require('lodash');
const chalk = require('chalk');
const Builder = require('./builder');
const Proxy = require('./proxy');

module.exports = class {
  constructor(builder, options) {
    const defaultOptions = {
      'listen': '0.0.0.0:50051',
      'checkClientCert': false,
    };

    this._validateBuilder(builder);
    this._creds = grpc.ServerCredentials.createInsecure();
    if (this._hasSslOptions(options)) {
      this._validateSslOptions(options);
      this._creds = this._getOptionsWithSslCredentials(options);
    }
    this._isStarted = false;
    this._options = defaultOptions;
    _.assign(this._options, options);
    this._middleware = builder.getMiddleware();
    this._errorHandlers = builder.getErrorHandlers();
    this._grpcServer = new grpc.Server();
    builder.getServices().forEach((serviceDefinition) => {
      this._addService(serviceDefinition);
    });
  }

  _addService(serviceDefinition) {
    let fileToLoad = serviceDefinition.protoFileFullPath;
    if (serviceDefinition.rootProtoPath) {
      fileToLoad = {
        'root': serviceDefinition.rootProtoPath,
        'file': serviceDefinition.protoFilePath,
      };
    }
    const grpcObject = grpc.load(fileToLoad);
    const proxy = new Proxy(serviceDefinition, this._middleware, this._errorHandlers);
    const service = this._getServiceFromName(grpcObject, serviceDefinition.serviceFullName);
    this._grpcServer.addService(service, proxy);
  }

  _getServiceFromName(grpcObject, serviceFullName) {
    let service = grpcObject;
    const serviceNameComponents = serviceFullName.split('.');
    serviceNameComponents.forEach((component) => {
      service = service[component];
    });
    return service.service;
  }

  getOptions() {
    return this._options;
  }

  start() {
    this._grpcServer.bind(this._options.listen, this._creds);
    this._grpcServer.start();
    this._isStarted = this._grpcServer.started;
    console.log(chalk.green(`Condor GRPC Server is listening at ${this._options.listen}`)); // eslint-disable-line
    return this;
  }

  stop() {
    this._validateServerIsRunning();
    return new Promise((resolve, reject) => {
      this._grpcServer.tryShutdown((error) => {
        if (error) {
          return reject(error);
        }
        this._isStarted = false;
        resolve();
      });
    });
  }

  forceStop() {
    this._validateServerIsRunning();
    this._grpcServer.forceShutdown();
    this._isStarted = false;
  }

  hasStarted() {
    return this._isStarted;
  }

  _validateBuilder(builder) {
    if (!(builder instanceof Builder)) {
      throw new Error('Cannot perform operation: Server should be constructed with a builder');
    }
    if (builder.getServices().length === 0) {
      throw new Error('Cannot perform operation: No services have been defined');
    }
  }

  _validateServerIsRunning() {
    if (!this.hasStarted()) {
      throw new Error('Cannot perform operation: Server is not running');
    }
  }

  _hasSslOptions(options) {
    return options && (options.rootCert || options.certChain || options.privateKey);
  }

  _validateSslOptions(options) {
    if (!(options.certChain && options.privateKey)) {
      throw new Error('Cannot perform operation: privateKey and certChain' +
        ' are required when using ssl');
    }
  }

  _getOptionsWithSslCredentials(options) {
    let rootCert;
    if (options.rootCert) {
      rootCert = this._getFileBuffer(options.rootCert);
    }

    return grpc.ServerCredentials.createSsl(rootCert, [
      {
        'cert_chain': this._getFileBuffer(options.certChain),
        'private_key': this._getFileBuffer(options.privateKey),
      },
    ], options.checkClientCert);
  }

  _getFileBuffer(path) {
    if (!fs.existsSync(path)) {
      throw new Error(`Cannot perform operation: File not found: ${path}`);
    }
    return fs.readFileSync(path);
  }
};
