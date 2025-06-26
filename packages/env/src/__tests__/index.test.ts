import { Env } from '../index';

describe('Env', () => {
  it('should be defined', () => {
    expect(Env.NODE_ENV).toBeDefined();
    expect(Env.DATABASE_URL).toContain('postgres://');
    expect(Env.DATABASE_URL).toContain('test');
  });
});
