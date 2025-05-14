export const createEvents = `
  CREATE TABLE default.events
  (
      \`id\` UUID,
      \`userId\` String,
      \`type\` String,
      \`timestamp\` Int32,
      \`taskId\` Nullable(String),
      \`provider\` Nullable(String),
      \`modelId\` Nullable(String),
      \`prompt\` Nullable(String),
      \`mode\` Nullable(String),
      \`inputTokens\` Nullable(Int32),
      \`outputTokens\` Nullable(Int32),
      \`cacheReadTokens\` Nullable(Int32),
      \`cacheWriteTokens\` Nullable(Int32),
      \`cost\` Nullable(Float32)
  )
  ENGINE = SharedMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}')
  ORDER BY (id, type, timestamp)
  SETTINGS index_granularity = 8192;
`;
