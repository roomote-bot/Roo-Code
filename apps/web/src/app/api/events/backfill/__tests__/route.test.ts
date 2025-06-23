// pnpm test src/app/api/events/backfill/__tests__/route.test.ts

import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

import { authorizeApi } from '@/actions/auth';
import { analytics } from '@/lib/server';
import type { ApiAuthResult } from '@/types';

import { POST } from '../route';

vi.mock('@/actions/auth', () => ({
  authorizeApi: vi.fn(),
}));

const mockAuthorizeApi = vi.mocked(authorizeApi);

describe('/api/events/backfill', () => {
  const testProperties = {
    appName: 'test-app',
    appVersion: '1.0.0',
    vscodeVersion: '1.80.0',
    platform: 'darwin',
    editorName: 'vscode',
    language: 'typescript',
    mode: 'code',
    provider: 'anthropic',
    model: 'claude-3-sonnet',
    sessionId: 'test-session-123',
    isSubtask: false,
  };

  afterEach(async () => {
    // Clean up any test data from the analytics database.
    try {
      await analytics.command({
        query: `DELETE FROM messages WHERE taskId LIKE 'test-%'`,
      });
    } catch {
      // Ignore cleanup errors.
    }
  });

  it('should successfully process a backfill request with valid file upload', async () => {
    mockAuthorizeApi.mockResolvedValue({
      success: true,
      userId: 'test-user-id',
      orgId: 'test-org-id',
      userType: 'user',
      orgRole: 'admin',
    } as unknown as ApiAuthResult);

    const messages = [
      {
        ts: 1750702747687,
        type: 'say' as const,
        say: 'text' as const,
        text: 'Test message',
        images: [],
      },
      {
        ts: 1750702747696,
        type: 'say' as const,
        say: 'api_req_started' as const,
        text: 'API request started',
        images: [],
      },
    ];

    const fileContent = JSON.stringify(messages);
    const file = new File([fileContent], 'test-messages.json', {
      type: 'application/json',
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('taskId', 'test-task-integration');
    formData.append('properties', JSON.stringify(testProperties));

    const request = new NextRequest(
      'http://localhost:3000/api/events/backfill',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);

    const dbResults = await analytics.query({
      query: `
        SELECT
          taskId,
          mode,
          text,
          type as messageType,
          say,
          ts
        FROM messages
        WHERE taskId = 'test-task-integration'
        ORDER BY ts ASC
      `,
      format: 'JSONEachRow',
    });

    const dbData = (await dbResults.json()) as Array<{
      taskId: string;
      mode: string;
      text: string;
      messageType: string;
      say: string;
      ts: number;
    }>;

    expect(dbData).toHaveLength(2);

    expect(dbData[0]).toMatchObject({
      taskId: 'test-task-integration',
      mode: 'code',
      text: 'Test message',
      messageType: 'say',
      say: 'text',
    });

    expect(dbData[1]).toMatchObject({
      taskId: 'test-task-integration',
      mode: 'code',
      text: 'API request started',
      messageType: 'say',
      say: 'api_req_started',
    });

    expect(typeof dbData[0]?.ts).toBe('number');
    expect(typeof dbData[1]?.ts).toBe('number');
  });

  it('should successfully process a backfill request using task.json file', async () => {
    mockAuthorizeApi.mockResolvedValue({
      success: true,
      userId: 'test-user-id',
      orgId: 'test-org-id',
      userType: 'user',
      orgRole: 'admin',
    } as unknown as ApiAuthResult);

    const taskJsonPath = path.join(__dirname, 'task.json');
    const taskJsonContent = fs.readFileSync(taskJsonPath, 'utf-8');
    const messages = JSON.parse(taskJsonContent);

    const file = new File([taskJsonContent], 'task.json', {
      type: 'application/json',
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('taskId', 'test-task-from-file');
    formData.append('properties', JSON.stringify(testProperties));

    const request = new NextRequest(
      'http://localhost:3000/api/events/backfill',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);

    const dbResults = await analytics.query({
      query: `
        SELECT
          taskId,
          mode,
          text,
          type as messageType,
          say,
          timestamp
        FROM messages
        WHERE taskId = 'test-task-from-file'
        ORDER BY timestamp ASC
      `,
      format: 'JSONEachRow',
    });

    const dbData = (await dbResults.json()) as Array<{
      taskId: string;
      mode: string;
      text: string;
      messageType: string;
      say: string;
      timestamp: number;
    }>;

    expect(dbData).toHaveLength(messages.length);

    const textMessage = dbData.find((msg) => msg.say === 'text');
    expect(textMessage).toMatchObject({
      taskId: 'test-task-from-file',
      mode: 'code',
      text: 'Usql psql, how can I get all the namespaces?',
      messageType: 'say',
      say: 'text',
    });

    const apiMessage = dbData.find((msg) => msg.say === 'api_req_started');
    expect(apiMessage).toMatchObject({
      taskId: 'test-task-from-file',
      mode: 'code',
      messageType: 'say',
      say: 'api_req_started',
    });

    expect(textMessage?.timestamp).toBeTypeOf('number');
    expect(apiMessage?.timestamp).toBeTypeOf('number');

    const messageTypes = dbData.map((item) => item.say);
    expect(messageTypes).toContain('text');
    expect(messageTypes).toContain('api_req_started');
    expect(messageTypes).toContain('checkpoint_saved');
    expect(messageTypes).toContain('reasoning');
    expect(messageTypes).toContain('completion_result');
  });

  it('should return 401 if authentication fails', async () => {
    mockAuthorizeApi.mockResolvedValue({
      success: false,
      error: 'Authentication failed',
    });

    const formData = new FormData();
    formData.append('file', new File(['[]'], 'test.json'));
    formData.append('properties', JSON.stringify(testProperties));
    formData.append('taskId', 'test');

    const request = new NextRequest(
      'http://localhost:3000/api/events/backfill',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBe('Authentication required');

    const dbResults = await analytics.query({
      query: `SELECT COUNT() as count FROM messages WHERE taskId = 'test'`,
      format: 'JSONEachRow',
    });

    const dbData = (await dbResults.json()) as Array<{ count: string }>;
    expect(dbData[0]?.count).toBe('0');
  });

  it('should return 400 if no file is provided', async () => {
    mockAuthorizeApi.mockResolvedValue({
      success: true,
      userId: 'test-user-id',
      orgId: 'test-org-id',
      userType: 'user',
      orgRole: 'admin',
    } as unknown as ApiAuthResult);

    const formData = new FormData();
    formData.append('taskId', 'test-task-id');
    formData.append('properties', JSON.stringify(testProperties));

    const request = new NextRequest(
      'http://localhost:3000/api/events/backfill',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBe('No file provided');
  });

  it('should return 400 if taskId is missing', async () => {
    mockAuthorizeApi.mockResolvedValue({
      success: true,
      userId: 'test-user-id',
      orgId: 'test-org-id',
      userType: 'user',
      orgRole: 'admin',
    } as unknown as ApiAuthResult);

    const formData = new FormData();
    formData.append('file', new File(['[]'], 'test.json'));
    formData.append('properties', JSON.stringify(testProperties));

    const request = new NextRequest(
      'http://localhost:3000/api/events/backfill',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBe('taskId is required');
  });

  it('should return 400 for invalid JSON content', async () => {
    mockAuthorizeApi.mockResolvedValue({
      success: true,
      userId: 'test-user-id',
      orgId: 'test-org-id',
      userType: 'user',
      orgRole: 'admin',
    } as unknown as ApiAuthResult);

    const formData = new FormData();
    formData.append('file', new File(['invalid json content'], 'test.json'));
    formData.append('taskId', 'test-task-id');
    formData.append('properties', JSON.stringify(testProperties));

    const request = new NextRequest(
      'http://localhost:3000/api/events/backfill',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBe('Invalid JSON file format');
  });

  it('should return 400 for empty message array', async () => {
    mockAuthorizeApi.mockResolvedValue({
      success: true,
      userId: 'test-user-id',
      orgId: 'test-org-id',
      userType: 'user',
      orgRole: 'admin',
    } as unknown as ApiAuthResult);

    const formData = new FormData();
    formData.append('file', new File(['[]'], 'test.json'));
    formData.append('properties', JSON.stringify(testProperties));
    formData.append('taskId', 'test-task-id');

    const request = new NextRequest(
      'http://localhost:3000/api/events/backfill',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBe('File contains no messages');
  });

  it('should extract mode from individual messages when mode slug is present', async () => {
    mockAuthorizeApi.mockResolvedValue({
      success: true,
      userId: 'test-user-id',
      orgId: 'test-org-id',
      userType: 'user',
      orgRole: 'admin',
    } as unknown as ApiAuthResult);

    const messages = [
      {
        ts: 1750702747687,
        type: 'say' as const,
        say: 'text' as const,
        text: 'Starting task in <slug>debug</slug> mode',
        images: [],
      },
      {
        ts: 1750702747696,
        type: 'say' as const,
        say: 'api_req_started' as const,
        text: 'API request started',
        images: [],
      },
      {
        ts: 1750702747705,
        type: 'say' as const,
        say: 'text' as const,
        text: 'Switching to <slug>architect</slug> mode',
        images: [],
      },
    ];

    const fileContent = JSON.stringify(messages);
    const file = new File([fileContent], 'test-messages.json', {
      type: 'application/json',
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('taskId', 'test-task-mode-extraction');
    formData.append('properties', JSON.stringify(testProperties));

    const request = new NextRequest(
      'http://localhost:3000/api/events/backfill',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);

    const dbResults = await analytics.query({
      query: `
        SELECT
          taskId,
          mode,
          text,
          type as messageType,
          say
        FROM messages
        WHERE taskId = 'test-task-mode-extraction'
        ORDER BY ts ASC
      `,
      format: 'JSONEachRow',
    });

    const dbData = (await dbResults.json()) as Array<{
      taskId: string;
      mode: string;
      text: string;
      messageType: string;
      say: string;
    }>;

    expect(dbData).toHaveLength(3);

    expect(dbData[0]).toMatchObject({
      taskId: 'test-task-mode-extraction',
      mode: 'debug',
      text: 'Starting task in <slug>debug</slug> mode',
      messageType: 'say',
      say: 'text',
    });

    expect(dbData[1]).toMatchObject({
      taskId: 'test-task-mode-extraction',
      mode: 'debug',
      text: 'API request started',
      messageType: 'say',
      say: 'api_req_started',
    });

    expect(dbData[2]).toMatchObject({
      taskId: 'test-task-mode-extraction',
      mode: 'architect',
      text: 'Switching to <slug>architect</slug> mode',
      messageType: 'say',
      say: 'text',
    });
  });

  it('should handle invalid ClineMessage schema', async () => {
    mockAuthorizeApi.mockResolvedValue({
      success: true,
      userId: 'test-user-id',
      orgId: 'test-org-id',
      userType: 'user',
      orgRole: 'admin',
    } as unknown as ApiAuthResult);

    const invalidMessages = [{ text: 'Invalid message' }];

    const formData = new FormData();

    formData.append(
      'file',
      new File([JSON.stringify(invalidMessages)], 'test.json'),
    );

    formData.append('taskId', 'test-task-invalid');
    formData.append('properties', JSON.stringify(testProperties));

    const request = new NextRequest(
      'http://localhost:3000/api/events/backfill',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain('Invalid file content');
  });
});
