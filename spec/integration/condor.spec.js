const grpc = require('grpc');
const fs = require('fs');
const Condor = require('../../lib/condor');
const Repeater = require('./repeater');
const Car = require('./car');

describe('condor framework', () => {
  let condor, repeaterClient, carClient, message, expectedResponse, count, countErrors;

  beforeAll(() => {
    // start server
    const options = {
      'host': '127.0.0.1',
      'port': '9999',
      'rootProtoPath': 'spec/protos',
    };
    condor = new Condor(options)
      .add('testapp/repeater.proto', 'RepeaterService', new Repeater())
      .add('transport/land/car.proto', 'CarService', new Car())
      .use('testapp.repeater', (context, next) => {
        count++;
        return next();
      })
      .use((context, next) => {
        count++;
        return next();
      })
      .use((context, next) => {
        // not returning next(). To test fix for
        // https://github.com/devsu/condor-framework/issues/40
        next();
      })
      .addErrorHandler((error, context, next) => {
        countErrors++;
        return next(error);
      })
      .addErrorHandler('transport.land.CarService.insert', (error, context, next) => {
        countErrors++;
        return next(error);
      })
      .start();

    // start client
    const repeaterProto = grpc.load('spec/protos/testapp/repeater.proto');
    repeaterClient = new repeaterProto.testapp.repeater.RepeaterService('127.0.0.1:9999',
      grpc.credentials.createInsecure());

    const carProto = grpc.load('spec/protos/transport/land/car.proto');
    carClient = new carProto.transport.land.CarService('127.0.0.1:9999',
      grpc.credentials.createInsecure());
  });

  afterAll((done) => {
    condor.stop().then(() => {
      done();
    });
  });

  beforeEach(() => {
    message = {'message': 'Welcome to Ecuador!'};
    expectedResponse = {'message': 'You sent: \'Welcome to Ecuador!\'.'};
  });

  describe('simple call', () => {
    it('should respond with the right message', (done) => {
      repeaterClient.simple(message, (error, response) => {
        expect(error).toBeNull();
        expect(response).toEqual(expectedResponse);
        done();
      });
    });
  });

  describe('stream to server', () => {
    it('should respond with the right message', (done) => {
      const expectedResponse = {
        'message': 'You sent: \'Welcome to Ecuador! Bienvenido a Ecuador! Saludos!\'.',
      };
      const stream = repeaterClient.streamToServer((error, response) => {
        expect(response).toEqual(expectedResponse);
        done();
      });
      stream.write('Welcome to Ecuador! ');
      stream.write('Bienvenido a Ecuador! ');
      stream.write('Saludos!');
      stream.end();
    });
  });

  describe('stream to client', () => {
    it('should respond with the right messages', (done) => {
      const stream = repeaterClient.streamToClient(message);
      let count = 0;
      stream.on('data', (data) => {
        expect(data).toEqual(expectedResponse);
        count++;
      });
      stream.on('end', () => {
        expect(count).toEqual(2);
        done();
      });
    });
  });

  describe('bidirectional stream', () => {
    it('should respond with the right messages', (done) => {
      const expectedResponse1 = {'message': 'You sent: \'Welcome!\'.'};
      const expectedResponse2 = {'message': 'You sent: \'Bienvenido!\'.'};
      const stream = repeaterClient.bidirectionalStream();
      let count = 0;
      stream.on('data', (data) => {
        switch (count) {
          case 0:
            expect(data).toEqual(expectedResponse1);
            break;
          case 1:
            expect(data).toEqual(expectedResponse2);
            break;
          default:
            done.fail();
        }
        count++;
      });
      stream.on('end', () => {
        done();
      });
      stream.write('Welcome!');
      stream.write('Bienvenido!');
      stream.end();
    });
  });

  describe('middleware', () => {
    beforeEach(() => {
      count = 0;
    });

    it('should call middleware added', (done) => {
      repeaterClient.simple(message, (error) => {
        expect(error).toBeNull();
        expect(count).toEqual(2);
        done();
      });
    });
  });

  describe('error handlers', () => {
    beforeEach(() => {
      countErrors = 0;
    });

    it('should call error handlers added', (done) => {
      const expectedError = new Error('Method not implemented yet');
      carClient.insert({'name': 'mustang'}, (error) => {
        expect(error).toEqual(expectedError);
        expect(countErrors).toEqual(2);
        done();
      });
    });
  });

  describe('ssl certificates', () => {
    it('should use ssl credentials between client/server communication', (done) => {
      condor.stop();
      const options = {
        'listen': '0.0.0.0:50051',
        'certChain': 'spec/ssl/server.crt',
        'privateKey': 'spec/ssl/server.key',
        'rootProtoPath': 'spec/protos',
      };
      condor = new Condor(options)
        .add('testapp/repeater.proto', 'RepeaterService', new Repeater())
        .start();
      const sslCreds = grpc.credentials.createSsl(fs.readFileSync('spec/ssl/server.crt'));
      const repeaterProto = grpc.load('spec/protos/testapp/repeater.proto');
      repeaterClient = new repeaterProto.testapp.repeater.RepeaterService('localhost:50051',
        sslCreds);

      repeaterClient.simple(message, (error) => {
        expect(error).toBeNull();
        done();
      });
    });
  });
});

