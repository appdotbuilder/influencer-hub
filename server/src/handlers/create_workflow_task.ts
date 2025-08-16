import { db } from '../db';
import { workflowTasksTable, usersTable, campaignsTable, contentTable } from '../db/schema';
import { type CreateWorkflowTaskInput, type WorkflowTask } from '../schema';
import { eq } from 'drizzle-orm';

export const createWorkflowTask = async (input: CreateWorkflowTaskInput): Promise<WorkflowTask> => {
  try {
    // Validate user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Validate assigned_to user exists if provided
    if (input.assigned_to) {
      const assignedUserExists = await db.select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, input.assigned_to))
        .execute();

      if (assignedUserExists.length === 0) {
        throw new Error(`Assigned user with id ${input.assigned_to} not found`);
      }
    }

    // Validate campaign exists if provided
    if (input.campaign_id) {
      const campaignExists = await db.select({ id: campaignsTable.id })
        .from(campaignsTable)
        .where(eq(campaignsTable.id, input.campaign_id))
        .execute();

      if (campaignExists.length === 0) {
        throw new Error(`Campaign with id ${input.campaign_id} not found`);
      }
    }

    // Validate content exists if provided
    if (input.content_id) {
      const contentExists = await db.select({ id: contentTable.id })
        .from(contentTable)
        .where(eq(contentTable.id, input.content_id))
        .execute();

      if (contentExists.length === 0) {
        throw new Error(`Content with id ${input.content_id} not found`);
      }
    }

    // Insert workflow task record
    const result = await db.insert(workflowTasksTable)
      .values({
        user_id: input.user_id,
        campaign_id: input.campaign_id || null,
        content_id: input.content_id || null,
        title: input.title,
        description: input.description || null,
        priority: input.priority,
        assigned_to: input.assigned_to || null,
        due_date: input.due_date || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Workflow task creation failed:', error);
    throw error;
  }
};