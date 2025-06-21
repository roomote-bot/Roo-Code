CREATE TABLE default.messages
(
    `id` UUID,
    `orgId` String,
    `userId` String,
    `taskId` String,
    `ts` Int32,
    `type` String, -- "ask" | "say"
    `ask` Nullable(String),
    `say` Nullable(String),
    `text` Nullable(String),
    `reasoning` Nullable(String),
    `partial` Nullable(Bool),
    `timestamp` Int32,
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}')
ORDER BY (id, timestamp)
SETTINGS index_granularity = 8192;

ALTER TABLE default.messages ADD COLUMN mode Nullable(String);
ALTER TABLE default.messages MODIFY COLUMN `orgId` Nullable(String);
