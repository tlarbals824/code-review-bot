import { supabase } from "./database/supabase.js";


export function append(repo: string, hash_value: string){
    supabase.from('code_review')
    .insert({repo:repo,code_hash_value:hash_value})
}