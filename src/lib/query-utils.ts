/**
 * Generates SQL for summing input tokens (inputTokens + cacheReadTokens)
 * @param table Optional table prefix (e.g., 'e' for 'e.inputTokens')
 * @returns SQL fragment for input token sum
 */
export const inputTokenSumSql = (table?: string) => {
  const t = table ? `${table}.` : '';
  return `COALESCE(${t}inputTokens, 0) + COALESCE(${t}cacheReadTokens, 0)`;
};

/**
 * Generates SQL for summing output tokens (outputTokens + cacheWriteTokens)
 * @param table Optional table prefix (e.g., 'e' for 'e.outputTokens')
 * @returns SQL fragment for output token sum
 */
export const outputTokenSumSql = (table?: string) => {
  const t = table ? `${table}.` : '';
  return `COALESCE(${t}outputTokens, 0) + COALESCE(${t}cacheWriteTokens, 0)`;
};

/**
 * Generates SQL for summing all tokens (input + output)
 * @param table Optional table prefix (e.g., 'e' for 'e.inputTokens')
 * @returns SQL fragment for total token sum
 */
export const tokenSumSql = (table?: string) => {
  return `${inputTokenSumSql(table)} + ${outputTokenSumSql(table)}`;
};
