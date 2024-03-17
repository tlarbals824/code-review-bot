import { Probot, ProbotOctokit } from "probot";
import logger from "winston";

import { getCodeReviewResult } from "./code_review_handler.js";

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
            logger.error("no changed, fail");
            return "no changed";
          }
    
          const api_key = process.env.OPEN_AI_API_KEY;
    
          if(!api_key){
            return "api key not setting";
          }
    
          for (let i = 0; i < changedFiles.length; i++) {
            const file = changedFiles[i];
            const patch = file.patch || "";
    
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
            }
          }
          return "success";
        }
      );
};
