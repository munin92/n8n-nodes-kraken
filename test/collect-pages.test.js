const test = require('node:test');
const assert = require('node:assert');
const { collectPages, timeRange } = require('../dist/nodes/Kraken/Kraken.node.js');

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
	const rows = await collectPages(k.fetchPage, true, 50);
	assert.strictEqual(rows.length, 120);
	assert.deepStrictEqual(k.calls, [0, 50, 100]);
	assert.deepStrictEqual(rows[119], { id: 'L119', amount: '119' });
});

test('limit stops early and trims', async () => {
	const k = fakeKraken(120);
	const rows = await collectPages(k.fetchPage, false, 60);
	assert.strictEqual(rows.length, 60);
	assert.deepStrictEqual(k.calls, [0, 50]);
});

test('empty account returns nothing', async () => {
	const rows = await collectPages(fakeKraken(0).fetchPage, true, 50);
	assert.deepStrictEqual(rows, []);
});

test('overlapping pages are deduplicated and offset counts raw entries', async () => {
	const calls = [];
	const pages = {
		0: { L3: {}, L2: {} },
		2: { L2: {}, L1: {} },
		4: { L0: {} },
	};
	const rows = await collectPages(
		async (ofs) => {
			calls.push(ofs);
			return { entries: pages[ofs] ?? {}, count: 5 };
		},
		true,
		50,
	);
	assert.deepStrictEqual(
		rows.map((r) => r.id),
		['L3', 'L2', 'L1', 'L0'],
	);
	assert.deepStrictEqual(calls, [0, 2, 4]);
});

test('timeRange pins end to now when unset', () => {
	assert.deepStrictEqual(timeRange({}, 1700000000), { end: 1700000000 });
	assert.deepStrictEqual(timeRange({ start: '2026-09-01T00:00:00Z' }, 1700000000), {
		start: 1788220800,
		end: 1700000000,
	});
	assert.deepStrictEqual(timeRange({ end: '2026-09-02T00:00:00Z' }, 1), { end: 1788307200 });
});

test('timeRange rejects unparseable dates instead of sending NaN', () => {
	assert.throws(() => timeRange({ start: 'Invalid DateTime' }), /"start" is not a valid date/);
	assert.throws(() => timeRange({ end: 'nope' }), /"end" is not a valid date/);
});
