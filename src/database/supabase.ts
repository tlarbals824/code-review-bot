import { createClient } from "@supabase/supabase-js";

interface Database {
  public: {
    Tables: {
      code_review: {
        Row: {
          id: number;
          repo: string;
          code_hash_value: string;
        };
        Insert: {
          id?: number;
          repo: string;
          code_hash_value: string;
        };
      };
    };
  };
}

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_ANON_KEY as string
);
