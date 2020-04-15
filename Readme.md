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

The exporter is configured via the `webservice.yaml` file located in the `config` folder. At the moment you can only access one webservice endpoint per exporter instance.

You will have to create a `webservice.yaml` before you can start the server!

```
url: http://your.server/TcAdsWebService/TcAdsWebService.dll    # ADS WebService URL
targets:
  - netId:  192.168.20.200.1.1          # netID of PLC to query from 
    port:   801                         # Port of PLC
    label:  info="myLabel"              # OPTIONAL label for all metrics on this target
    metrics:
      - name:       tank_fill_level    # name of metric as it appears to Prometheus  
        datatype:   int                # Datatype of value in ADS (int|byte|sint|dint|word|dword|bool|real|lreal) 
        metricType: gauge              # Type of metric as it appears to Prometheus (currently only gauge is supported) 
        help:       Fill level of tank # HELP string as it appears to Prometheus 
        symbol:     MAIN.intTankFill   # Symbol for value
      - name:       valve_status
        datatype:   byte                
        metricType: gauge             
        help:       Status of Valve               
        multiple:                      # ALTERNATIVELY to symbol it is possible to query multiple symbols for one metric 
          - symbol: MAIN.valve[1].status
            label: valve="1"          # Define labels to distinguish the values within one metric  
          - symbol: MAIN.valve[2].status
            label: valve="2"
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
