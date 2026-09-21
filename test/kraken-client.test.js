const test = require('node:test');
const assert = require('node:assert');
const {
	KrakenClient,
	KrakenApiError,
	nextNonce,
	sign,
} = require('../dist/nodes/Kraken/KrakenClient.js');

const noWait = async () => {};

test('signature matches the example in the Kraken REST docs', () => {
	const signature = sign(
		'/0/private/AddOrder',
		'nonce=1616492376594&ordertype=limit&pair=XBTUSD&price=37500&type=buy&volume=1.25',
		'1616492376594',
		'kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg==',
	);
	assert.strictEqual(
		signature,
		'4/dpxb3iT4tp/ZCVEwSnEsLxx0bqyhLpdfOpc6fn7OR8+UClSV5n9E6aSS8MPtnRfp32bAb0nmbRn6H8ndwLUQ==',
	);
});

test('nonces strictly increase even within one millisecond', () => {
	const nonces = Array.from({ length: 50 }, () => Number(nextNonce()));
	for (let n = 1; n < nonces.length; n++) assert.ok(nonces[n] > nonces[n - 1]);
});

test('private calls POST a signed form body', async () => {
	const seen = [];
	const secret = Buffer.from('secret').toString('base64');
	const client = new KrakenClient(async (req) => {
		seen.push(req);
		return { error: [], result: { ok: 1 } };
	}, 'key', secret);
	assert.deepStrictEqual(await client.private('Ledgers', { asset: 'XXBT', ofs: 0, type: '' }), { ok: 1 });
	const [req] = seen;
	assert.strictEqual(req.method, 'POST');
	assert.strictEqual(req.url, 'https://api.kraken.com/0/private/Ledgers');
	const body = new URLSearchParams(req.body);
	assert.strictEqual(body.get('asset'), 'XXBT');
	assert.strictEqual(body.get('ofs'), '0');
	assert.strictEqual(body.has('type'), false);
	assert.strictEqual(req.headers['API-Key'], 'key');
	assert.strictEqual(
		req.headers['API-Sign'],
		sign('/0/private/Ledgers', req.body, body.get('nonce'), secret),
	);
});

test('public calls GET with a query string', async () => {
	const seen = [];
	const client = new KrakenClient(async (req) => {
		seen.push(req);
		return { error: [], result: {} };
	});
	await client.public('Ticker', { pair: 'XBTEUR' });
	await client.public('Assets');
	assert.strictEqual(seen[0].method, 'GET');
	assert.strictEqual(seen[0].url, 'https://api.kraken.com/0/public/Ticker?pair=XBTEUR');
	assert.strictEqual(seen[1].url, 'https://api.kraken.com/0/public/Assets');
});

test('rate limits are retried with a fresh nonce, other errors are not', async () => {
	const nonces = [];
	let failures = 2;
	const client = new KrakenClient(
		async (req) => {
			nonces.push(new URLSearchParams(req.body).get('nonce'));
			if (failures-- > 0) return { error: ['EAPI:Rate limit exceeded'] };
			return { error: [], result: { done: true } };
		},
		'key',
		'c2VjcmV0',
		noWait,
	);
	assert.deepStrictEqual(await client.private('Balance'), { done: true });
	assert.strictEqual(nonces.length, 3);
	assert.strictEqual(new Set(nonces).size, 3);

	let calls = 0;
	const failing = new KrakenClient(
		async () => {
			calls++;
			return { error: ['EAPI:Invalid key'] };
		},
		'key',
		'c2VjcmV0',
		noWait,
	);
	await assert.rejects(failing.private('Balance'), (e) => e instanceof KrakenApiError && /Invalid key/.test(e.message));
	assert.strictEqual(calls, 1);
});

test('rate limit retries are bounded', async () => {
	let calls = 0;
	const client = new KrakenClient(
		async () => {
			if (++calls > 20) throw new Error('retries are unbounded');
			return { error: ['EAPI:Rate limit exceeded'] };
		},
		'key',
		'c2VjcmV0',
		noWait,
	);
	await assert.rejects(client.private('Balance'), /Rate limit/);
	assert.strictEqual(calls, 7);
});
