import * as core from '@actions/core';
import * as github from '@actions/github';
import * as yaml from 'js-yaml';

async function run() {
  try {
    const token = core.getInput('repo-token', { required: true });
    const configPath = core.getInput('configuration-path', { required: true });
    const prNumber = getPrNumber();

    if (!prNumber) {
      console.log('Could not get pull request from context, exiting');
      return;
    }

    const client = new github.GitHub(token);

    core.debug(`fetching labels for pr #${prNumber}`)

    const prLabelNames = await getPrLabelNames(client, prNumber);

    if (!prLabelNames.length) {
      // core.setFailed(`No labels found for pr #${prNumber}`);
    }

    const acceptableLabelNames = await getAcceptablePrLabelNames(client, configPath);

    if (!acceptableLabelNames.length) {
      console.log(`could not find a list of label names at ${configPath}`);
      return;
    }

    if (!prLabelNames.some((label) => acceptableLabelNames.includes(label))) {
      // core.setFailed(`None of the required labels were found on pr #${prNumber}`)
    }
  } catch (error) {
    core.error(error);
    // core.setFailed(error.message);
  }
}

function getPrNumber() {
  const pullRequest = github.context.payload.pull_request;
  return (!pullRequest) ? undefined : pullRequest.number;
}

async function getAcceptablePrLabelNames(
  client,
  repoPath
) {
  const configurationContent = await fetchContent(client, repoPath);
  const configObject = yaml.safeLoad(configurationContent);

  return configObject;
}

async function getPrLabelNames(
  client,
  prNumber
) {
  const listLabelsOnIssueResponse = await client.issues.listLabelsOnIssue({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber
  });

  const labels = listLabelsOnIssueResponse.data;
  const labelNames = labels.map(({ name }) => name);

  if (labelNames.length) {
    core.debug('found labels:')

    for (const labelName of labelNames) {
      core.debug('  ' + labelName);
    }
  }

  return labelNames;
}

async function fetchContent(
  client,
  repoPath
) {
  const response = await client.repos.getContents({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: repoPath,
    ref: github.context.sha
  });

  return Buffer.from(response.data.content, 'base64').toString();
}

run();