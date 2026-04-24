import * as wmill from "windmill-client";

type Hook = {
  path: string;
  args?: object;
};

type ExecuteHooksInput = {
  hooks: Hook[];
  context: object;
};

export async function main(input: ExecuteHooksInput) {
  const results = [];

  for (const hook of input.hooks) {
    try {
      const args = {
        ...input.context,
        ...(hook.args || {}),
      };

      const result = await wmill.runScript(hook.path, args);
      
      results.push({
        hook: hook.path,
        success: true,
        result: result,
      });
    } catch (error) {
      results.push({
        hook: hook.path,
        success: false,
        error: error.message,
      });
      
      throw new Error(`Hook failed: ${hook.path} - ${error.message}`);
    }
  }

  return {
    success: true,
    results: results,
  };
}
