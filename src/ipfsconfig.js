const wrtc = require('wrtc')
const WebRTCStar = require('libp2p-webrtc-star')
const WebSockets = require('libp2p-websockets')
const WebRTCDirect = require('libp2p-webrtc-direct')
const KadDHT = require('libp2p-kad-dht')
const MulticastDNS = require('libp2p-mdns')
const TCP = require('libp2p-tcp')

const config = {
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
				'/dns4/three0-rtc-node.herokuapp.com/tcp/443/wss/p2p-webrtc-star/',
				'/dns4/p2p-circuit-constellation.herokuapp.com/tcp/443/wss/p2p/QmY8XpuX6VnaUVDz4uA14vpjv3CZYLif3wLPqCkgU2KLSB',
			],
		},
	},
}

module.exports = config
