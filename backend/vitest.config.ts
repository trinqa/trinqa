import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    testTimeout: 15_000,
    // Unit tests must not reach live partners just because backend/.env holds real keys.
    env: {
      DEFINDEX_API_KEY: '',
      DEFINDEX_VAULT_ADDRESS: '',
      SOROSWAP_API_KEY: '',
    },
  },
});
