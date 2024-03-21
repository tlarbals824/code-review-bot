import { Probot } from "probot";
import logger from "winston";

import { getCodeReviewResult } from "./code_review_handler.js";
import { hashString } from "./hash_handler.js";
import { validateAlreadyReviewSummary, validateAlreadyReview } from "./code_review_validator.js";
import { append, appendSummary } from "./code_review_appender.js";


const commands = require("probot-commands");

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

      const api_key = process.env.OPEN_AI_API_KEY as string;

      let request_code = "";

      for (let i = 0; i < changedFiles.length; i++) {
        const file = changedFiles[i];
        const patch = file.patch || "";

        request_code =
          request_code + "\n file name: " + file.filename + "\n" + patch;
      }

      const hashValue = hashString(request_code);

      if (await validateAlreadyReviewSummary(repo.repo, hashValue))
        return "fail";

      appendSummary(repo.repo, hashValue);

      const message = (await getCodeReviewResult(api_key, request_code))
        .message;

      if (!!message) {
        await context.octokit.issues.createComment({
          repo: repo.repo,
          owner: repo.owner,
          issue_number: context.pullRequest().pull_number,
          body: message,
        });
      }

      return "success";
    }
  );

  commands(app, "review", (context: any, command: any) => {
    const argument = command.arguments.split(/, */);
    const repo = context.repo();
    logger.info(repo);

    const data = context.octokit.repos.compareCommits({
      owner: repo.owner,
      repo: repo.repo,
      head: context.payload.pull_request.head.sha,
      base: context.payload.pull_request.base.sha,
    });

    let { files: changedFiles } = data.data;

    const api_key = process.env.OPEN_AI_API_KEY as string;

    for (let i = 0; i < changedFiles.length; i++) {
      const file = changedFiles[i];
      const patch = file.patch || "";

      if (argument.include(file.filename)) {
        const hashValue = hashString(patch);

        if (async () => validateAlreadyReview(repo.repo, hashValue)) continue;

        const message = async () => getCodeReviewResult(api_key, patch);

        if (!!message()) {
          async () =>
            context.octokit.issues.createComment({
              repo: repo.repo,
              owner: repo.owner,
              issue_number: context.pullRequest().pull_number,
              body: message,
            });
        }

        message().then((result: any) => {
          context.octokit.issues.createComment({
            repo: repo.repo,
            owner: repo.owner,
            issue_number: context.pullRequest().pull_number,
            body: result.message,
          });
        });

        append(repo.repo, hashValue);
      }
    }
  });
};
