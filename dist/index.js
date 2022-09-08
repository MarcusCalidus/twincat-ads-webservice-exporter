"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tc_ads_webservice_backend_1 = require("./tc-ads-webservice-backend");
const tc_ads_webservice_1 = require("./tc-ads-webservice");
var InternalError = tc_ads_webservice_1.TcAdsWebService.InternalError;
const serverPort = 9715;
const app = (0, express_1.default)();
const adsBackend = new tc_ads_webservice_backend_1.TcAdsWebserviceBackend();
app.get('/valuesJson', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    adsBackend.getValues()
        .subscribe(data => {
        res.end(JSON.stringify({ success: true, data }));
    }, error => {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error }));
    });
});
app.get('/values', (req, res) => {
    res.setHeader('Content-Type', 'text/plain;charset=utf-8');
    adsBackend.getValues()
        .subscribe((data) => {
        const result = [];
        data.forEach((metric) => {
            result.push(`# HELP ${metric[0].metric.name} ${metric[0].metric.help}`);
            result.push(`# TYPE ${metric[0].metric.name} ${metric[0].metric.metricType}`);
            metric.forEach((line) => result.push(`${line.metric.name}${(line.label || []).length > 0 ? '{' + line.label.join(',') + '}' : ''} ${line.value}`));
        });
        res.end(result.join('\n') + '\n');
    }, error => {
        res.statusCode = 500;
        if (error instanceof InternalError) {
            res.send(JSON.stringify(error));
        }
        else {
            res.end(error.toString());
        }
    });
});
// start the Express server
app.listen(serverPort, () => {
    console.log(`server started at http://localhost:${serverPort}`);
});
//# sourceMappingURL=index.js.map