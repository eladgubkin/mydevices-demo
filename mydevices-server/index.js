const express = require('express')
const app = express()
var snmp = require('snmp-native');
const ping = require('ping');

const DEVICE_TYPE = [1,3,6,1,2,1,1,1,0];
const UPTIME = [1,3,6,1,2,1,1,3,0];
const SYSTEM_NAME = [1,3,6,1,2,1,1,5,0];
const SYSTEM_LOCATION = [1,3,6,1,2,1,1,6,0];
const MAC_ADDRESS = [1,3,6,1,1,1,1,22]

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

app.get('/api/ping', (req, res) => {
    Promise.all(req.query.hosts.split(',').map(host => ping.promise.probe(host, { timeout: 1 }))).then((outputs) => {
        res.json(outputs.map(output => ({ host: output.host, alive: output.alive, time: output.time })));
    });
});

app.get('/api/scan', (req, res) => {

    const json = [];
    console.log(req.query.iprange);
    var evilscan = require('evilscan');
    var options = {
        target: decodeURI(req.query.iprange),
        port: '80',
        status: 'TROU', // Timeout, Refused, Open, Unreachable
        banner: true
    };

    var scanner = new evilscan(options);

    scanner.on('result',function(data) {
        if (data.status == 'open') {
            var session = new snmp.Session({ 
                host: data.ip, 
                port: 161, 
                community: 'public',
            });
        
            session.getAll({ oids: [DEVICE_TYPE, UPTIME, SYSTEM_NAME, SYSTEM_LOCATION, MAC_ADDRESS] }, function (error, varbinds) {
                if (error) {
                    console.log('Fail :(');
                } else {
                    json.push({
                        deviceType: varbinds[0].value,
                        uptime: varbinds[1].value,
                        systemName: varbinds[2].value,
                        systemLocation: varbinds[3].value,
                        macAddress: varbinds[4].value,
                        ip: data.ip
                    })
                }
            });
        }
    });

    scanner.on('error',function(err) {
        throw new Error(data.toString());
    });

    scanner.on('done',function() {
        // finished !
        res.json(json);

    });

    scanner.run();

    
});


app.get('/', (req, res) => res.send('Hello World!'))

app.listen(8080);

