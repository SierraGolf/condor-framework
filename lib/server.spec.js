const Builder = require('./builder');
const Mocks = require('../spec/util/mocks');
const proxyquire = require('proxyquire');

describe('Server:', () => {
  let Server, server, serverMock, grpcMock, personServiceMock, greeterServiceMock;

  beforeEach(() => {
    serverMock = Mocks.getServer();
    grpcMock = Mocks.getGrpc(serverMock);
    personServiceMock = Mocks.getPersonService();
    greeterServiceMock = Mocks.getGreeterService();
    Server = proxyquire('./server', {'grpc': grpcMock});
    const builder = new Builder();
    builder.addService('protoFilePath', 'testapp.PersonService', personServiceMock);
    builder.addService('protoFilePath2', 'testapp.greeter.GreeterService', greeterServiceMock);
    server = new Server(builder);
  });

  describe('constructor()', () => {
    it('should return an instance of the server class', () => {
      expect(server instanceof Server).toBeTruthy();
    });

    describe('when builder is not set', () => {
      it('should throw an error', () => {
        expect(() => {
          new Server(); // eslint-disable-line
        }).toThrowError('Cannot start server: Server should be constructed with a builder');
      });
    });

    describe('when the passed argument is not an instance of Builder class', () => {
      it('should throw an error', () => {
        expect(() => {
          new Server({}); // eslint-disable-line
        }).toThrowError('Cannot start server: Server should be constructed with a builder');
      });
    });

    describe('when builder has no services defined', () => {
      it('should throw an error', () => {
        expect(() => {
          new Server(new Builder()); // eslint-disable-line
        }).toThrowError('Cannot start server: No services have been defined');
      });
    });

    it('should create a grpc server object', () => {
      expect(grpcMock.Server).toHaveBeenCalledTimes(1);
    });

    it('should add each proto service defined with the service interface and the proxy', () => {
      const expectedService = {'a': 1};
      const expectedProxy = {
        'list': jasmine.any(Function),
        'get': jasmine.any(Function),
      };
      const expectedService2 = {'a': 2};
      const expectedProxy2 = {
        'sayHello': jasmine.any(Function),
        'sayGoodbye': jasmine.any(Function),
      };
      expect(serverMock.addProtoService).toHaveBeenCalledTimes(2);
      expect(serverMock.addProtoService).toHaveBeenCalledWith(expectedService, expectedProxy);
      expect(serverMock.addProtoService).toHaveBeenCalledWith(expectedService2, expectedProxy2);
    });
  });
});