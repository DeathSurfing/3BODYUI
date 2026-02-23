type Context = Record<string, never>;

export async function proxy<T>(
  fn: (ctx: Context) => Promise<T>,
  _roles?: string[]
): Promise<T> {
  void _roles;
  const ctx: Context = {};
  return fn(ctx);
}
