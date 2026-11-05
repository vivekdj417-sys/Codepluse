import { createHash, randomBytes } from "node:crypto";

const atlasApiBaseUrl = "https://cloud.mongodb.com/api/atlas/v1.0";

const digestFields = (challenge) =>
  Object.fromEntries(
    [...challenge.matchAll(/(?:^|,)\s*([\w-]+)=(?:"((?:\\.|[^"])*)"|([^,\s]+))/g)].map(
      ([, key, quoted, unquoted]) => [
        key,
        (quoted ?? unquoted).replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
      ],
    ),
  );

const md5 = (value) => createHash("md5").update(value).digest("hex");

const atlasFetch = async (url, method, publicKey, privateKey) => {
  const initialResponse = await fetch(url, {
    method,
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (initialResponse.status !== 401) return initialResponse;

  const challengeHeader = initialResponse.headers.get("www-authenticate");
  if (!challengeHeader?.startsWith("Digest ")) {
    throw new Error("Atlas API did not return a Digest authentication challenge");
  }

  const challenge = digestFields(challengeHeader.slice("Digest ".length));
  const qop = challenge.qop
    ?.split(",")
    .map((value) => value.trim())
    .find((value) => value === "auth");
  const algorithm = challenge.algorithm ?? "MD5";
  if (!challenge.realm || !challenge.nonce || !qop || !["MD5", "MD5-sess"].includes(algorithm)) {
    throw new Error("Atlas API returned an unsupported Digest authentication challenge");
  }

  const requestUrl = new URL(url);
  const uri = `${requestUrl.pathname}${requestUrl.search}`;
  const cnonce = randomBytes(16).toString("hex");
  const nonceCount = "00000001";
  const initialHa1 = md5(`${publicKey}:${challenge.realm}:${privateKey}`);
  const ha1 =
    algorithm === "MD5-sess"
      ? md5(`${initialHa1}:${challenge.nonce}:${cnonce}`)
      : initialHa1;
  const ha2 = md5(`${method}:${uri}`);
  const response = md5(
    `${ha1}:${challenge.nonce}:${nonceCount}:${cnonce}:${qop}:${ha2}`,
  );
  const authorization = [
    `username="${publicKey}"`,
    `realm="${challenge.realm}"`,
    `nonce="${challenge.nonce}"`,
    `uri="${uri}"`,
    `algorithm=${algorithm}`,
    `response="${response}"`,
    `qop=${qop}`,
    `nc=${nonceCount}`,
    `cnonce="${cnonce}"`,
    challenge.opaque ? `opaque="${challenge.opaque}"` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Digest ${authorization}`,
    },
    signal: AbortSignal.timeout(15000),
  });
};

const requireSuccessfulResponse = async (response, action) => {
  if (response.ok) return;
  throw new Error(`Atlas API failed to ${action} the cluster (HTTP ${response.status})`);
};

export const resumeAtlasClusterIfPaused = async () => {
  const { MONGODB_ATLAS_PUBLIC_KEY, MONGODB_ATLAS_PRIVATE_KEY, MONGODB_ATLAS_PROJECT_ID, MONGODB_ATLAS_CLUSTER_NAME } =
    process.env;
  const settings = [
    MONGODB_ATLAS_PUBLIC_KEY,
    MONGODB_ATLAS_PRIVATE_KEY,
    MONGODB_ATLAS_PROJECT_ID,
    MONGODB_ATLAS_CLUSTER_NAME,
  ];

  if (settings.every((value) => !value)) return false;
  if (settings.some((value) => !value)) {
    throw new Error(
      "Set MONGODB_ATLAS_PUBLIC_KEY, MONGODB_ATLAS_PRIVATE_KEY, MONGODB_ATLAS_PROJECT_ID, and MONGODB_ATLAS_CLUSTER_NAME to enable Atlas auto-resume",
    );
  }

  const projectId = encodeURIComponent(MONGODB_ATLAS_PROJECT_ID);
  const clusterName = encodeURIComponent(MONGODB_ATLAS_CLUSTER_NAME);
  const clusterUrl = `${atlasApiBaseUrl}/groups/${projectId}/clusters/${clusterName}`;
  const credentials = [MONGODB_ATLAS_PUBLIC_KEY, MONGODB_ATLAS_PRIVATE_KEY];
  const statusResponse = await atlasFetch(clusterUrl, "GET", ...credentials);
  await requireSuccessfulResponse(statusResponse, "check");

  const cluster = await statusResponse.json();
  if (cluster.paused !== true) {
    console.log("CodePulse MongoDB Atlas cluster is already running");
    return true;
  }

  const resumeResponse = await atlasFetch(`${clusterUrl}/resume`, "POST", ...credentials);
  await requireSuccessfulResponse(resumeResponse, "resume");
  console.log("CodePulse MongoDB Atlas cluster resume requested");
  return true;
};
