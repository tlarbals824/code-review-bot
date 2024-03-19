import { Probot } from "probot";
import logger from "winston";

import { getCodeReviewResult } from "./code_review_handler.js";
import { hashString } from "./hash_handler.js";
import { validateAlreadyReview } from "./code_review_validator.js";
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

      let { files: changedFiles } = data.data;

      if (!changedFiles?.length) {
        logger.error("no changed");
        return "no changed";
      }

      const api_key = process.env.OPEN_AI_API_KEY;

      if (!api_key) {
        return "api key not setting";
      }

      let request_code = "";

      for (let i = 0; i < changedFiles.length; i++) {
        const file = changedFiles[i];
        const patch = file.patch || "";

        const hashValue = hashString(patch);

        if (await validateAlreadyReview(repo.repo, hashValue)) continue;

        request_code = request_code + "\n file name: "+ file.filename + "\n" + patch;

        append(repo.repo, hashValue);
      }

      const message = (await getCodeReviewResult(api_key, request_code)).message;

      if (!!message) {
        await context.octokit.issues.createComment({
          repo: repo.repo,
          owner: repo.owner,
          issue_number: context.pullRequest().pull_number,
          body: message
        });
      }

      return "success";
    }
  );
};
