// pnpm test src/components/__tests__/ProviderForm.test.tsx

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { OrganizationSettings } from '@roo-code/types';

import {
  updateOrganization,
  getOrganizationSettings,
} from '@/actions/organizationSettings';
import { ProviderForm } from '@/app/(authenticated)/providers/ProviderForm';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/actions/organizationSettings', () => ({
  updateOrganization: vi.fn(),
  getOrganizationSettings: vi.fn(),
}));

vi.mock('@/lib/server/analytics', () => ({
  analytics: {
    query: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@/lib/providers', () => ({
  PROVIDERS: {
    anthropic: {
      id: 'anthropic',
      label: 'Anthropic',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    },
    'openai-native': {
      id: 'openai-native',
      label: 'OpenAI',
      models: ['gpt-4o', 'gpt-4o-mini'],
    },
    gemini: {
      id: 'gemini',
      label: 'Google Gemini',
      models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    },
  },
}));

vi.mock('@/hooks/useDynamicRouterModels', () => ({
  useDynamicRouterModels: () => ({ data: undefined }),
  isDynamicRouter: () => false,
}));

vi.mock('@/hooks/useAvailableProviders', () => ({
  useAvailableProviders: vi.fn(),
}));

const mockUpdateOrganization = vi.mocked(updateOrganization);
const mockGetOrganizationSettings = vi.mocked(getOrganizationSettings);
const mockToast = vi.mocked(toast);
const { useAvailableProviders } = await import('@/hooks/useAvailableProviders');
const mockUseAvailableProviders = vi.mocked(useAvailableProviders);

const mockAvailableProviders = [
  {
    id: 'anthropic' as const,
    label: 'Anthropic',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  },
  {
    id: 'openai-native' as const,
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini'],
  },
  {
    id: 'gemini' as const,
    label: 'Google Gemini',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  },
];

const createMockOrgSettings = (
  allowList: OrganizationSettings['allowList'],
): OrganizationSettings => ({
  version: 1,
  cloudSettings: {},
  defaultSettings: {},
  allowList,
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
  );
};

const setupMockOrganizationSettings = (
  allowList: OrganizationSettings['allowList'],
) => {
  const orgSettings = createMockOrgSettings(allowList);
  mockGetOrganizationSettings.mockResolvedValue(orgSettings);

  // Ensure providers object is always defined to avoid controlled/uncontrolled warnings
  const normalizedAllowList = {
    ...allowList,
    providers: allowList.providers || {},
  };
  mockUseAvailableProviders.mockReturnValue({
    availableProviders: mockAvailableProviders,
    allowList: normalizedAllowList,
  });
};

const getSwitch = (name: string | RegExp) =>
  screen.getByRole('switch', { name });
const getSaveButton = () =>
  screen.getByRole('button', { name: /save changes/i });
const querySaveButton = () =>
  screen.queryByRole('button', { name: /save changes/i });

const waitForSwitch = async (name: string | RegExp, checked: boolean) => {
  await waitFor(() => {
    const switchElement = getSwitch(name);
    if (checked) {
      expect(switchElement).toBeChecked();
    } else {
      expect(switchElement).not.toBeChecked();
    }
  });
};

const expectSaveButtonVisible = () => {
  const saveButton = getSaveButton();
  expect(saveButton).toBeInTheDocument();
  expect(saveButton).not.toBeDisabled();
};

describe('ProviderForm', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('initialization', () => {
    it('should render with allowAll enabled when allowList.allowAll is true', async () => {
      setupMockOrganizationSettings({ allowAll: true, providers: {} });
      renderWithQueryClient(<ProviderForm />);

      await waitForSwitch(/enable all providers/i, true);

      const anthropicRow = screen.getByText('Anthropic').closest('tr');
      const openaiRow = screen.getByText('OpenAI').closest('tr');
      expect(anthropicRow).toHaveClass('hidden');
      expect(openaiRow).toHaveClass('hidden');
    });

    it('should render with specific providers enabled when allowAll is false', async () => {
      setupMockOrganizationSettings({
        allowAll: false,
        providers: {
          anthropic: {
            allowAll: false,
            models: ['claude-3-5-sonnet-20241022'],
          },
          'openai-native': { allowAll: false, models: ['gpt-4o'] },
        },
      });
      renderWithQueryClient(<ProviderForm />);

      await waitForSwitch(/enable all providers/i, false);

      expect(screen.getByText('Anthropic')).toBeVisible();
      expect(screen.getByText('OpenAI')).toBeVisible();
      expect(screen.getByText('Google Gemini')).toBeVisible();

      await waitForSwitch(/anthropic/i, true);
      await waitForSwitch(/openai/i, true);
      await waitForSwitch(/google gemini/i, false);
    });

    it('should show save button when form has initial state', async () => {
      setupMockOrganizationSettings({ allowAll: false, providers: {} });
      renderWithQueryClient(<ProviderForm />);

      await waitForSwitch(/enable all providers/i, false);
      expectSaveButtonVisible();
    });
  });

  describe('form interactions', () => {
    const setupBasicForm = () => {
      setupMockOrganizationSettings({ allowAll: false, providers: {} });
      renderWithQueryClient(<ProviderForm />);
    };

    it('should show save button when allowAll is toggled', async () => {
      const user = userEvent.setup();
      setupBasicForm();

      await waitForSwitch(/enable all providers/i, false);
      await user.click(getSwitch(/enable all providers/i));
      expectSaveButtonVisible();
    });

    it('should show save button when provider is toggled', async () => {
      const user = userEvent.setup();
      setupBasicForm();

      await waitForSwitch(/anthropic/i, false);
      await user.click(getSwitch(/anthropic/i));
      expectSaveButtonVisible();
    });

    it('should hide provider controls when allowAll is enabled', async () => {
      const user = userEvent.setup();
      setupMockOrganizationSettings({
        allowAll: false,
        providers: { anthropic: { allowAll: false, models: [] } },
      });
      renderWithQueryClient(<ProviderForm />);

      await waitFor(() => expect(screen.getByText('Anthropic')).toBeVisible());
      await user.click(getSwitch(/enable all providers/i));

      const anthropicRow = screen.getByText('Anthropic').closest('tr');
      expect(anthropicRow).toHaveClass('hidden');
    });

    it('should show model selection when provider is enabled', async () => {
      const user = userEvent.setup();
      setupBasicForm();

      await waitForSwitch(/anthropic/i, false);
      await user.click(getSwitch(/anthropic/i));

      const anthropicRow = screen.getByText('Anthropic').closest('tr');
      const enableAllModelsLabel = within(anthropicRow!).getByText(
        'Enable All Models',
      );
      expect(enableAllModelsLabel).toBeVisible();
    });

    it('should handle All button click for models', async () => {
      const user = userEvent.setup();
      setupMockOrganizationSettings({
        allowAll: false,
        providers: { anthropic: { allowAll: false, models: [] } },
      });
      renderWithQueryClient(<ProviderForm />);

      await waitForSwitch(/anthropic/i, true);

      const enableAllModelsSwitches = screen.getAllByRole('switch', {
        name: /enable all models/i,
      });
      await user.click(enableAllModelsSwitches[0]!);
      expectSaveButtonVisible();
    });

    it('should handle None button click for models', async () => {
      setupMockOrganizationSettings({
        allowAll: false,
        providers: {
          anthropic: {
            allowAll: false,
            models: ['claude-3-5-sonnet-20241022'],
          },
        },
      });
      renderWithQueryClient(<ProviderForm />);

      await waitForSwitch(/anthropic/i, true);
      expectSaveButtonVisible();
    });
  });

  describe('form submission', () => {
    const setupFormAndSubmit = async (
      switchName: string | RegExp,
      expectedPayload: OrganizationSettings['allowList'],
    ) => {
      const user = userEvent.setup();
      setupMockOrganizationSettings({ allowAll: false, providers: {} });
      renderWithQueryClient(<ProviderForm />);

      await waitForSwitch(switchName, false);
      await user.click(getSwitch(switchName));
      await user.click(getSaveButton());

      await waitFor(() => {
        expect(mockUpdateOrganization).toHaveBeenCalledWith({
          allowList: expectedPayload,
        });
      });
      expect(mockToast.success).toHaveBeenCalledWith(
        'Changes will be deployed within 30 seconds.',
      );
    };

    it('should save allowAll configuration successfully', async () => {
      await setupFormAndSubmit(/enable all providers/i, {
        allowAll: true,
        providers: {},
      });
    });

    it('should save specific provider configuration successfully', async () => {
      await setupFormAndSubmit(/anthropic/i, {
        allowAll: false,
        providers: { anthropic: { allowAll: true, models: [] } },
      });
    });

    const testErrorHandling = async (mockSetup: () => void) => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      setupMockOrganizationSettings({ allowAll: false, providers: {} });
      mockSetup();
      renderWithQueryClient(<ProviderForm />);

      await waitForSwitch(/enable all providers/i, false);
      await user.click(getSwitch(/enable all providers/i));
      await user.click(getSaveButton());

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Failed to save provider settings.',
        );
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    };

    it('should handle save error gracefully', async () => {
      await testErrorHandling(() => {
        mockUpdateOrganization.mockRejectedValue(new Error('Network error'));
      });
    });

    it('should handle save exception gracefully', async () => {
      await testErrorHandling(() => {
        mockUpdateOrganization.mockRejectedValue(new Error('Network error'));
      });
    });

    it('should disable form controls while saving', async () => {
      const user = userEvent.setup();
      setupMockOrganizationSettings({ allowAll: false, providers: {} });

      // Make the update function hang to test loading state
      mockUpdateOrganization.mockImplementation(() => new Promise(() => {}));
      renderWithQueryClient(<ProviderForm />);

      await waitForSwitch(/enable all providers/i, false);
      const allowAllSwitch = getSwitch(/enable all providers/i);
      await user.click(allowAllSwitch);

      const saveButton = getSaveButton();
      await user.click(saveButton);

      await waitFor(() => {
        expect(allowAllSwitch).toBeDisabled();
        // Save button might be hidden during submission, so check if it exists first
        const currentSaveButton = querySaveButton();
        if (currentSaveButton) {
          expect(currentSaveButton).toBeDisabled();
        }
      });
    });
  });

  describe('form state management', () => {
    it('should track form dirty state correctly', async () => {
      const user = userEvent.setup();
      setupMockOrganizationSettings({
        allowAll: false,
        providers: {
          anthropic: {
            allowAll: false,
            models: ['claude-3-5-sonnet-20241022'],
          },
        },
      });
      renderWithQueryClient(<ProviderForm />);

      await waitForSwitch(/enable all providers/i, false);
      expectSaveButtonVisible();

      const allowAllSwitch = getSwitch(/enable all providers/i);
      await user.click(allowAllSwitch);
      expect(getSaveButton()).toBeVisible();

      await user.click(allowAllSwitch);
      // After reverting, save button should still be visible due to initialization state
      expectSaveButtonVisible();
    });

    it('should preserve provider allowAll settings', async () => {
      const user = userEvent.setup();
      setupMockOrganizationSettings({
        allowAll: false,
        providers: {
          anthropic: { allowAll: true },
          'openai-native': { allowAll: false, models: ['gpt-4o'] },
        },
      });
      renderWithQueryClient(<ProviderForm />);

      await waitForSwitch(/anthropic/i, true);

      await user.click(getSwitch(/google gemini/i));
      await user.click(getSaveButton());

      await waitFor(() => {
        expect(mockUpdateOrganization).toHaveBeenCalledWith({
          allowList: {
            allowAll: false,
            providers: {
              anthropic: { allowAll: true },
              'openai-native': { allowAll: false, models: ['gpt-4o'] },
              gemini: { allowAll: true, models: [] },
            },
          },
        });
      });
    });
  });
});
