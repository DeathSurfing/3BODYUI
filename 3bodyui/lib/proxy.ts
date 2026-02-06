type Context = {
  // Context type for proxy operations
};

export async function proxy<T>(
  fn: (ctx: Context) => Promise<T>,
  roles?: string[]
): Promise<T> {
  const ctx: Context = {};
  return fn(ctx);
}
