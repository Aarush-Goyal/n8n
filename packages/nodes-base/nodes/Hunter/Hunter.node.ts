import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import {
	hunterApiRequest,
	hunterApiRequestAllItems,
} from './GenericFunctions';

export class Hunter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hunter',
		name: 'hunter',
		icon: 'file:hunter.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Consume Hunter API',
		defaults: {
			name: 'Hunter',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'hunterApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: ' Domain Search',
						value: 'domainSearch',
						description: 'Get every email address found on the internet using a given domain name, with sources',
					},
					{
						name: ' Email Finder',
						value: 'emailFinder',
						description: 'Generate or retrieve the most likely email address from a domain name, a first name and a last name',
					},
					{
						name: 'Email Verifier',
						value: 'emailVerifier',
						description: 'Verify the deliverability of an email address',
					},
				],
				default: 'domainSearch',
				description: 'operation to consume.',
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'domainSearch',
						],
					},
				},
				default: '',
				required: true,
				description: 'Domain name from which you want to find the email addresses. For example, "stripe.com".',
			},
			{
				displayName: 'Only Emails',
				name: 'onlyEmails',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'domainSearch',
						],
					},
				},
				default: true,
				description: 'Return only the the found emails.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'domainSearch',
						],
					},
				},
				default: false,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'domainSearch',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'How many results to return.',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						operation: [
							'domainSearch',
						],
					},
				},
				options: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						default: '',
						options: [
							{
								name: 'Personal',
								value: 'personal',
							},
							{
								name: 'Generic',
								value: 'generic',
							},
						],
					},
					{
						displayName: 'Seniority',
						name: 'seniority',
						type: 'multiOptions',
						default: [],
						options: [
							{
								name: 'Junior',
								value: 'junior',
							},
							{
								name: 'Senior',
								value: 'senior',
							},
							{
								name: 'Executive',
								value: 'executive',
							},
						],
					},
					{
						displayName: 'Department',
						name: 'department',
						type: 'multiOptions',
						default: [],
						options: [
							{
								name: 'Executive',
								value: 'executive',
							},
							{
								name: 'IT',
								value: 'it',
							},
							{
								name: 'Finance',
								value: 'finance',
							},
							{
								name: 'Management',
								value: 'management',
							},
							{
								name: 'Sales',
								value: 'sales',
							},
							{
								name: 'Legal',
								value: 'legal',
							},
							{
								name: 'Support',
								value: 'support',
							},
							{
								name: 'HR',
								value: 'hr',
							},
							{
								name: 'Marketing',
								value: 'marketing',
							},
							{
								name: 'Communication',
								value: 'communication',
							},
						],
					},
				],
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'emailFinder',
						],
					},
				},
				required: true,
				description: 'Domain name from which you want to find the email addresses. For example, "stripe.com".',
			},
			{
				displayName: 'First Name',
				name: 'firstname',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'emailFinder',
						],
					},
				},
				default: '',
				required: true,
				description: `The person's first name. It doesn't need to be in lowercase.`,
			},
			{
				displayName: 'Last Name',
				name: 'lastname',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'emailFinder',
						],
					},
				},
				default: '',
				required: true,
				description: `The person's last name. It doesn't need to be in lowercase.`,
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'emailVerifier',
						],
					},
				},
				default: '',
				required: true,
				description: 'The email address you want to verify.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		for (let i = 0; i < length; i++) {
			try {
				const operation = this.getNodeParameter('operation', 0) as string;
				//https://hunter.io/api-documentation/v2#domain-search
				if (operation === 'domainSearch') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					const domain = this.getNodeParameter('domain', i) as string;
					const onlyEmails = this.getNodeParameter('onlyEmails', i, false) as boolean;

					qs.domain = domain;
					if (filters.type){
						qs.type = filters.type;
					}
					if (filters.seniority){
						qs.seniority = (filters.seniority as string[]).join(',');
					}
					if (filters.department){
						qs.department = (filters.department as string[]).join(',');
					}
					if (returnAll) {
						responseData = await hunterApiRequestAllItems.call(this, 'data', 'GET', '/domain-search', {}, qs);

						// Make sure that the company information is there only once and
						// the emails are combined underneath it.
						if (onlyEmails === false) {
							let tempReturnData: IDataObject = {};

							for (let i = 0; i < responseData.length; i++) {
								if (i === 0) {
									tempReturnData = responseData[i];
									continue;
								}
								((tempReturnData as IDataObject).emails as IDataObject[]).push.apply(tempReturnData.emails, responseData[i].emails);
							}

							responseData = tempReturnData;
						}
					} else {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.limit = limit;
						responseData = await hunterApiRequest.call(this, 'GET', '/domain-search', {}, qs);
						responseData = responseData.data;
					}

					if (onlyEmails === true) {
						let tempReturnData: IDataObject[] = [];

						if (Array.isArray(responseData)) {
							for (const data of responseData) {
								tempReturnData.push.apply(tempReturnData, data.emails);
							}
						} else {
							tempReturnData = responseData.emails;
						}

						responseData = tempReturnData;
					}
				}
				//https://hunter.io/api-documentation/v2#email-finder
				if (operation === 'emailFinder') {
					const domain = this.getNodeParameter('domain', i) as string;
					const firstname = this.getNodeParameter('firstname', i) as string;
					const lastname = this.getNodeParameter('lastname', i) as string;
					qs.first_name = firstname;
					qs.last_name = lastname;
					qs.domain = domain;
					responseData = await hunterApiRequest.call(this, 'GET', '/email-finder', {}, qs);
					responseData = responseData.data;
				}
				//https://hunter.io/api-documentation/v2#email-verifier
				if (operation === 'emailVerifier') {
					const email = this.getNodeParameter('email', i) as string;
					qs.email = email;
					responseData = await hunterApiRequest.call(this, 'GET', '/email-verifier', {}, qs);
					responseData = responseData.data;
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
