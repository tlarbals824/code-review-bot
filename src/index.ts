import { Probot } from "probot";
import logger from "winston";

import { getCodeReviewResult } from "./code_review_handler.js";
import { hashString } from "./hash_handler.js";
import {
  validateAlreadyReviewSummary,
  validateAlreadyReview,
} from "./code_review_validator.js";
import { append, appendSummary } from "./code_review_appender.js";

const commands = require("probot-commands");

export default (app: Probot) => {
  app.on(
    ["pull_request.opened"],
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

        request_code = request_code + "\n file name: " + file.filename + "\n" + patch;
      }

      const hashValue = hashString(request_code);

      if (await validateAlreadyReviewSummary(repo.repo, hashValue))
        return "fail";

      appendSummary(repo.repo, hashValue);

      const message = (await getCodeReviewResult(api_key, request_code)).message;

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

  commands(app, "review", async (context: any, command: any) => {
    const argument = command.arguments.split(/, */);
    const repo = context.repo();
    logger.info(repo);

    const pr_info = await context.octokit.rest.pulls.get({
      owner: repo.owner,
      repo: repo.repo,
      pull_number: context.payload.issue.number,
    });

    const pr_data = pr_info.data;

    const data = await context.octokit.repos.compareCommits({
      owner: repo.owner,
      repo: repo.repo,
      head: pr_data.head.sha,
      base: pr_data.base.sha,
    });

    let { files: changedFiles, commits } = data.data;

    const api_key = process.env.OPEN_AI_API_KEY as string;

    for (let i = 0; i < changedFiles.length; i++) {
      const file = changedFiles[i];
      const patch = file.patch || "";

      if (argument.includes(file.filename)) {
        const hashValue = hashString(patch);

        if (await validateAlreadyReview(repo.repo, hashValue)) continue;

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

        append(repo.repo, hashValue);
      }
    }
  });
};
