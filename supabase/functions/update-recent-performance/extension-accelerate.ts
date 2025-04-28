// supabase/functions/update-recent-performance/extension-accelerate.ts

export function withAccelerate(client) {
    return client.$extends({
      query: {
        $allOperations({ operation, model, args, query }) {
          return query(args);
        },
      },
    });
  }
  