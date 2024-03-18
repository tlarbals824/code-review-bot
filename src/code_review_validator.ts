import { supabase } from "./database/supabase.js";


import logger from "winston";

export async function validateAlreadyReview(repo: string, hash_value: string){

    const { data, error }  = await supabase
    .from('code_review')
    .select()
    .eq('repo', repo)
    .eq('code_hash_value', hash_value)

    logger.info('data'+data)
    logger.info('error'+error)

    if(!data || data.length <= 0){
        return false;
    }
    return true;
}


