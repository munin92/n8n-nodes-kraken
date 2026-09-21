import { createHash, createHmac } from 'node:crypto';
import { type IDataObject, sleep } from 'n8n-workflow';

export const KRAKEN_API = 'https://api.kraken.com';
const RATE_LIMIT_RETRIES = 6;
const RATE_LIMIT_WAIT_MS = 10_000;

export interface KrakenRequest {
	method: 'GET' | 'POST';
	url: string;
	headers: Record<string, string>;
	body?: string;
}

export type KrakenTransport = (request: KrakenRequest) => Promise<unknown>;

export class KrakenApiError extends Error {
	constructor(readonly errors: string[]) {
		super(errors.join(', '));
		this.name = 'KrakenApiError';
	}
}

// Same scheme as node-kraken-api (milliseconds, bumped on ties): a key must never see a lower nonce.
let lastNonce = 0;
export function nextNonce(): string {
	const now = Date.now();
	lastNonce = now > lastNonce ? now : lastNonce + 1;
	return String(lastNonce);
}

export function sign(path: string, postData: string, nonce: string, secret: string): string {
	const digest = createHash('sha256')
		.update(nonce + postData)
		.digest();
	return createHmac('sha512', Buffer.from(secret, 'base64'))
		.update(path)
		.update(digest)
		.digest('base64');
}

function encode(params: IDataObject): string {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
	}
	return query.toString();
}

export class KrakenClient {
	constructor(
		private readonly transport: KrakenTransport,
		private readonly key = '',
		private readonly secret = '',
		private readonly wait: (ms: number) => Promise<void> = sleep,
	) {}

	async public(endpoint: string, params: IDataObject = {}): Promise<IDataObject> {
		const query = encode(params);
		const url = `${KRAKEN_API}/0/public/${endpoint}${query ? `?${query}` : ''}`;
		return await this.send(() => ({ method: 'GET', url, headers: {} }));
	}

	async private(endpoint: string, params: IDataObject = {}): Promise<IDataObject> {
		const path = `/0/private/${endpoint}`;
		return await this.send(() => {
			const nonce = nextNonce();
			const body = encode({ nonce, ...params });
			return {
				method: 'POST',
				url: `${KRAKEN_API}${path}`,
				headers: {
					'API-Key': this.key,
					'API-Sign': sign(path, body, nonce, this.secret),
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body,
			};
		});
	}

	// Kraken answers bursts with EAPI:Rate limit exceeded; private history pages cost the most.
	private async send(build: () => KrakenRequest): Promise<IDataObject> {
		for (let attempt = 0; ; attempt++) {
			const response = (await this.transport(build())) as {
				error?: string[];
				result?: IDataObject;
			};
			const errors = response?.error ?? [];
			if (errors.length === 0) return response?.result ?? {};
			const rateLimited = errors.some((e) => e.includes('Rate limit'));
			if (!rateLimited || attempt >= RATE_LIMIT_RETRIES) throw new KrakenApiError(errors);
			await this.wait(RATE_LIMIT_WAIT_MS);
		}
	}
}
