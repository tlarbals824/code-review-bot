import { Probot } from "probot";
import logger from "winston";

import { getCodeReviewResult } from "./code_review_handler.js";
import { hashString } from "./hash_handler.js";
import {validateAlreadyReview } from "./code_review_validator.js"
import { append } from "./code_review_appender.js";

export default (app: Probot) => {
    app.on(
        ["pull_request.opened", "pull_request.synchronize"],
        async (context) => {
          const repo = context.repo();
          logger.info(repo);
    
          const data = await context.octokit.repos.compareCommits({
            owner: repo.owner,
            repo: repo.repo,
            head: context.payload.pull_request.head.sha,
            base: context.payload.pull_request.base.sha,
          });
    
          let { files: changedFiles, commits } = data.data;
    
          if (!changedFiles?.length) {
            logger.error("no changed");
            return "no changed";
          }
    
          const api_key = process.env.OPEN_AI_API_KEY;
    
          if(!api_key){
            return "api key not setting";
          }
    
          for (let i = 0; i < changedFiles.length; i++) {
            const file = changedFiles[i];
            const patch = file.patch || "";

            const hashValue = hashString(patch)

            if(await validateAlreadyReview(repo.repo, hashValue))
                continue;

    
            const message = (await getCodeReviewResult(api_key, patch)).message;

    
            if (!!message) {
              await context.octokit.pulls.createReviewComment({
                repo: repo.repo,
                owner: repo.owner,
                pull_number: context.pullRequest().pull_number,
                commit_id: commits[commits.length - 1].sha,
                path: file.filename,
                body: message,
                position: patch.split("\n").length - 1,
              });

              append(repo.repo, hashValue);
            }


          }
          return "success";
        }
      );
};
