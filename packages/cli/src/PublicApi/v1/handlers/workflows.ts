import express = require('express');
import { INode } from 'n8n-workflow';
import { ActiveWorkflowRunner, Db } from '../../..';
import { SharedWorkflow } from '../../../databases/entities/SharedWorkflow';
import { WorkflowEntity } from '../../../databases/entities/WorkflowEntity';
import { replaceInvalidCredentials } from '../../../WorkflowHelpers';
// import { validateEntity } from '../../../GenericHelpers';
import { authorize, instanceOwnerSetup } from '../../middlewares';
import { WorkflowRequest } from '../../publicApiRequest';
import { getWorkflowOwnerRole } from '../../Services/role';
import { isInstanceOwner } from '../../Services/user';
import {
	getWorkflowById,
	getWorkflowAccess,
	activeWorkflow,
	desactiveWorkflow,
} from '../../Services/workflow';

export = {
	createWorkflow: [
		instanceOwnerSetup,
		authorize(['owner', 'member']),
		async (req: WorkflowRequest.Create, res: express.Response): Promise<express.Response> => {
			let workflow = req.body;

			const startNode: INode = {
				parameters: {},
				name: 'Start',
				type: 'n8n-nodes-base.start',
				typeVersion: 1,
				position: [240, 300],
			};

			workflow.active = false;

			// add start node if nodes property empty or start node
			// not found in the array
			if (
				!workflow.nodes.length ||
				!workflow.nodes.find((node) => node.type === 'n8n-nodes-base.start')
			) {
				workflow.nodes.push(startNode);
			}

			const role = await getWorkflowOwnerRole();

			// is this still needed?
			await replaceInvalidCredentials(workflow);

			await Db.transaction(async (transactionManager) => {
				const newWorkflow = new WorkflowEntity();
				Object.assign(newWorkflow, workflow);
				workflow = await transactionManager.save<WorkflowEntity>(newWorkflow);
				const newSharedWorkflow = new SharedWorkflow();
				Object.assign(newSharedWorkflow, {
					role,
					user: req.user,
					workflow,
				});
				await transactionManager.save<SharedWorkflow>(newSharedWorkflow);
			});

			return res.json(workflow);
		},
	],
	deleteWorkflow: [],
	getWorkflow: [],
	getWorkflows: [],
	updateWorkflow: [],
	activateWorkflow: [
		instanceOwnerSetup,
		authorize(['owner', 'member']),
		async (req: WorkflowRequest.Activate, res: express.Response): Promise<express.Response> => {
			const { workflowId } = req.params;

			const workflow = await getWorkflowById(workflowId);
			if (workflow === undefined) {
				return res.status(404).json();
			}

			const workflowRunner = ActiveWorkflowRunner.getInstance();

			const activateWorkflow = async (w: WorkflowEntity) => {
				await workflowRunner.add(w.id.toString(), 'activate');
				// change the status to active in the DB
				await activeWorkflow(workflow);
				workflow.active = true;
			};

			if (isInstanceOwner(req.user)) {
				if (!workflow.active) {
					try {
						await activateWorkflow(workflow);
						return res.json(workflow);
					} catch (error) {
						// todo
						// remove the type assertion
						const errorObject = error as unknown as { message: string };
						return res.status(400).json({ error: errorObject.message });
					}
				}
				// nothing to do as the wokflow is already active
				return res.json(workflow);
			}

			const userHasAccessToWorkflow = await getWorkflowAccess(req.user, workflowId.toString());

			if (userHasAccessToWorkflow) {
				if (!workflow.active) {
					try {
						await activateWorkflow(workflow);
						return res.json(workflow);
					} catch (error) {
						// todo
						// remove the type assertion
						const errorObject = error as unknown as { message: string };
						return res.status(400).json({ error: errorObject.message });
					}
				}
				return res.json(workflow);
			}
			// member trying to access workflow that does not own
			// 404 or 403?
			// 403 will let him know about the existance of the workflow
			return res.status(404).json();
		},
	],
	desactivateWorkflow: [
		instanceOwnerSetup,
		authorize(['owner', 'member']),
		async (req: WorkflowRequest.Activate, res: express.Response): Promise<express.Response> => {
			const { workflowId } = req.params;

			const workflow = await getWorkflowById(workflowId);
			if (workflow === undefined) {
				return res.status(404).json();
			}

			const workflowRunner = ActiveWorkflowRunner.getInstance();

			const desactivateWorkflow = async (w: WorkflowEntity) => {
				await workflowRunner.remove(w.id.toString());
				// change the status to active in the DB
				await desactiveWorkflow(workflow);
				workflow.active = false;
			};

			if (isInstanceOwner(req.user)) {
				if (workflow.active) {
					try {
						await desactivateWorkflow(workflow);
						return res.json(workflow);
					} catch (error) {
						// todo
						// remove the type assertion
						const errorObject = error as unknown as { message: string };
						return res.status(400).json({ error: errorObject.message });
					}
				}
				// nothing to do as the wokflow is already desactive
				return res.json(workflow);
			}

			const userHasAccessToWorkflow = await getWorkflowAccess(req.user, workflowId.toString());

			if (userHasAccessToWorkflow) {
				if (workflow.active) {
					try {
						await desactivateWorkflow(workflow);
						return res.json(workflow);
					} catch (error) {
						// todo
						// remove the type assertion
						const errorObject = error as unknown as { message: string };
						return res.status(400).json({ error: errorObject.message });
					}
				}
				return res.json(workflow);
			}
			// member trying to access workflow that does not own
			// 404 or 403?
			// 403 will let him know about the existance of the workflow
			return res.status(404).json();
		},
	],
};
