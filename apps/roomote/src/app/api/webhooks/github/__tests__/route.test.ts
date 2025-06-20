// npx vitest src/app/api/webhooks/github/__tests__/route.test.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const mockVerifySignature = vi.fn();
const mockHandleIssueEvent = vi.fn();
const mockHandlePullRequestEvent = vi.fn();
const mockHandleIssueCommentEvent = vi.fn();
const mockHandlePullRequestReviewCommentEvent = vi.fn();

vi.mock('../handlers', () => ({
  verifySignature: mockVerifySignature,
  handleIssueEvent: mockHandleIssueEvent,
  handlePullRequestEvent: mockHandlePullRequestEvent,
  handleIssueCommentEvent: mockHandleIssueCommentEvent,
  handlePullRequestReviewCommentEvent: mockHandlePullRequestReviewCommentEvent,
}));

vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server');
  return {
    ...actual,
    NextResponse: {
      json: vi.fn().mockReturnValue({ mocked: true }),
    },
  };
});

describe('GitHub Webhook Route', () => {
  let POST: typeof import('../route').POST;

  const validSignature = 'sha256=test-signature';
  const validBody = JSON.stringify({ action: 'opened', number: 123 });
  const webhookSecret = 'test-secret';

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.GH_WEBHOOK_SECRET = webhookSecret;
    // Import the POST function after mocks are set up.
    const routeModule = await import('../route');
    POST = routeModule.POST;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GH_WEBHOOK_SECRET;
  });

  const createMockRequest = (
    headers: Record<string, string>,
    body: string = validBody,
  ) => {
    return {
      headers: {
        get: vi.fn((name: string) => headers[name] || null),
      },
      text: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  describe('signature validation', () => {
    it('should return 400 when signature header is missing', async () => {
      const request = createMockRequest({});

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'missing_signature' },
        { status: 400 },
      );
    });

    it('should return 401 when signature is invalid', async () => {
      const request = createMockRequest({
        'x-hub-signature-256': validSignature,
      });
      mockVerifySignature.mockReturnValue(false);

      await POST(request);

      expect(mockVerifySignature).toHaveBeenCalledWith(
        validBody,
        validSignature,
        webhookSecret,
      );
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'invalid_signature' },
        { status: 401 },
      );
    });

    it('should proceed when signature is valid', async () => {
      const request = createMockRequest({
        'x-hub-signature-256': validSignature,
        'x-github-event': 'issues',
      });
      mockVerifySignature.mockReturnValue(true);
      mockHandleIssueEvent.mockResolvedValue({ status: 200 });

      await POST(request);

      expect(mockVerifySignature).toHaveBeenCalledWith(
        validBody,
        validSignature,
        webhookSecret,
      );
      expect(mockHandleIssueEvent).toHaveBeenCalledWith(validBody);
    });
  });

  describe('event handling', () => {
    beforeEach(() => {
      mockVerifySignature.mockReturnValue(true);
    });

    it('should handle issues event', async () => {
      const request = createMockRequest({
        'x-hub-signature-256': validSignature,
        'x-github-event': 'issues',
      });
      const expectedResponse = { status: 200, data: 'success' };
      mockHandleIssueEvent.mockResolvedValue(expectedResponse);

      const result = await POST(request);

      expect(mockHandleIssueEvent).toHaveBeenCalledWith(validBody);
      expect(result).toBe(expectedResponse);
    });

    it('should handle pull_request event', async () => {
      const request = createMockRequest({
        'x-hub-signature-256': validSignature,
        'x-github-event': 'pull_request',
      });
      const expectedResponse = { status: 200, data: 'success' };
      mockHandlePullRequestEvent.mockResolvedValue(expectedResponse);

      const result = await POST(request);

      expect(mockHandlePullRequestEvent).toHaveBeenCalledWith(validBody);
      expect(result).toBe(expectedResponse);
    });

    it('should handle issue_comment event', async () => {
      const request = createMockRequest({
        'x-hub-signature-256': validSignature,
        'x-github-event': 'issue_comment',
      });
      const expectedResponse = { status: 200, data: 'success' };
      mockHandleIssueCommentEvent.mockResolvedValue(expectedResponse);

      const result = await POST(request);

      expect(mockHandleIssueCommentEvent).toHaveBeenCalledWith(validBody);
      expect(result).toBe(expectedResponse);
    });

    it('should handle pull_request_review_comment event', async () => {
      const request = createMockRequest({
        'x-hub-signature-256': validSignature,
        'x-github-event': 'pull_request_review_comment',
      });
      const expectedResponse = { status: 200, data: 'success' };
      mockHandlePullRequestReviewCommentEvent.mockResolvedValue(
        expectedResponse,
      );

      const result = await POST(request);

      expect(mockHandlePullRequestReviewCommentEvent).toHaveBeenCalledWith(
        validBody,
      );
      expect(result).toBe(expectedResponse);
    });

    it('should ignore unknown events', async () => {
      const request = createMockRequest({
        'x-hub-signature-256': validSignature,
        'x-github-event': 'unknown_event',
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith({
        message: 'event_ignored',
      });
      expect(mockHandleIssueEvent).not.toHaveBeenCalled();
      expect(mockHandlePullRequestEvent).not.toHaveBeenCalled();
      expect(mockHandleIssueCommentEvent).not.toHaveBeenCalled();
      expect(mockHandlePullRequestReviewCommentEvent).not.toHaveBeenCalled();
    });

    it('should handle missing event header', async () => {
      const request = createMockRequest({
        'x-hub-signature-256': validSignature,
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith({
        message: 'event_ignored',
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockVerifySignature.mockReturnValue(true);
    });

    it('should handle ZodError with 400 status', async () => {
      const request = createMockRequest({
        'x-hub-signature-256': validSignature,
        'x-github-event': 'issues',
      });
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['test'],
          message: 'Expected string, received number',
        },
      ]);
      mockHandleIssueEvent.mockRejectedValue(zodError);

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'bad_request',
          details: zodError.errors,
        },
        { status: 400 },
      );
    });

    it('should handle generic errors with 500 status', async () => {
      const request = createMockRequest({
        'x-hub-signature-256': validSignature,
        'x-github-event': 'issues',
      });
      const genericError = new Error('Database connection failed');
      mockHandleIssueEvent.mockRejectedValue(genericError);

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        'GitHub Webhook Error:',
        genericError,
      );
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'internal_server_error' },
        { status: 500 },
      );

      consoleSpy.mockRestore();
    });

    it('should handle errors during signature verification', async () => {
      const request = createMockRequest({
        'x-hub-signature-256': validSignature,
      });
      mockVerifySignature.mockImplementation(() => {
        throw new Error('Signature verification failed');
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        'GitHub Webhook Error:',
        expect.any(Error),
      );
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'internal_server_error' },
        { status: 500 },
      );

      consoleSpy.mockRestore();
    });

    it('should handle errors when reading request body', async () => {
      const request = {
        headers: {
          get: vi.fn().mockReturnValue(validSignature),
        },
        text: vi.fn().mockRejectedValue(new Error('Failed to read body')),
      } as unknown as NextRequest;

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        'GitHub Webhook Error:',
        expect.any(Error),
      );
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'internal_server_error' },
        { status: 500 },
      );

      consoleSpy.mockRestore();
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      mockVerifySignature.mockReturnValue(true);
    });

    it('should process a complete valid webhook request', async () => {
      const issuePayload = {
        action: 'opened',
        issue: {
          number: 123,
          title: 'Test issue',
          body: 'This is a test issue',
        },
      };
      const request = createMockRequest(
        {
          'x-hub-signature-256': validSignature,
          'x-github-event': 'issues',
        },
        JSON.stringify(issuePayload),
      );
      const expectedResponse = { status: 200, jobId: 'job-123' };
      mockHandleIssueEvent.mockResolvedValue(expectedResponse);

      const result = await POST(request);

      expect(request.text).toHaveBeenCalled();
      expect(mockVerifySignature).toHaveBeenCalledWith(
        JSON.stringify(issuePayload),
        validSignature,
        webhookSecret,
      );
      expect(mockHandleIssueEvent).toHaveBeenCalledWith(
        JSON.stringify(issuePayload),
      );
      expect(result).toBe(expectedResponse);
    });

    it('should handle empty request body', async () => {
      const request = createMockRequest(
        {
          'x-hub-signature-256': validSignature,
          'x-github-event': 'issues',
        },
        '',
      );
      mockHandleIssueEvent.mockResolvedValue({ status: 200 });

      await POST(request);

      expect(mockVerifySignature).toHaveBeenCalledWith(
        '',
        validSignature,
        webhookSecret,
      );
      expect(mockHandleIssueEvent).toHaveBeenCalledWith('');
    });
  });
});
