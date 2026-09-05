import * as http from 'http';
import {AddressInfo} from 'net';
import {TcAdsWebService} from '../src/tc-ads-webservice';

import Client = TcAdsWebService.Client;
import DataWriter = TcAdsWebService.DataWriter;
import InternalError = TcAdsWebService.InternalError;

const soapEnvelope = (body: string) =>
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" ' +
    'xmlns:q1="http://beckhoff.org/message/">' +
    '<SOAP-ENV:Body>' + body + '</SOAP-ENV:Body></SOAP-ENV:Envelope>';

const axiosResponse = (data: string, status = 200): any => ({
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {'content-type': 'text/xml'},
    config: {}
});

/**
 * handleResponse is where the SOAP XML is parsed. It is the only consumer of the
 * DOM parser, so these cases pin the parsing behaviour independently of transport.
 */
describe('Client.handleResponse', () => {
    const client = new Client('http://localhost/unused', null, null);

    it('surfaces a SOAP fault as an InternalError carrying message and code', () => {
        const resp = client.handleResponse(axiosResponse(soapEnvelope(
            '<SOAP-ENV:Fault><faultstring>Symbol not found</faultstring>' +
            '<detail><errorcode>1808</errorcode></detail></SOAP-ENV:Fault>'
        )));

        expect(resp.hasError).toBe(true);
        expect(resp.error).toBeInstanceOf(InternalError);
        expect(resp.error.errorMessage).toBe('Symbol not found');
        expect(resp.error.errorCode).toBe('1808');
    });

    it('defaults the error code to "-" when the fault carries none', () => {
        const resp = client.handleResponse(axiosResponse(soapEnvelope(
            '<SOAP-ENV:Fault><faultstring>Broken</faultstring></SOAP-ENV:Fault>'
        )));

        expect(resp.error.errorCode).toBe('-');
    });

    it('decodes a readwrite response (ppRdData) into a readable DataReader', () => {
        const writer = new DataWriter();
        writer.writeDWORD(0);      // per-symbol error code
        writer.writeINT(1234);     // the value itself
        const resp = client.handleResponse(axiosResponse(soapEnvelope(
            '<q1:ReadWriteResponse><ppRdData>' + writer.getBase64EncodedData() + '</ppRdData></q1:ReadWriteResponse>'
        )));

        expect(resp.hasError).toBe(false);
        expect(resp.reader.readDWORD()).toBe(0);
        expect(resp.reader.readINT()).toBe(1234);
    });

    it('decodes a read response (ppData)', () => {
        const writer = new DataWriter();
        writer.writeDINT(-99);
        const resp = client.handleResponse(axiosResponse(soapEnvelope(
            '<q1:ReadResponse><ppData>' + writer.getBase64EncodedData() + '</ppData></q1:ReadResponse>'
        )));

        expect(resp.hasError).toBe(false);
        expect(resp.reader.readDINT()).toBe(-99);
    });

    it('reassembles base64 delivered as more than one child node', () => {
        // the service may split a long payload; handleResponse concatenates every child node
        const writer = new DataWriter();
        writer.writeDINT(1);
        const encoded = writer.getBase64EncodedData();
        const split = '<![CDATA[' + encoded.slice(0, 3) + ']]>' + encoded.slice(3);
        const resp = client.handleResponse(axiosResponse(soapEnvelope(
            '<q1:ReadWriteResponse><ppRdData>' + split + '</ppRdData></q1:ReadWriteResponse>'
        )));

        expect(resp.reader.readDINT()).toBe(1);
    });

    it('packs a readState response into two WORDs', () => {
        const resp = client.handleResponse(axiosResponse(soapEnvelope(
            '<q1:ReadStateResponse><pAdsState>5</pAdsState><pDeviceState>0</pDeviceState></q1:ReadStateResponse>'
        )));

        expect(resp.hasError).toBe(false);
        expect(resp.reader.readWORD()).toBe(5);
        expect(resp.reader.readWORD()).toBe(0);
    });

    it('returns a data-less success for a write response', () => {
        const resp = client.handleResponse(axiosResponse(soapEnvelope('<q1:WriteResponse/>')));

        expect(resp.hasError).toBe(false);
        expect(resp.reader).toBeUndefined();
    });

    it('reports a non-200 status as a request error without parsing a body', () => {
        const resp = client.handleResponse(axiosResponse('', 503));

        expect(resp.hasError).toBe(true);
        expect(resp.error).toBeInstanceOf(TcAdsWebService.ResquestError);
    });
});

