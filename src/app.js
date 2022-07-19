const express = require('express')
const IPFSLIB = require('ipfs-core')
const OrbitDB = require('orbit-db')
const morgan = require('morgan')
const cors = require('cors')
const ipfsConfig = require('./ipfsconfig')

const app = express()
app.use(express.json())
app.use(morgan('dev'))
app.use(cors())

const port = process.env.PORT || 8080

let ORBITDB
let PROGRAMS

const DBCONNECTIONS = new Map()

app.get('/', (_req, res) => res.redirect('https://three0dev.com'))

app.post('/', async (req, res) => {
	if (!ORBITDB) {
		res.status(500).send('OrbitDB not initialized')
		console.error('OrbitDB not initialized')
	} else if (!PROGRAMS) {
		res.status(500).send('Programs not ready')
		console.error('Programs not ready')
	}

	const { address, type } = req.body

	if (DBCONNECTIONS.has(address)) {
		res.status(200).send('Already connected')
		return
	}

	try {
		console.log('Connecting to', address)

		const multiHash = await PROGRAMS.add({ address, type })
		console.log('Added', address, 'to programs')

		const connection = await ORBITDB.open(address, { type })
		console.log('Opened', address)

		DBCONNECTIONS.set(address, { connection, type, multiHash })
		res.status(201).send()
	} catch (e) {
		console.error(e)
		res.status(500).send(e)
	}
})

app.delete('/', async (req, res) => {
	if (!ORBITDB) {
		res.status(500).send('OrbitDB not initialized')
		console.error('OrbitDB not initialized')
	} else if (!PROGRAMS) {
		res.status(500).send('Programs not ready')
		console.error('Programs not ready')
	}

	const { address } = req.body

	try {
		if (DBCONNECTIONS.has(address)) {
			console.log('Closing connection to', address)
			const { connection, multiHash } = DBCONNECTIONS.get(address)
			await connection.drop()
			console.log('Dropped connection to', address)
			await PROGRAMS.remove(multiHash)
			console.log('Removed', address, 'from programs')
			DBCONNECTIONS.delete(address)
		}
		res.status(200).send()
	} catch (e) {
		res.status(500).send(e)
	}
})

const server = app.listen(port, async () => {
	const IPFS = await IPFSLIB.create(ipfsConfig)
	ORBITDB = await OrbitDB.createInstance(IPFS)

	PROGRAMS = await ORBITDB.feed(`three0-master-database`, {
		accessController: { write: [ORBITDB.identity.id] },
		create: true,
	})

	await PROGRAMS.load()

	const allDB = PROGRAMS.iterator({ limit: -1 }).collect()

	allDB.forEach((db) => {
		const dbEntry = db.payload.value
		ORBITDB.open(dbEntry.address, { type: dbEntry.type })
			.then((connection) => {
				// TODO: Check if payload.key is multiHash
				DBCONNECTIONS.set(dbEntry.address, {
					connection,
					multiHash: db.payload.key,
				})
				console.log(`Opened ${dbEntry.address}`)
			})
			.catch((e) => console.error(e))
	})

	console.log(`Replication Service listening on port ${port}`)
})

function terminateApp(signal) {
	console.log(`Received ${signal}`)
	console.log('Closing http server.')
	server.close((err) => {
		if (ORBITDB) {
			ORBITDB.disconnect()
				.then(() => {
					console.log('Closed http server.')
					process.exit(err ? 1 : 0)
				})
				.catch((e) => {
					console.error(e)
					process.exit(1)
				})
		} else {
			process.exit(err ? 1 : 0)
		}
	})
}

process.on('SIGINT', () => terminateApp('SIGINT'))
process.on('SIGTERM', () => terminateApp('SIGTERM'))
