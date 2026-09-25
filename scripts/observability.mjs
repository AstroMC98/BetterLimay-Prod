import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_AGE_DAYS = 180;

const DATASETS = [
  ["services", "services.json"],
  ["offices", "offices.json"],
  ["officials", "officials.json"],
  ["barangays", "barangays.json"],
  ["announcements", "announcements.json"],
  ["legislation", "legislation.json"],
  ["transparency", "transparency.json"],
  ["statistics", "statistics.json"],
  ["serviceReferrals", "service-referrals.json"],
  ["hotlines", "hotlines.json"],
  ["elections", "elections.json"],
];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function scanDataFreshness({
  dataDir,
  now = new Date(),
  maxAgeDays = DEFAULT_MAX_AGE_DAYS,
}) {
  const datasets = {};
  let staleRecords = 0;
  let missingRetrievedAt = 0;
  let invalidRetrievedAt = 0;

  for (const [name, filename] of DATASETS) {
    let raw;
    try {
      raw = await readFile(`${dataDir}/${filename}`, "utf8");
    } catch {
      continue;
    }

    let records;
    try {
      records = JSON.parse(raw);
    } catch {
      datasets[name] = {
        records: 0,
        staleRecords: 0,
        missingRetrievedAt: 0,
        invalidRetrievedAt: 1,
      };
      invalidRetrievedAt += 1;
      continue;
    }

    if (!Array.isArray(records)) {
      datasets[name] = {
        records: 0,
        staleRecords: 0,
        missingRetrievedAt: 0,
        invalidRetrievedAt: 1,
      };
      invalidRetrievedAt += 1;
      continue;
    }

    let datasetStaleRecords = 0;
    let datasetMissingRetrievedAt = 0;
    let datasetInvalidRetrievedAt = 0;

    for (const record of records) {
      const retrievedAt =
        isRecord(record) && isRecord(record.provenance)
          ? record.provenance.retrieved_at
          : undefined;

      if (typeof retrievedAt !== "string" || !retrievedAt.trim()) {
        datasetMissingRetrievedAt += 1;
        continue;
      }

      const retrievedDate = new Date(`${retrievedAt}T00:00:00Z`);
      if (Number.isNaN(retrievedDate.getTime())) {
        datasetInvalidRetrievedAt += 1;
        continue;
      }

      const ageDays = Math.floor((now.getTime() - retrievedDate.getTime()) / DAY_MS);
      if (ageDays > maxAgeDays) datasetStaleRecords += 1;
    }

    datasets[name] = {
      records: records.length,
      staleRecords: datasetStaleRecords,
      missingRetrievedAt: datasetMissingRetrievedAt,
      invalidRetrievedAt: datasetInvalidRetrievedAt,
    };
    staleRecords += datasetStaleRecords;
    missingRetrievedAt += datasetMissingRetrievedAt;
    invalidRetrievedAt += datasetInvalidRetrievedAt;
  }

  return {
    checkedAt: now.toISOString(),
    maxAgeDays,
    datasets,
    staleRecords,
    missingRetrievedAt,
    invalidRetrievedAt,
  };
}

export async function checkPortalHealth({ url, fetcher = fetch, timeoutMs = 5000 } = {}) {
  if (!url) return { status: "skipped", configured: false };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      redirect: "follow",
      signal: controller.signal,
    });
    return {
      status: response.ok ? "ok" : "failed",
      configured: true,
      httpStatus: response.status,
    };
  } catch {
    return { status: "failed", configured: true };
  } finally {
    clearTimeout(timeout);
  }
}

export function createObservabilityReport({ checkedAt, freshness, deployment }) {
  const needsAttention =
    freshness.staleRecords > 0 ||
    freshness.missingRetrievedAt > 0 ||
    freshness.invalidRetrievedAt > 0 ||
    deployment.status === "failed";

  return {
    checkedAt,
    status: needsAttention ? "attention" : "ok",
    freshness,
    deployment,
  };
}

function argumentValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export async function runObservabilityCheck({
  root = process.cwd(),
  maxAgeDays = positiveInteger(process.env.DATA_FRESHNESS_MAX_DAYS, DEFAULT_MAX_AGE_DAYS),
  healthUrl = process.env.PORTAL_HEALTHCHECK_URL,
  now = new Date(),
} = {}) {
  const freshness = await scanDataFreshness({
    dataDir: `${root}/src/data`,
    maxAgeDays,
    now,
  });
  const deployment = await checkPortalHealth({ url: healthUrl });
  return createObservabilityReport({
    checkedAt: now.toISOString(),
    freshness,
    deployment,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const report = await runObservabilityCheck({
    root: argumentValue(args, "--root") ?? process.cwd(),
    maxAgeDays: positiveInteger(
      argumentValue(args, "--max-age-days") ?? process.env.DATA_FRESHNESS_MAX_DAYS,
      DEFAULT_MAX_AGE_DAYS,
    ),
    healthUrl: argumentValue(args, "--health-url") ?? process.env.PORTAL_HEALTHCHECK_URL,
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status === "attention") {
    if (process.env.GITHUB_ACTIONS === "true") {
      process.stdout.write(
        `::error::BetterLimay observability attention: stale=${report.freshness.staleRecords}, missing=${report.freshness.missingRetrievedAt}, invalid=${report.freshness.invalidRetrievedAt}, deployment=${report.deployment.status}\n`,
      );
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
