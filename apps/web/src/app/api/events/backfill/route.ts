import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import pMap from 'p-map';

import {
  type ClineMessage,
  TelemetryEventName,
  clineMessageSchema,
  telemetryPropertiesSchema,
} from '@roo-code/types';

import { authorizeApi } from '@/actions/auth';
import { captureEvent } from '@/actions/analytics';

export async function POST(request: NextRequest) {
  const authResult = await authorizeApi(request);

  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 },
    );
  }

  const { userId, orgId } = authResult;

  try {
    const formData = await request.formData();
    const taskId = formData.get('taskId') as string;

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId is required' },
        { status: 400 },
      );
    }

    const properties = telemetryPropertiesSchema.parse(
      JSON.parse(formData.get('properties') as string),
    );

    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      );
    }

    const fileContent = await file.text();
    let messages: ClineMessage[];

    try {
      const parsedContent = JSON.parse(fileContent);

      const messagesResult = z
        .array(clineMessageSchema)
        .safeParse(parsedContent);

      if (!messagesResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid file content: ${messagesResult.error.message}`,
          },
          { status: 400 },
        );
      }

      messages = messagesResult.data;
    } catch (_error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON file format',
        },
        { status: 400 },
      );
    }

    const message = messages[0];

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'File contains no messages' },
        { status: 400 },
      );
    }

    const defaultMode = extractMode(messages[0]?.text) || properties.mode;

    await captureEvent({
      id: uuidv4(),
      orgId,
      userId,
      timestamp: Math.round(message.ts / 1000),
      event: {
        type: TelemetryEventName.TASK_CREATED,
        properties: { taskId, ...properties, mode: defaultMode },
      },
    });

    await pMap(
      messages,
      async (message) => {
        const id = uuidv4();
        const timestamp = Math.round(message.ts / 1000);
        const mode = extractMode(message.text) || defaultMode;

        if (message.say === 'api_req_started') {
          try {
            const result = apiReqStartedSchema.safeParse(
              JSON.parse(message.text || '{}'),
            );

            if (
              result.success &&
              (result.data.tokensIn ||
                result.data.tokensOut ||
                result.data.cost)
            ) {
              await captureEvent({
                id: uuidv4(),
                orgId,
                userId,
                timestamp,
                event: {
                  type: TelemetryEventName.LLM_COMPLETION,
                  properties: {
                    taskId,
                    ...properties,
                    mode,
                    inputTokens: result.data.tokensIn ?? 0,
                    outputTokens: result.data.tokensOut ?? 0,
                    cacheReadTokens: result.data.cacheReads,
                    cacheWriteTokens: result.data.cacheWrites,
                    cost: result.data.cost,
                  },
                },
              });
            }
          } catch {
            // Ignore JSON parsing and validation errors.
          }
        } else if (message.say === 'completion_result') {
          await captureEvent({
            id: uuidv4(),
            orgId,
            userId,
            timestamp,
            event: {
              type: TelemetryEventName.TASK_COMPLETED,
              properties: { taskId, ...properties, mode },
            },
          });
        }

        const event = {
          type: TelemetryEventName.TASK_MESSAGE as const,
          properties: { taskId, message, ...properties, mode },
        };

        await captureEvent({ id, orgId, userId, timestamp, event });
      },
      { concurrency: 10 },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

const apiReqStartedSchema = z.object({
  tokensIn: z.number().optional(),
  tokensOut: z.number().optional(),
  cacheReads: z.number().optional(),
  cacheWrites: z.number().optional(),
  cost: z.number().optional(),
});

/**
 * Extracts the mode from a message text if it contains a <slug>mode</slug> pattern.
 * @param text - The message text to parse
 * @returns The extracted mode or null if no mode slug is found
 */
function extractMode(text: string | undefined): string | null {
  if (!text) {
    return null;
  }

  const modeMatch = text.match(/<slug>(.+?)<\/slug>/);
  return modeMatch && modeMatch[1] ? modeMatch[1] : null;
}
