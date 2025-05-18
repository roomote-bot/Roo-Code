/* eslint-disable react/no-unescaped-entities */

'use client';

import { useTranslations } from 'next-intl';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { updateDefaultParameters } from '@/actions/defaultParameters';
import { getOrganizationSettings } from '@/actions/organizationSettings';
import { type OrganizationSettings } from '@/schemas';
import {
  Button,
  Checkbox,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Slider,
} from '@/components/ui';
import { CheckCheck, FlaskConical, SlidersHorizontal } from 'lucide-react';

type DefaultParamsFormValues = {
  experimentalPowerSteering: boolean;
  terminalOutputLineLimit: number;
  terminalCompressProgressBar: boolean;
  inheritEnvVars: boolean;
  terminalShellIntegrationDisabled: boolean;
  terminalShellIntegrationTimeout: number;
  terminalCommandDelay: number;
  terminalZshClearEolMark: boolean;
  enablePowerlevel10k: boolean;
  maxOpenTabsContext: number;
  maxWorkspaceFiles: number;
  showRooIgnoredFiles: boolean;
  maxReadFileLine: number;
  enableCheckpoints: boolean;
  useCustomTemperature: boolean;
  temperature: number;
  rateLimit: number;
  enableEditingThroughDiffs: boolean;
  matchPrecision: number;
};

const mergeWithDefaultValues = (
  defaultValues: DefaultParamsFormValues,
  orgSettings?: OrganizationSettings,
): DefaultParamsFormValues => {
  if (!orgSettings || !orgSettings.defaultSettings) {
    return defaultValues;
  }

  return {
    ...defaultValues,
    ...orgSettings.defaultSettings,
  };
};

const defaultFormValues: DefaultParamsFormValues = {
  experimentalPowerSteering: true,
  terminalOutputLineLimit: 500,
  terminalCompressProgressBar: true,
  inheritEnvVars: true,
  terminalShellIntegrationDisabled: false,
  terminalShellIntegrationTimeout: 5,
  terminalCommandDelay: 0,
  terminalZshClearEolMark: true,
  enablePowerlevel10k: false,
  maxOpenTabsContext: 20,
  maxWorkspaceFiles: 200,
  showRooIgnoredFiles: true,
  maxReadFileLine: 500,
  enableCheckpoints: true,
  useCustomTemperature: true,
  temperature: 0,
  rateLimit: 0,
  enableEditingThroughDiffs: true,
  matchPrecision: 100,
} as const;

type ParametersFormProps = {
  orgSettings: OrganizationSettings;
  queryClient: QueryClient;
};

