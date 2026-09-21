const test = require('node:test');
const assert = require('node:assert');
const { collectPages } = require('../dist/nodes/Kraken/Kraken.node.js');

const noWait = async () => {};

function fakeKraken(total) {
	const calls = [];
	const fetchPage = async (ofs) => {
		calls.push(ofs);
		const entries = {};
		for (let n = ofs; n < Math.min(ofs + 50, total); n++) entries[`L${n}`] = { amount: String(n) };
		return { entries, count: total };
	};
	return { calls, fetchPage };
}

test('returnAll walks every page by offset', async () => {
	const k = fakeKraken(120);
	const rows = await collectPages(k.fetchPage, true, 50, noWait);
	assert.strictEqual(rows.length, 120);
	assert.deepStrictEqual(k.calls, [0, 50, 100]);
	assert.deepStrictEqual(rows[119], { id: 'L119', amount: '119' });
});

test('limit stops early and trims', async () => {
	const k = fakeKraken(120);
	const rows = await collectPages(k.fetchPage, false, 60, noWait);
	assert.strictEqual(rows.length, 60);
	assert.deepStrictEqual(k.calls, [0, 50]);
});

test('empty account returns nothing', async () => {
	const rows = await collectPages(fakeKraken(0).fetchPage, true, 50, noWait);
	assert.deepStrictEqual(rows, []);
});

test('rate limit is retried, other errors are not', async () => {
	let failures = 2;
	const inner = fakeKraken(10).fetchPage;
	const rows = await collectPages(
		async (ofs) => {
			if (failures-- > 0) throw new Error('["EAPI:Rate limit exceeded"]');
			return inner(ofs);
		},
		true,
		50,
		noWait,
	);
	assert.strictEqual(rows.length, 10);

	let attempts = 0;
	await assert.rejects(
		collectPages(
			async () => {
				attempts++;
				throw new Error('["EAPI:Invalid key"]');
			},
			true,
			50,
			noWait,
		),
		/Invalid key/,
	);
	assert.strictEqual(attempts, 1);
});
