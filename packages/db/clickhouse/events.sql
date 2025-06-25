CREATE TABLE default.events
(
    -- Shared
    `id` UUID,
    `orgId` String,
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
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}')
ORDER BY (id, type, timestamp)
SETTINGS index_granularity = 8192;

ALTER TABLE default.events MODIFY COLUMN `orgId` Nullable(String);