const ParametersForm = ({ orgSettings, queryClient }: ParametersFormProps) => {
  const t = useTranslations('ProviderWhitelist');

  const [isSaving, setIsSaving] = useState(false);
  const [readEntireFile, setReadEntireFile] = useState(false);

  const mergedValues = useMemo(
    () => mergeWithDefaultValues(defaultFormValues, orgSettings),
    [orgSettings],
  );

  const previousMaxReadFileLine = useRef<number>(
    mergedValues.maxReadFileLine === -1 ? 500 : mergedValues.maxReadFileLine,
  );

  const form = useForm<DefaultParamsFormValues>({
    defaultValues: mergedValues,
  });

  const maxReadFileLineValue = form.watch('maxReadFileLine');

  useEffect(() => {
    previousMaxReadFileLine.current =
      mergedValues.maxReadFileLine === -1 ? 500 : mergedValues.maxReadFileLine;
  }, [mergedValues]);

  useEffect(() => {
    setReadEntireFile(maxReadFileLineValue === -1);

    if (maxReadFileLineValue !== -1) {
      previousMaxReadFileLine.current = maxReadFileLineValue;
    }
  }, [maxReadFileLineValue, form]);

  const handleReadEntireFileChange = (checked: boolean) => {
    if (checked) {
      const currentValue = form.getValues('maxReadFileLine');
      if (currentValue !== -1) {
        previousMaxReadFileLine.current = currentValue;
      }
      form.setValue('maxReadFileLine', -1);
    } else {
      form.setValue('maxReadFileLine', previousMaxReadFileLine.current);
    }
    setReadEntireFile(checked);
  };

  const onSubmit = async (data: DefaultParamsFormValues) => {
    setIsSaving(true);

    try {
      const result = await updateDefaultParameters(data);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['organizationSettings'] });

        toast('Settings saved', {
          description: 'Default parameters have been updated successfully.',
        });
      } else {
        throw new Error(result.error || 'An unexpected error occurred.');
      }
    } catch (error) {
      console.error('Failed to update default parameters:', error);
      toast.error('Error saving settings', {
        description: 'Failed to update default parameters. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="cl-header 🔒️ cl-internal-qo3qk7">
        <div className="cl-internal-1pr5xvn">
          <h1 className="cl-headerTitle 🔒️ cl-internal-190cjq9">
            {t('parameters_section_title')}
          </h1>
        </div>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        {t('parameters_section_description')}
      </p>
      <div className="space-y-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCheck />
                <h2 className="text-lg font-medium">Checkpoints</h2>
              </div>
              <div className="mt-4 space-y-4">
                <FormField
                  control={form.control}
                  name="enableCheckpoints"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable automatic checkpoints</FormLabel>
                        <FormDescription>
                          When enabled, Roo will automatically create
                          checkpoints during task execution, making it easy to
                          review changes or revert to earlier states.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="space-y-4 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <h2 className="text-lg font-medium">Context</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Control what information is included in the AI's context window,
                affecting token usage and response quality
              </p>

              <div className="mt-4 space-y-6">
                <FormField
                  control={form.control}
                  name="maxOpenTabsContext"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Open tabs context limit</FormLabel>
                        <span className="text-sm">{field.value}</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={0}
                          max={50}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value: number[]) =>
                            field.onChange(value[0])
                          }
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of VSCode open tabs to include in
                        context. Higher values provide more context but increase
                        token usage.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxWorkspaceFiles"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Workspace files context limit</FormLabel>
                        <span className="text-sm">{field.value}</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={0}
                          max={500}
                          step={10}
                          value={[field.value]}
                          onValueChange={(value: number[]) =>
                            field.onChange(value[0])
                          }
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of files to include in current working
                        directory details. Higher values provide more context
                        but increase token usage.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="showRooIgnoredFiles"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Show .rooignore'd files in lists and searches
                        </FormLabel>
                        <FormDescription>
                          When enabled, files matching patterns in .rooignore
                          will be shown in lists with a lock symbol. When
                          disabled, these files will be completely hidden from
                          file lists and searches.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>File read auto-truncate threshold</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name="maxReadFileLine"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={10000}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                              className="w-32"
                              disabled={readEntireFile}
                              value={readEntireFile ? '' : field.value}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span>lines</span>
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={readEntireFile}
                          onCheckedChange={handleReadEntireFileChange}
                        />
                      </FormControl>
                      <FormLabel>Always read entire file</FormLabel>
                    </FormItem>
                  </div>
                  <FormDescription>
                    Roo reads this number of lines when the model omits
                    start/end values. If this number is less than the file's
                    total, Roo generates a line number index of code
                    definitions. Special cases: -1 instructs Roo to read the
                    entire file (without indexing), and 0 instructs it to read
                    no lines and provides line indexes only for minimal context.
                    Lower values minimize initial context usage, enabling
                    precise subsequent line-range reads. Explicit start/end
                    requests are not limited by this setting.
                  </FormDescription>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal />
                <h2 className="text-lg font-medium">Model Settings</h2>
              </div>

              <div className="mt-4 space-y-4">
                <FormField
                  control={form.control}
                  name="enableEditingThroughDiffs"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable editing through diffs</FormLabel>
                        <FormDescription>
                          When enabled, Roo will be able to edit files more
                          quickly and will automatically reject truncated
                          full-file writes. Works best with the latest Claude
                          3.7 Sonnet model.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="matchPrecision"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Match precision</FormLabel>
                        <span className="text-sm">{field.value}%</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={50}
                          max={100}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value: number[]) =>
                            field.onChange(value[0])
                          }
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        This slider controls how precisely code sections must
                        match when applying diffs. Lower values allow more
                        flexible matching but increase the risk of incorrect
                        replacements. Use values below 100% with extreme
                        caution.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="useCustomTemperature"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Use custom temperature</FormLabel>
                        <FormDescription>
                          Controls randomness in the model's responses.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch('useCustomTemperature') && (
                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Temperature</FormLabel>
                          <span className="text-sm">{field.value}</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={2}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={(value: number[]) =>
                              field.onChange(value[0])
                            }
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          Higher values make output more random, lower values
                          make it more deterministic.
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="rateLimit"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Rate limit</FormLabel>
                        <span className="text-sm">{field.value}s</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={0}
                          max={10}
                          step={0.1}
                          value={[field.value]}
                          onValueChange={(value: number[]) =>
                            field.onChange(value[0])
                          }
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum time between API requests.
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Terminal Settings Section */}
            <div className="space-y-4 rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                >
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
                <h2 className="text-lg font-medium">Terminal</h2>
              </div>

              <div className="mt-4 space-y-6">
                <h3 className="text-base font-medium">
                  Terminal Settings: Basic
                </h3>

                <FormField
                  control={form.control}
                  name="terminalOutputLineLimit"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Terminal output limit</FormLabel>
                        <span className="text-sm">{field.value}</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={100}
                          max={1000}
                          step={10}
                          value={[field.value]}
                          onValueChange={(value: number[]) =>
                            field.onChange(value[0])
                          }
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of lines to include in terminal output
                        when executing commands. When exceeded lines will be
                        removed from the middle, saving tokens.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="terminalCompressProgressBar"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Compress progress bar output</FormLabel>
                        <FormDescription>
                          When enabled, processes terminal output with carriage
                          returns (\r) to simulate how a real terminal would
                          display content. This removes intermediate progress
                          bar states, retaining only the final state, which
                          conserves context space for more relevant information.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <h3 className="text-base font-medium">
                  Terminal Settings: Advanced
                </h3>
                <p className="text-sm text-muted-foreground">
                  The following options may require a terminal restart to apply
                  the setting.
                </p>

                <FormField
                  control={form.control}
                  name="inheritEnvVars"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Inherit environment variables</FormLabel>
                        <FormDescription>
                          When enabled, the terminal will inherit environment
                          variables from VSCode's parent process, such as
                          user-profile-defined shell integration settings. This
                          directly toggles VSCode global setting
                          'terminal.integrated.inheritEnv'
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="terminalShellIntegrationDisabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Disable terminal shell integration
                        </FormLabel>
                        <FormDescription>
                          Enable this if terminal commands aren't working
                          correctly or you see 'Shell Integration Unavailable'
                          errors. This uses a simpler method to run commands,
                          bypassing some advanced terminal features.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="terminalShellIntegrationTimeout"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>
                          Terminal shell integration timeout
                        </FormLabel>
                        <span className="text-sm">{field.value}s</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value: number[]) =>
                            field.onChange(value[0])
                          }
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum time to wait for shell integration to initialize
                        before executing commands. For users with long shell
                        startup times, this value may need to be increased if
                        you see "Shell Integration Unavailable" errors in the
                        terminal.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="terminalCommandDelay"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Terminal command delay</FormLabel>
                        <span className="text-sm">
                          {field.value}
                          ms
                        </span>
                      </div>
                      <FormControl>
                        <Slider
                          min={0}
                          max={1000}
                          step={10}
                          value={[field.value]}
                          onValueChange={(value: number[]) =>
                            field.onChange(value[0])
                          }
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Delay in milliseconds to add after command execution.
                        The default setting of 0 disables the delay completely.
                        This can help ensure command output is fully captured in
                        terminals with timing issues. In most terminals it is
                        implemented by setting `PROMPT_COMMAND='sleep N'` and
                        Powershell appends `start-sleep` to the end of each
                        command. Originally was workaround for VSCode bug#237208
                        and may not be needed.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="terminalZshClearEolMark"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Clear ZSH EOL mark</FormLabel>
                        <FormDescription>
                          When enabled, clears the ZSH end-of-line mark by
                          setting PROMPT_EOL_MARK=''. This prevents issues with
                          command output interpretation when output ends with
                          special characters like '%'.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4 rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <FlaskConical />
                <h2 className="text-lg font-medium">Experimental</h2>
              </div>
              <div className="mt-4 space-y-4">
                <FormField
                  control={form.control}
                  name="experimentalPowerSteering"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Use experimental "power steering" mode
                        </FormLabel>
                        <FormDescription>
                          When enabled, Roo will remind the model about the
                          details of its current mode definition more
                          frequently. This will lead to stronger adherence to
                          role definitions and custom instructions, but will use
                          more tokens per message.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 border-t pt-4">
              <Button variant="outline">Reset to Defaults</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <span className="mr-2">Saving...</span>
                    <span className="animate-spin">⟳</span>
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
};

export const DefaultParameters = () => {
  const queryClient = useQueryClient();

  const { data: orgSettings } = useQuery({
    queryKey: ['organizationSettings'],
    queryFn: getOrganizationSettings,
  });

  if (!orgSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin text-2xl">⟳</div>
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return <ParametersForm orgSettings={orgSettings} queryClient={queryClient} />;
};
