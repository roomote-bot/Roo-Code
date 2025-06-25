CREATE TABLE IF NOT EXISTS default.events
(
    -- Shared
    `id` UUID,
    `orgId` Nullable(String),
    `userId` String,
    `timestamp` Int32,
    `type` String,

    -- App
    `appVersion` String,
    `vscodeVersion` String,
    `platform` String,
    `editorName` String,
    `language` String,
    `mode` String,

    -- Task
    `taskId` Nullable(String),
    `apiProvider` Nullable(String),
    `modelId` Nullable(String),
    `diffStrategy` Nullable(String),
    `isSubtask` Nullable(Bool),
    `repositoryUrl` Nullable(String),
    `repositoryName` Nullable(String),
    `defaultBranch` Nullable(String),

    -- Completion
    `inputTokens` Nullable(Int32),
    `outputTokens` Nullable(Int32),
    `cacheReadTokens` Nullable(Int32),
    `cacheWriteTokens` Nullable(Int32),
    `cost` Nullable(Float32)
)
ENGINE = MergeTree()
ORDER BY (id, type, timestamp)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS default.messages
(
    `id` UUID,
    `orgId` Nullable(String),
    `userId` String,
    `taskId` String,
    `ts` Int32,
    `type` String,
    `ask` Nullable(String),
    `say` Nullable(String),
    `text` Nullable(String),
    `reasoning` Nullable(String),
    `partial` Nullable(Bool),
    `timestamp` Int32,
    `mode` Nullable(String)
)
ENGINE = MergeTree()
ORDER BY (id, timestamp)
SETTINGS index_granularity = 8192;
