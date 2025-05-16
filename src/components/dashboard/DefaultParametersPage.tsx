/* eslint-disable react/no-unescaped-entities */

'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

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

type DefaultParamsFormValues = {
  experimentalPowerSteering: boolean;
  terminalOutputLimit: number;
  compressProgressBar: boolean;
  inheritEnvVars: boolean;
  disableShellIntegration: boolean;
  shellIntegrationTimeout: number;
  commandDelay: number;
  enablePowerShellCounter: boolean;
  clearZshEol: boolean;
  enableOhMyZsh: boolean;
  enablePowerlevel10k: boolean;
  openTabsLimit: number;
  workspaceFilesLimit: number;
  showRooignoreFiles: boolean;
  fileReadThreshold: number;
  alwaysReadEntireFile: boolean;
  enableAutoCheckpoints: boolean;
  useCustomTemperature: boolean;
  temperature: number;
  rateLimit: number;
  enableEditingThroughDiffs: boolean;
  matchPrecision: number;
};

const DefaultParametersPage = () => {
  const t = useTranslations('ProviderWhitelist');

  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<DefaultParamsFormValues>({
    defaultValues: {
      experimentalPowerSteering: true,
      terminalOutputLimit: 500,
      compressProgressBar: true,
      inheritEnvVars: true,
      disableShellIntegration: false,
      shellIntegrationTimeout: 5,
      commandDelay: 0,
      enablePowerShellCounter: false,
      clearZshEol: true,
      enableOhMyZsh: false,
      enablePowerlevel10k: false,
      openTabsLimit: 20,
      workspaceFilesLimit: 200,
      showRooignoreFiles: true,
      fileReadThreshold: 500,
      alwaysReadEntireFile: false,
      enableAutoCheckpoints: true,
      useCustomTemperature: true,
      temperature: 0,
      rateLimit: 0,
      enableEditingThroughDiffs: true,
      matchPrecision: 100,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onSubmit = (_data: DefaultParamsFormValues) => {
    setIsSaving(true);

    setTimeout(() => {
      toast('Settings saved', {
        description: 'Default parameters have been updated successfully.',
      });

      setIsSaving(false);
    }, 1000);
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
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <h2 className="text-lg font-medium">Checkpoints</h2>
              </div>

              <div className="mt-4 space-y-4">
                <FormField
                  control={form.control}
                  name="enableAutoCheckpoints"
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
                  name="openTabsLimit"
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
                  name="workspaceFilesLimit"
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
                  name="showRooignoreFiles"
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
                      name="fileReadThreshold"
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
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span>lines</span>
                    <FormField
                      control={form.control}
                      name="alwaysReadEntireFile"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Always read entire file</FormLabel>
                        </FormItem>
                      )}
                    />
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

            {/* Model Settings Section */}
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
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.29 7 12 12 20.71 7" />
                  <line x1="12" y1="22" x2="12" y2="12" />
                </svg>
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
                  name="terminalOutputLimit"
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
                  name="compressProgressBar"
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
                  name="disableShellIntegration"
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
                  name="shellIntegrationTimeout"
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
                  name="commandDelay"
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
                  name="clearZshEol"
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

            {/* Experimental Section */}
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
                  <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
                  <path d="M8.5 2h7" />
                  <path d="M7 16h10" />
                </svg>
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

export default DefaultParametersPage;
