/**
 * Hono environment type declarations.
 * Extend Bindings here when adding new context variables.
 */

export type AppEnv = {
  Variables: {
    userId: string;
    userRole: string;
  };
};
