const Proxy = require('./proxy');
const Response = require('./response');
const Context = require('./context');
const Mocks = require('../spec/util/mocks');
const Spy = require('../spec/util/spy');

/* eslint max-lines: "off" */
describe('Proxy:', () => {
  let serviceDefinition, proxy, personServiceMock, middlewareMock, middleware, errorHandlerMock,
    errorHandlers, call, expectedProperties, expectedError, expectedResponse, error, consoleWarn;

  describe('definitions without rootProtoPath, ', () => {
    const customServiceDefinition = {
      'protoFileFullPath': 'spec/protos/testapp/person.proto',
      'serviceFullName': 'testapp.PersonService',
      'serviceName': 'PersonService',
    };

    runTests(customServiceDefinition);
  });

  describe('definitions with rootProtoPath, ', () => {
    const customServiceDefinition = {
      'rootProtoPath': 'spec/protos',
      'protoFilePath': 'testapp/person.proto',
      'protoFileFullPath': 'spec/protos/testapp/person.proto',
      'serviceName': 'PersonService',
      'serviceFullName': 'testapp.PersonService',
    };

    runTests(customServiceDefinition);
  });

  function runTests(customServiceDefinition) {
    beforeEach(() => {
      /* eslint-disable no-console */
      consoleWarn = console.warn;
      console.warn = Spy.create();
      /* eslint-enable no-console */
      middlewareMock = Mocks.getMiddleware();
      personServiceMock = Mocks.getPersonService();
      errorHandlerMock = Mocks.getErrorHandlers();
      serviceDefinition = customServiceDefinition;
      serviceDefinition.implementation = personServiceMock;
      middleware = middlewareMock.middleware;
      errorHandlers = errorHandlerMock.errorHandlers;
      proxy = new Proxy(serviceDefinition, middleware, errorHandlers);
      call = {'a': 1};
      expectedProperties = {
        'methodName': 'list',
        'methodFullName': `${serviceDefinition.serviceFullName}.list`,
        'serviceFullName': serviceDefinition.serviceFullName,
        'serviceName': serviceDefinition.serviceName,
      };
    });

    afterEach(() => {
      // eslint-disable-next-line no-console
      console.warn = consoleWarn;
    });

    it('should return an object', () => {
      expect(proxy instanceof Proxy).toBeFalsy();
      expect(proxy instanceof Object).toBeTruthy();
    });

    it('should have a method for each method defined in the proto service definition', () => {
      expect(Object.getOwnPropertyNames(proxy).length).toEqual(2);
      expect(proxy.list).toEqual(jasmine.any(Function));
      expect(proxy.get).toEqual(jasmine.any(Function));

      const greeterServiceMock = Mocks.getGreeterService();
      const greeterServiceDefinition = {
        'protoFileFullPath': 'spec/protos/testapp/greeter/greeter.proto',
        'serviceFullName': 'testapp.greeter.GreeterService',
        'serviceName': 'GreeterService',
        'implementation': greeterServiceMock,
      };
      proxy = new Proxy(greeterServiceDefinition);
      expect(Object.getOwnPropertyNames(proxy).length).toEqual(2);
      expect(proxy.sayHello).toEqual(jasmine.any(Function));
      expect(proxy.sayGoodbye).toEqual(jasmine.any(Function));
    });

    describe('when passed implementation class inherits methods from other classes', () => {
      it('inherited methods should be treated as any other method', () => {
        const getGreeterSubSubClassMock = Mocks.getGreeterSubSubclass();
        const serviceDefinition = {
          'protoFileFullPath': 'spec/protos/testapp/greeter/greeter.proto',
          'serviceFullName': 'testapp.greeter.GreeterService',
          'serviceName': 'GreeterService',
          'implementation': getGreeterSubSubClassMock,
        };
        proxy = new Proxy(serviceDefinition);
        expect(Object.getOwnPropertyNames(proxy).length).toEqual(2);
        expect(proxy.sayHello).toEqual(jasmine.any(Function));
        expect(proxy.sayGoodbye).toEqual(jasmine.any(Function));
      });
    });

    describe('when passed implementation is a simple object', () => {
      it('should be treated as any class instance', () => {
        const implementation = {
          'sayHello': () => {}, // eslint-disable-line
          'sayGoodbye': () => {}, // eslint-disable-line
        };
        const serviceDefinition = {
          'protoFileFullPath': 'spec/protos/testapp/greeter/greeter.proto',
          'serviceFullName': 'testapp.greeter.GreeterService',
          'serviceName': 'GreeterService',
          'implementation': implementation,
        };
        proxy = new Proxy(serviceDefinition);
        expect(Object.getOwnPropertyNames(proxy).length).toEqual(2);
        expect(proxy.sayHello).toEqual(jasmine.any(Function));
        expect(proxy.sayGoodbye).toEqual(jasmine.any(Function));
      });
    });

    describe('each method', () => {
      describe('when no middleware nor error handler is defined', () => {
        const expectedObject = {'message': 'Listing'};

        beforeEach(() => {
          proxy = new Proxy(serviceDefinition);
          expectedError = new Error('Error');
        });

        it('should call the implementation method with the context', (done) => {
          proxy.list(call, () => {
            expect(personServiceMock.list).toHaveBeenCalledTimes(1);
            expect(personServiceMock.list).toHaveBeenCalledWith(jasmine.any(Context));
            expect(personServiceMock.list).toHaveBeenCalledWith(jasmine.objectContaining({call}));
            done();
          });
        });

        it('should return with an object', (done) => {
          personServiceMock.list = Spy.returnValue(expectedObject);
          proxy.list(call, (error, value) => {
            expect(value).toEqual(expectedObject);
            expect(error).toBeNull();
            done();
          });
        });

        describe('when implementation returns undefined', () => {
          it('should return an empty object', (done) => {
            personServiceMock.list = Spy.returnValue();
            proxy.list(call, (error, value) => {
              expect(value).toEqual({});
              expect(error).toBeNull();
              done();
            });
          });
        });

        describe('when throws an error', () => {
          it('should return the error', (done) => {
            personServiceMock.list = Spy.throwError('Error');
            proxy.list(call, (error) => {
              expect(error).toEqual(expectedError);
              done();
            });
          });
        });

        describe('when returns a promise', () => {
          it('should wait for the promise to resolve and return with the value', (done) => {
            personServiceMock.list = Spy.resolve('result');
            proxy.list(call, (error, value) => {
              expect(value).toEqual('result');
              expect(error).toBeNull();
              done();
            });
          });

          it('should wait for the promise to resolve and return undefined', (done) => {
            personServiceMock.list = Spy.resolve();
            proxy.list(call, (error, value) => {
              expect(value).toEqual({});
              expect(error).toBeNull();
              done();
            });
          });

          it('should wait for the promise to reject and return with the error', (done) => {
            personServiceMock.list = Spy.reject('Error');
            proxy.list(call, (error) => {
              expect(error).toEqual('Error');
              done();
            });
          });
        });
      });

      describe('callback is undefined (streams)', () => {
        let stream;

        beforeEach(() => {
          stream = {'emit': Spy.create('emit')};
        });

        it('should not throw an error', (done) => {
          personServiceMock.list = Spy.returnValue('anything');
          proxy.list(stream).then(() => {
            done();
          });
        });

        describe('implementation throws an error', () => {
          beforeEach(() => {
            error = new Error('My Internal Server Error');
          });

          it('should emit the error', (done) => {
            personServiceMock.list = Spy.throwError('My Internal Server Error');
            proxy.list(stream).then(() => {
              expect(stream.emit).toHaveBeenCalledTimes(1);
              expect(stream.emit).toHaveBeenCalledWith('error', error);
              done();
            });
          });
        });

        describe('error handler throws an error', () => {
          beforeEach(() => {
            error = 'secondError';
          });
          it('should emit the error', (done) => {
            personServiceMock.list = Spy.throwError('My Internal Server Error');
            errorHandlerMock.globalErrorHandler.method = Spy.reject(error);
            proxy.list(stream).then(() => {
              expect(stream.emit).toHaveBeenCalledTimes(1);
              expect(stream.emit).toHaveBeenCalledWith('error', error);
              done();
            });
          });
        });
      });

      describe('when middleware is added', () => {
        it('should call all global middleware', (done) => {
          proxy.list(call, () => {
            expect(middlewareMock.globalMiddleware.method).toHaveBeenCalledTimes(1);
            done();
          });
        });

        it('should call corresponding package middleware', (done) => {
          proxy.list(call, () => {
            expect(middlewareMock.packageMiddleware.method).toHaveBeenCalledTimes(1);
            expect(middlewareMock.packageMiddleware2.method).not.toHaveBeenCalled();
            done();
          });
        });

        it('should call corresponding service middleware', (done) => {
          proxy.list(call, () => {
            expect(middlewareMock.serviceMiddleware.method).toHaveBeenCalledTimes(1);
            expect(middlewareMock.serviceMiddleware2.method).not.toHaveBeenCalled();
            done();
          });
        });

        it('should call corresponding method middleware', (done) => {
          proxy.list(call, () => {
            expect(middlewareMock.methodMiddleware.method).toHaveBeenCalledTimes(1);
            expect(middlewareMock.methodMiddleware2.method).not.toHaveBeenCalled();
            done();
          });
        });

        it('should call middlewares with the right arguments', (done) => {
          proxy.list(call, () => {
            const args = middlewareMock.globalMiddleware.method.calls.argsFor(0);
            expect(args[0] instanceof Context).toBeTruthy();
            expect(args[0].call).toEqual(call);
            expect(args[0].properties).toEqual(expectedProperties);
            expect(args[1]).toEqual(jasmine.any(Function));
            done();
          });
        });
      });

      describe('when error handlers are added', () => {
        beforeEach(() => {
          middlewareMock.globalMiddleware.method = Spy.throwError('Error handler');
        });

        it('should call all global error handlers', (done) => {
          proxy.list(call, () => {
            expect(errorHandlerMock.globalErrorHandler.method).toHaveBeenCalledTimes(1);
            done();
          });
        });

        it('should call corresponding package error handlers', (done) => {
          proxy.list(call, () => {
            expect(errorHandlerMock.packageErrorHandler.method).toHaveBeenCalledTimes(1);
            expect(errorHandlerMock.packageErrorHandler2.method).not.toHaveBeenCalled();
            done();
          });
        });

        it('should call corresponding service error handlers', (done) => {
          proxy.list(call, () => {
            expect(errorHandlerMock.serviceErrorHandler.method).toHaveBeenCalledTimes(1);
            expect(errorHandlerMock.serviceErrorHandler2.method).not.toHaveBeenCalled();
            done();
          });
        });

        it('should call corresponding method error handlers', (done) => {
          proxy.list(call, () => {
            expect(errorHandlerMock.methodErrorHandler.method).toHaveBeenCalledTimes(1);
            expect(errorHandlerMock.methodErrorHandler2.method).not.toHaveBeenCalled();
            done();
          });
        });
      });
    });

    describe('each middleware', () => {
      beforeEach(() => {
        expectedResponse = {'message': 'message'};
        expectedError = new Error('Middleware Error');
        error = new Error('Middleware Error');
      });

      describe('sends response', () => {
        beforeEach(() => {
          middlewareMock.globalMiddleware.method.and.callFake((context) => {
            context.send(expectedResponse);
          });
        });

        it('should not call the implementation', (done) => {
          proxy.list(call, () => {
            expect(personServiceMock.list).not.toHaveBeenCalled();
            done();
          });
        });

        it('should return the value', (done) => {
          proxy.list(call, (error, value) => {
            expect(value).toEqual(expectedResponse);
            expect(error).toBeNull();
            done();
          });
        });

        describe('and another middleware changes response', () => {
          const anotherResponse = 'response';

          it('should return the value', (done) => {
            middlewareMock.globalMiddleware.method.and.callFake((context, next) => {
              return next().then(() => {
                context.send(anotherResponse);
              });
            });
            middlewareMock.packageMiddleware.method.and.callFake((context) => {
              context.send(expectedResponse);
            });
            proxy.list(call, (error, value) => {
              expect(value).toEqual(anotherResponse);
              expect(error).toBeNull();
              done();
            });
          });
        });
      });

      describe('throws an error', () => {
        beforeEach(() => {
          expectedError = new Error('Middleware Error');
          middlewareMock.globalMiddleware.method = Spy.throwError(expectedError);
        });
        it('should return the error', (done) => {
          proxy.list(call, (error) => {
            expect(error).toEqual(expectedError);
            done();
          });
        });
        it('should log as a warning', (done) => {
          /* eslint-disable no-console */
          proxy.list(call, () => {
            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(console.warn).toHaveBeenCalledWith(expectedError);
            done();
          });
          /* eslint-enable no-console */
        });
      });

      describe('creates an error', () => {
        it('should return the error', (done) => {
          middlewareMock.globalMiddleware.method.and.callFake((context, next) => {
            return next(error);
          });
          proxy.list(call, (error) => {
            expect(error).toEqual(expectedError);
            done();
          });
        });
      });

      describe('when middleware catch the error', () => {
        beforeEach(() => {
          expectedError = new Error('No response sent after handling error');
          expectedError.code = 2;
        });

        it('should throw the error', (done) => {
          personServiceMock.list = Spy.throwError('Middleware Error');
          middleware[0].method.and.callFake((context, next) => {
            return next().catch((error) => {
              error.code = 2;
            });
          });
          proxy.list(call, (error) => {
            expect(error).toEqual(expectedError);
            done();
          });
        });
      });
    });

    describe('each error handler', () => {
      beforeEach(() => {
        expectedResponse = new Response({'message': 'message'});
        expectedError = new Error('Middleware Error');
        middlewareMock.globalMiddleware.method = Spy.throwError('Middleware Error');
      });

      describe('propagates the error', () => {
        it('should callback with the error', (done) => {
          proxy.list(call, (error) => {
            expect(error).toEqual(expectedError);
            done();
          });
        });
      });

      describe('handles the error', () => {
        it('should return the result', (done) => {
          errorHandlerMock.globalErrorHandler.method.and.callFake((error, context, next) => {
            return next();
          });
          personServiceMock.list = Spy.returnValue(expectedResponse);
          proxy.list(call, (error, value) => {
            expect(error).toBeNull();
            expect(value).toEqual(expectedResponse.getGrpcObject());
            done();
          });
        });
      });

      describe('send response', () => {
        it('should return the response sent', (done) => {
          errorHandlerMock.globalErrorHandler.method.and.callFake((error, context) => {
            context.send(expectedResponse);
          });
          proxy.list(call, (error, value) => {
            expect(error).toBeNull();
            expect(value).toEqual(expectedResponse.getGrpcObject());
            done();
          });
        });
      });
    });
  }
});
