import axios from "axios";

export interface CodeReviewResponse{
    message: string
}

export interface CodeReviewRequest {
    code: string;
    api_key: string;
  }

class CodeReviewRequestImpl implements CodeReviewRequest {
    constructor(public code: string, public api_key: string){}
}

export const getCodeReviewResult = async(api_key: string, code: string) : Promise<CodeReviewResponse> => {
    const path = process.env.CODE_REVIEW_API_URL

    if(!path){
        throw Error("code review api url should config in .env")
    }

    const body: CodeReviewRequest = new CodeReviewRequestImpl(code, api_key)
    const result = await axios.post<CodeReviewResponse>(path, body)
    return result.data
}