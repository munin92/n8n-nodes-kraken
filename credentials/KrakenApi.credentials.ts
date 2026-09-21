import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class KrakenApi implements ICredentialType {
	name = 'krakenApi';
	displayName = 'Kraken API';
	documentationUrl = 'https://docs.kraken.com/rest/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Kraken API key',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			required: true,
			description: 'Your Kraken API secret',
		},
	];
}
