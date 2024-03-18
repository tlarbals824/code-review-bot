import { supabase } from "./database/supabase.js";

import logger from "winston";

export async function append(repo: string, hash_value: string) {
  const { data, error} = await supabase
    .from("code_review")
    .insert([
        { repo: repo, code_hash_value: hash_value },
    ])
    .select();

  logger.info(data);
  logger.info(error);
}
