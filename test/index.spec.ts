import request from 'supertest';

const getValues = jest.fn();

jest.mock('../src/tc-ads-webservice-backend', () => ({
    TcAdsWebserviceBackend: jest.fn().mockImplementation(() => ({getValues}))
}));

import {of, throwError} from 'rxjs';
import {TcAdsWebService} from '../src/tc-ads-webservice';
// jest hoists the mock above the imports, so the backend constructed when
// ../src/index is first loaded is already the stub
import {app} from '../src/index';

const sampleGroups = [
    [
        {metric: {name: 'tank_fill_level', help: 'Fill level', metricType: 'gauge'}, label: ['tank="1"'], value: 17},
        {metric: {name: 'tank_fill_level', help: 'Fill level', metricType: 'gauge'}, label: ['tank="2"'], value: 42}
    ],
    [
        {metric: {name: 'plc_state', help: 'PLC state', metricType: 'gauge'}, label: [], value: 5}
    ]
];

describe('GET /values', () => {
    it('renders the Prometheus text exposition format', async () => {
        getValues.mockReturnValue(of(sampleGroups));

        const res = await request(app).get('/values').expect(200);

        expect(res.headers['content-type']).toContain('text/plain');
        expect(res.text).toBe(
            '# HELP tank_fill_level Fill level\n' +
            '# TYPE tank_fill_level gauge\n' +
            'tank_fill_level{tank="1"} 17\n' +
            'tank_fill_level{tank="2"} 42\n' +
            '# HELP plc_state PLC state\n' +
            '# TYPE plc_state gauge\n' +
            'plc_state 5\n'
        );
    });

    it('omits the label braces when a metric has no labels', async () => {
        getValues.mockReturnValue(of([[{metric: {name: 'm', help: 'h', metricType: 'gauge'}, label: [], value: 1}]]));

        const res = await request(app).get('/values').expect(200);

        expect(res.text).toContain('\nm 1\n');
        expect(res.text).not.toContain('{}');
    });

    it('answers 500 with the serialised error on an InternalError', async () => {
        getValues.mockReturnValue(throwError(() => new TcAdsWebService.InternalError('Symbol not found', 1808)));

        const res = await request(app).get('/values').expect(500);

        expect(JSON.parse(res.text)).toEqual({errorMessage: 'Symbol not found', errorCode: 1808});
    });

    it('answers 500 with the error text on any other failure', async () => {
        getValues.mockReturnValue(throwError(() => new Error('connection refused')));

        const res = await request(app).get('/values').expect(500);

        expect(res.text).toContain('connection refused');
    });
});

describe('GET /valuesJson', () => {
    it('wraps the grouped values in a success envelope', async () => {
        getValues.mockReturnValue(of(sampleGroups));

        const res = await request(app).get('/valuesJson').expect(200);

        expect(res.headers['content-type']).toContain('application/json');
        expect(JSON.parse(res.text)).toEqual({success: true, data: sampleGroups});
    });

    it('answers 500 with a failure envelope', async () => {
        getValues.mockReturnValue(throwError(() => new TcAdsWebService.InternalError('boom', 42)));

        const res = await request(app).get('/valuesJson').expect(500);

        const body = JSON.parse(res.text);
        expect(body.success).toBe(false);
        expect(body.error).toEqual({errorMessage: 'boom', errorCode: 42});
    });
});
