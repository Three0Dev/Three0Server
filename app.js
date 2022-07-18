const express = require('express');
const IPFSLIB = require('ipfs-core')
const OrbitDB = require('orbit-db');
const wrtc = require('wrtc');
const WebRTCStar = require('libp2p-webrtc-star');
const WebSockets = require('libp2p-websockets');
const WebRTCDirect = require('libp2p-webrtc-direct');
const KadDHT = require('libp2p-kad-dht');
const MulticastDNS = require('libp2p-mdns');
const TCP = require('libp2p-tcp');
const morgan = require('morgan');

const app = express();
app.use(express.json());
app.use(morgan('dev'));

const port = process.env.PORT || 3000;

const ipfsConfig = {
  start: true,
  repo: './orbitdb-ipfs',
  EXPERIMENTAL: {
    pubsub: true,
  },
  preload: {
    enabled: false,
  },
  libp2p: {
    modules: {
      transport: [WebRTCStar, WebSockets, WebRTCDirect, TCP],
      peerDiscovery: [MulticastDNS],
      dht: KadDHT,
    },
    config: {
      peerDiscovery: {
        webRTCStar: {
          // <- note the lower-case w - see https://github.com/libp2p/js-libp2p/issues/576
          enabled: true,
        },
      },
      transport: {
        WebRTCStar: {
          // <- note the upper-case w- see https://github.com/libp2p/js-libp2p/issues/576
          wrtc,
        },
      },
    },
    transportManager: { faultTolerance: 1 },
  },
  config: {
    Addresses: {
      Swarm: [
        '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star/',
        '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star/',
        '/dns4/webrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star/',
      ],
    },
  },
}

let ORBITDB;
let PROGRAMS;

const DBCONNECTIONS = new Map();

app.get('/', (_req, res) => res.redirect('https://three0dev.com'));

app.post('/', async (req, res) => {
  if(!ORBITDB) {
    res.status(500).send('OrbitDB not initialized');
    console.error('OrbitDB not initialized');
  }else if(!PROGRAMS){
    res.status(500).send('Programs not ready');
    console.error('Programs not ready');
  }

  const { address, type } = req.body;

  try{
    console.log('Connecting to', address);
    // TODO: Add once connection is established
    // const multiHash = await PROGRAMS.add({address, type});
    // console.log('Added', address, 'to programs');
    const connection = await ORBITDB.open(address, {type})
    DBCONNECTIONS.set(address, {connection, type});
    res.status(201).send();
  }catch(e){
    console.error(e)
    res.status(500).send(e);
  }
});

app.delete('/', async (req, res) => {
  if(!ORBITDB) {
    res.status(500).send('OrbitDB not initialized');
    console.error('OrbitDB not initialized');
  }else if(!PROGRAMS){
    res.status(500).send('Programs not ready');
    console.error('Programs not ready');
  }

  const { address } = req.body;

  try{
    if(DBCONNECTIONS.has(address)){
      console.log('Closing connection to', address);
      const {connection, multiHash} = DBCONNECTIONS.get(address);
      await connection.drop();
      console.log('Dropped connection to', address);
      await PROGRAMS.remove(multiHash);
      console.log('Removed', address, 'from programs');
    }
    res.status(200).send();
  }catch(e){
    res.status(500).send(e);
  }

  console.log('Closing delete function.');
});

function terminateApp(signal){
  console.log(`Received ${signal}`);
  console.log('Closing http server.');
  server.close((err) => {
    if(ORBITDB){
      ORBITDB.disconnect().then(() => {
        console.log('Closed http server.');
        process.exit(err ? 1 : 0);
      }).catch(e => {
        console.error(e);
        process.exit(1);
      })
    }else{
      process.exit(err ? 1 : 0);
    }
  });
}

process.on('SIGINT', () => terminateApp('SIGINT'));
process.on('SIGTERM', () => terminateApp('SIGTERM'));

const server = app.listen(port, async () => {
  const IPFS = await IPFSLIB.create(ipfsConfig)
  ORBITDB = await OrbitDB.createInstance(IPFS)

  PROGRAMS = await ORBITDB.feed(`three0-master-database`, {
    accessController: { write: [ORBITDB.identity.id] },
    create: true,
  })

  await PROGRAMS.load()

  const allDB = PROGRAMS.iterator({ limit: -1 }).collect();

  allDB.forEach(db => {
    const dbEntry = db.payload.value
    ORBITDB.open(dbEntry.address, {type: dbEntry.type})
      .then((connection) => {
        // TODO: Check if payload.key is multiHash
        DBCONNECTIONS.set(dbEntry.address, {connection, multiHash: db.payload.key});
        console.log(`Opened ${dbAddress}`)
      })
      .catch(e => console.error(e));
  });

  console.log(`Replication Service listening on port ${port}`)
});

    

