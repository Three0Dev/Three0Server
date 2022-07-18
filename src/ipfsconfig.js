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
				'/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star/',
				'/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star/',
				'/dns4/webrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star/',
			],
		},
	},
}

module.exports = config
