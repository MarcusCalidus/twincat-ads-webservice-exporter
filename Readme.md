# twincat-ads-webservice-exporter - a Prometheus exporter for Beckhoff PLC via ADS WebService

twincat-ads-webservice-exporter is a generic Prometheus exporter for 
for Beckhoff PLC via ADS WebService ([What is ADS WebService?](https://infosys.beckhoff.com/english.php?content=../content/1033/tcadswebservice/html/webservice_intro.htm))

## Prerequisites
In order to run twincat-ads-webservice-exporter you need Node.js installed on your system.

## Installation
The Installation is simple as can be. 
```
npm i
```

## Configuration

The exporter is configured via the `targets.yaml` file located in the `config` folder. Each target represents an unique PLC.

You will have to create a targets.yaml before you can start the server!

```


```

## Running
To start the server run. 

```
node path/to/twincat-ads-webservice-exporter
```

or

```
npx path/to/twincat-ads-webservice-exporter
```

(You might want to run this as a service)

## Getting the values
The exporter provides the values as follows

```
http://{YourExporterServer}:9715/values

e.g. http://localhost:9715/values

Raw JSON Data like so: http://{YourExporterServer}:9715/valuesJson
```
