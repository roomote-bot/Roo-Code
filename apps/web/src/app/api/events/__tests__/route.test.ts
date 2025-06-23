// pnpm test src/app/api/events/__tests__/route.test.ts

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { captureEvent } from '@/actions/analytics';
import { POST } from '../route';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/actions/analytics', () => ({
  captureEvent: vi.fn(),
}));

const mockAuth = vi.mocked(auth);
const mockCaptureEvent = vi.mocked(captureEvent);

describe('/api/events POST', () => {
  describe('authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockAuth.mockResolvedValue({ userId: null, orgId: null } as any);

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify({ type: 'test-event' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should allow personal accounts (orgId is null)', async () => {
      mockAuth.mockResolvedValue({
        userId: 'test-user-id',
        orgId: null,
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const validEvent = {
        type: 'Task Created',
        properties: {
          appName: 'test-app',
          appVersion: '1.0.0',
          vscodeVersion: '1.80.0',
          platform: 'darwin',
          editorName: 'vscode',
          language: 'typescript',
          mode: 'code',
          taskId: 'task-123',
          apiProvider: 'anthropic',
          modelId: 'claude-3-sonnet',
        },
      };

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(validEvent),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true, id: expect.any(String) });
      expect(mockCaptureEvent).toHaveBeenCalledWith({
        id: expect.any(String),
        orgId: null, // Personal account has null orgId
        userId: 'test-user-id',
        timestamp: expect.any(Number),
        event: validEvent,
      });
    });
  });

  describe('schema validation', () => {
    beforeEach(() => {
      // Set up default successful auth and captureEvent.
      mockAuth.mockResolvedValue({
        userId: 'test-user-id',
        orgId: 'test-org-id',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      mockCaptureEvent.mockResolvedValue(undefined);
    });

    it('should handle valid telemetry events successfully', async () => {
      const validEvent = {
        type: 'Task Created',
        properties: {
          appName: 'test-app',
          appVersion: '1.0.0',
          vscodeVersion: '1.80.0',
          platform: 'darwin',
          editorName: 'vscode',
          language: 'typescript',
          mode: 'code',
          taskId: 'task-123',
          apiProvider: 'anthropic',
          modelId: 'claude-3-sonnet',
        },
      };

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(validEvent),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true, id: expect.any(String) });
      expect(mockCaptureEvent).toHaveBeenCalledWith({
        id: expect.any(String),
        orgId: 'test-org-id',
        userId: 'test-user-id',
        timestamp: expect.any(Number),
        event: validEvent,
      });
    });

    it('should handle LLM completion events successfully', async () => {
      const validLLMEvent = {
        type: 'LLM Completion',
        properties: {
          appName: 'test-app',
          appVersion: '1.0.0',
          vscodeVersion: '1.80.0',
          platform: 'darwin',
          editorName: 'vscode',
          language: 'typescript',
          mode: 'code',
          inputTokens: 100,
          outputTokens: 50,
          cost: 0.01,
        },
      };

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(validLLMEvent),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true, id: expect.any(String) });
      expect(mockCaptureEvent).toHaveBeenCalledWith({
        id: expect.any(String),
        orgId: 'test-org-id',
        userId: 'test-user-id',
        timestamp: expect.any(Number),
        event: validLLMEvent,
      });
    });

    it('should handle schema validation errors gracefully without failing', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Invalid event - wrong type name.
      const invalidEvent = {
        type: 'Invalid Event Type',
        properties: {
          appName: 'test-app',
          invalidProperty: 'should not be here',
        },
      };

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(invalidEvent),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still succeed with a 200 response.
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true, id: expect.any(String) });

      // Should log the validation error.
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid telemetry event:'),
      );

      // Should still attempt to capture the raw payload.
      expect(mockCaptureEvent).toHaveBeenCalledWith({
        id: expect.any(String),
        orgId: 'test-org-id',
        userId: 'test-user-id',
        timestamp: expect.any(Number),
        event: invalidEvent, // Raw payload used instead of validated data
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing required properties gracefully', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Invalid event - missing required properties for LLM Completion.
      const invalidLLMEvent = {
        type: 'LLM Completion',
        properties: {
          appName: 'test-app',
          // Missing required inputTokens, outputTokens, etc.
        },
      };

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(invalidLLMEvent),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true, id: expect.any(String) });
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockCaptureEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: invalidLLMEvent,
        }),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should continue processing even with completely malformed data', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const malformedEvent = {
        someRandomField: 'random value',
        anotherField: 123,
        nested: { data: 'here' },
      };

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(malformedEvent),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true, id: expect.any(String) });
      expect(consoleErrorSpy).toHaveBeenCalled();

      expect(mockCaptureEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event: malformedEvent }),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        userId: 'test-user-id',
        orgId: 'test-org-id',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });

    it('should return 500 when captureEvent fails', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const validEvent = {
        type: 'Task Created',
        properties: {
          appName: 'test-app',
          appVersion: '1.0.0',
          vscodeVersion: '1.80.0',
          platform: 'darwin',
          editorName: 'vscode',
          language: 'typescript',
          mode: 'code',
        },
      };

      const captureError = new Error('Database connection failed');
      mockCaptureEvent.mockRejectedValue(captureError);

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(validEvent),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Database connection failed',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(captureError);

      consoleErrorSpy.mockRestore();
    });

    it('should handle non-Error exceptions in captureEvent', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const validEvent = {
        type: 'Task Created',
        properties: {
          appName: 'test-app',
          appVersion: '1.0.0',
          vscodeVersion: '1.80.0',
          platform: 'darwin',
          editorName: 'vscode',
          language: 'typescript',
          mode: 'code',
        },
      };

      mockCaptureEvent.mockRejectedValue('String error');

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(validEvent),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Unknown error',
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        userId: 'test-user-id',
        orgId: 'test-org-id',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });

    it('should handle schema validation failure followed by captureEvent success', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const invalidEvent = { invalidField: 'test' };

      mockCaptureEvent.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(invalidEvent),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should succeed despite validation failure.
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true, id: expect.any(String) });

      // Should log validation error but continue.
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid telemetry event:'),
      );

      // Should attempt to capture raw event.
      expect(mockCaptureEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: invalidEvent,
        }),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle schema validation failure followed by captureEvent failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const invalidEvent = { invalidField: 'test' };

      mockCaptureEvent.mockRejectedValue(new Error('Capture failed'));

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(invalidEvent),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should fail with 500 due to captureEvent failure.
      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Capture failed',
      });

      // Should log both validation error and capture error.
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid telemetry event:'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });
});
