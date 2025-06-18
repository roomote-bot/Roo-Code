// pnpm test src/lib/__tests__/query-utils.test.ts

import {
  inputTokenSumSql,
  outputTokenSumSql,
  tokenSumSql,
} from '../query-utils';

describe('inputTokenSumSql', () => {
  it('should generate SQL for input tokens without table prefix', () => {
    const result = inputTokenSumSql();
    expect(result).toBe(
      'COALESCE(inputTokens, 0) + COALESCE(cacheReadTokens, 0)',
    );
  });

  it('should generate SQL for input tokens with table prefix', () => {
    const result = inputTokenSumSql('e');
    expect(result).toBe(
      'COALESCE(e.inputTokens, 0) + COALESCE(e.cacheReadTokens, 0)',
    );
  });

  it('should handle different table prefixes', () => {
    const result = inputTokenSumSql('events');
    expect(result).toBe(
      'COALESCE(events.inputTokens, 0) + COALESCE(events.cacheReadTokens, 0)',
    );
  });

  it('should handle empty string table prefix', () => {
    const result = inputTokenSumSql('');
    expect(result).toBe(
      'COALESCE(inputTokens, 0) + COALESCE(cacheReadTokens, 0)',
    );
  });
});

describe('outputTokenSumSql', () => {
  it('should generate SQL for output tokens without table prefix', () => {
    const result = outputTokenSumSql();
    expect(result).toBe(
      'COALESCE(outputTokens, 0) + COALESCE(cacheWriteTokens, 0)',
    );
  });

  it('should generate SQL for output tokens with table prefix', () => {
    const result = outputTokenSumSql('e');
    expect(result).toBe(
      'COALESCE(e.outputTokens, 0) + COALESCE(e.cacheWriteTokens, 0)',
    );
  });

  it('should handle different table prefixes', () => {
    const result = outputTokenSumSql('events');
    expect(result).toBe(
      'COALESCE(events.outputTokens, 0) + COALESCE(events.cacheWriteTokens, 0)',
    );
  });

  it('should handle empty string table prefix', () => {
    const result = outputTokenSumSql('');
    expect(result).toBe(
      'COALESCE(outputTokens, 0) + COALESCE(cacheWriteTokens, 0)',
    );
  });
});

describe('tokenSumSql', () => {
  it('should generate SQL for total tokens without table prefix', () => {
    const result = tokenSumSql();
    const expected =
      'COALESCE(inputTokens, 0) + COALESCE(cacheReadTokens, 0) + COALESCE(outputTokens, 0) + COALESCE(cacheWriteTokens, 0)';
    expect(result).toBe(expected);
  });

  it('should generate SQL for total tokens with table prefix', () => {
    const result = tokenSumSql('e');
    const expected =
      'COALESCE(e.inputTokens, 0) + COALESCE(e.cacheReadTokens, 0) + COALESCE(e.outputTokens, 0) + COALESCE(e.cacheWriteTokens, 0)';
    expect(result).toBe(expected);
  });

  it('should handle different table prefixes', () => {
    const result = tokenSumSql('events');
    const expected =
      'COALESCE(events.inputTokens, 0) + COALESCE(events.cacheReadTokens, 0) + COALESCE(events.outputTokens, 0) + COALESCE(events.cacheWriteTokens, 0)';
    expect(result).toBe(expected);
  });

  it('should handle empty string table prefix', () => {
    const result = tokenSumSql('');
    const expected =
      'COALESCE(inputTokens, 0) + COALESCE(cacheReadTokens, 0) + COALESCE(outputTokens, 0) + COALESCE(cacheWriteTokens, 0)';
    expect(result).toBe(expected);
  });

  it('should combine input and output token sums correctly', () => {
    const table = 'test';
    const inputSql = inputTokenSumSql(table);
    const outputSql = outputTokenSumSql(table);
    const totalSql = tokenSumSql(table);

    expect(totalSql).toBe(`${inputSql} + ${outputSql}`);
  });
});

describe('Query utils integration', () => {
  it('should maintain consistency between individual and combined functions', () => {
    const tables = [undefined, '', 'e', 'events', 'messages'];

    tables.forEach((table) => {
      const inputSql = inputTokenSumSql(table);
      const outputSql = outputTokenSumSql(table);
      const totalSql = tokenSumSql(table);

      expect(totalSql).toBe(`${inputSql} + ${outputSql}`);
    });
  });

  it('should generate valid SQL identifiers', () => {
    const result = tokenSumSql('my_table');
    expect(result).toMatch(/^COALESCE\(my_table\./);
    expect(result).not.toContain('undefined');
    expect(result).not.toContain('null');
  });
});
