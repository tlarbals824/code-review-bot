import { supabase } from "./database/supabase.js";


export function validateAlreadyReview(repo: string, hash_value: string){
    const data =  supabase
    .from('code_review')
    .select()
    .eq('code_review.repo', repo)
    .eq('code_review.code_hash_value', hash_value)

    if(!data){
        return false;
    }
    return true;
}