/**
 * The SOAP request bodies are built by string concatenation, so they are asserted
 * against a real HTTP server rather than a mock - this also exercises the HTTP
 * client (auth, headers, timeout) end to end.
 */
describe('Client SOAP requests over HTTP', () => {
    let server: http.Server;
    let url: string;
    let lastRequest: { body: string, headers: http.IncomingHttpHeaders, action: string };
    let respondWith: string;

    beforeAll(done => {
        server = http.createServer((req, res) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                lastRequest = {body, headers: req.headers, action: String(req.headers.soapaction || '')};
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(respondWith);
            });
        });
        server.listen(0, '127.0.0.1', () => {
            url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/TcAdsWebService.dll`;
            done();
        });
    });

    afterAll(done => {
        server.close(() => done());
    });

    beforeEach(() => {
        const writer = new DataWriter();
        writer.writeDWORD(0);
        writer.writeINT(42);
        respondWith = soapEnvelope(
            '<q1:ReadWriteResponse><ppRdData>' + writer.getBase64EncodedData() + '</ppRdData></q1:ReadWriteResponse>'
        );
    });

    it('posts a well-formed ReadWrite envelope and decodes the reply', done => {
        new Client(url, null, null).readwrite(
            '192.168.20.200.1.1', 801,
            TcAdsWebService.TcAdsReservedIndexGroups.SymbolValuesByHandleList,
            1, 6, 'AQAAAA==',
            resp => {
                expect(lastRequest.headers['content-type']).toContain('text/xml');
                expect(lastRequest.body).toContain('<netId xsi:type="xsd:string">192.168.20.200.1.1</netId>');
                expect(lastRequest.body).toContain('<nPort xsi:type="xsd:int">801</nPort>');
                expect(lastRequest.body).toContain('<indexGroup xsi:type="xsd:unsignedInt">61568</indexGroup>');
                expect(lastRequest.body).toContain('<cbRdLen xsi:type="xsd:int">6</cbRdLen>');
                expect(lastRequest.body).toContain('<pwrData xsi:type="xsd:base64Binary">AQAAAA==</pwrData>');

                expect(resp.hasError).toBe(false);
                expect(resp.reader.readDWORD()).toBe(0);
                expect(resp.reader.readINT()).toBe(42);
                done();
            },
            null, 5000, err => done(err));
    });

    it('posts a well-formed ReadState envelope', done => {
        respondWith = soapEnvelope(
            '<q1:ReadStateResponse><pAdsState>5</pAdsState><pDeviceState>0</pDeviceState></q1:ReadStateResponse>'
        );

        new Client(url, null, null).readState(
            '1.2.3.4.1.1', 851,
            resp => {
                expect(lastRequest.body).toContain('<netId xsi:type="xsd:string">1.2.3.4.1.1</netId>');
                expect(lastRequest.body).toContain('<nPort xsi:type="xsd:int">851</nPort>');
                expect(resp.reader.readWORD()).toBe(5);
                done();
            },
            null, 5000, err => done(err));
    });

    it('sends HTTP basic auth when a user is configured', done => {
        new Client(url, 'plcuser', 'plcpass').readwrite(
            '1.2.3.4.1.1', 801, 0, 0, 0, '',
            () => {
                const expected = 'Basic ' + Buffer.from('plcuser:plcpass').toString('base64');
                expect(lastRequest.headers.authorization).toBe(expected);
                done();
            },
            null, 5000, err => done(err));
    });

    it('sends no auth header when no user is configured', done => {
        new Client(url, null, null).readwrite(
            '1.2.3.4.1.1', 801, 0, 0, 0, '',
            () => {
                expect(lastRequest.headers.authorization).toBeUndefined();
                done();
            },
            null, 5000, err => done(err));
    });

    it('routes transport failures to the error callback', done => {
        // port 1 on loopback refuses connections
        new Client('http://127.0.0.1:1/TcAdsWebService.dll', null, null).readwrite(
            '1.2.3.4.1.1', 801, 0, 0, 0, '',
            () => done(new Error('success callback must not run on a transport failure')),
            null, 2000,
            err => {
                expect(err).toBeDefined();
                done();
            });
    });
});

describe('getAxiosCredentials', () => {
    it('returns null when no user is set', () => {
        expect(new Client('http://x', null, null).getAxiosCredentials()).toBeNull();
    });

    it('returns the username/password pair when a user is set', () => {
        expect(new Client('http://x', 'u', 'p').getAxiosCredentials()).toEqual({username: 'u', password: 'p'});
    });
});
