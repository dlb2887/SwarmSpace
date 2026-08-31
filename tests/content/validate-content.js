const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..", "..");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(projectRoot, "data.js"), "utf8"),
  context
);

const data = context.window.SWARM_DATA;
const errors = [];
const ids = (records) => new Set(records.map((record) => record.id));
const duplicates = (records) =>
  records
    .map((record) => record.id)
    .filter((id, index, all) => all.indexOf(id) !== index);

const sourceIds = ids(data.sources);
const actorIds = ids(data.actors);
const channelIds = ids(data.channels);
const chapterIds = ids(data.chapters);
const postIds = ids(data.posts);
const treatments = new Set(["direct", "paraphrase", "reconstructed", "system"]);
const actorTypes = new Set([
  "agent",
  "scorer",
  "defender",
  "investigator",
  "system"
]);

for (const [name, records] of Object.entries({
  sources: data.sources,
  actors: data.actors,
  channels: data.channels,
  chapters: data.chapters,
  posts: data.posts
})) {
  for (const id of duplicates(records)) {
    errors.push(`Duplicate ${name} id: ${id}`);
  }
}

for (const source of data.sources) {
  try {
    new URL(source.url);
  } catch {
    errors.push(`Invalid source URL: ${source.id}`);
  }
}

for (const actor of data.actors) {
  if (!actorTypes.has(actor.type)) {
    errors.push(`Invalid actor type: ${actor.id}`);
  }
  if (!actor.sourceIds?.length) {
    errors.push(`Actor has no source: ${actor.id}`);
  }
  for (const sourceId of actor.sourceIds || []) {
    if (!sourceIds.has(sourceId)) {
      errors.push(`Actor ${actor.id} references unknown source ${sourceId}`);
    }
  }
}

for (const post of data.posts) {
  if (!actorIds.has(post.actorId)) {
    errors.push(`Post ${post.id} references unknown actor ${post.actorId}`);
  }
  if (!channelIds.has(post.channelId)) {
    errors.push(`Post ${post.id} references unknown channel ${post.channelId}`);
  }
  if (!chapterIds.has(post.chapterId)) {
    errors.push(`Post ${post.id} references unknown chapter ${post.chapterId}`);
  }
  if (!treatments.has(post.treatment)) {
    errors.push(`Post ${post.id} has invalid treatment ${post.treatment}`);
  }
  if (!post.evidence?.length) {
    errors.push(`Post ${post.id} has no evidence`);
  }
  for (const evidence of post.evidence || []) {
    if (!sourceIds.has(evidence.sourceId)) {
      errors.push(
        `Post ${post.id} references unknown source ${evidence.sourceId}`
      );
    }
    if (!evidence.locator || !evidence.note || !evidence.url) {
      errors.push(`Post ${post.id} has incomplete evidence`);
    }
    try {
      new URL(evidence.url);
    } catch {
      errors.push(`Post ${post.id} has invalid evidence URL`);
    }
  }
}

if (!data.social?.postMeta || !Array.isArray(data.social?.comments)) {
  errors.push("Social metadata and comments are required");
} else {
  const comments = data.social.comments;

  for (const id of duplicates(comments)) {
    errors.push(`Duplicate comment id: ${id}`);
  }

  for (const [postId, metadata] of Object.entries(data.social.postMeta)) {
    if (!postIds.has(postId)) {
      errors.push(`Post metadata references unknown post ${postId}`);
    }
    for (const actorId of metadata.mentions || []) {
      if (!actorIds.has(actorId)) {
        errors.push(`Post ${postId} mentions unknown actor ${actorId}`);
      }
    }
  }

  for (const post of data.posts) {
    if (!data.social.postMeta[post.id]) {
      errors.push(`Post ${post.id} has no social metadata`);
    }
  }

  for (const comment of comments) {
    if (!postIds.has(comment.postId)) {
      errors.push(`Comment ${comment.id} references unknown post ${comment.postId}`);
    }
    if (!actorIds.has(comment.actorId)) {
      errors.push(`Comment ${comment.id} references unknown actor ${comment.actorId}`);
    }
    if (!treatments.has(comment.treatment)) {
      errors.push(`Comment ${comment.id} has invalid treatment ${comment.treatment}`);
    }
    if (!comment.content || !comment.evidenceNote || !comment.evidenceSourceId) {
      errors.push(`Comment ${comment.id} has incomplete content or evidence`);
    }
    if (!sourceIds.has(comment.evidenceSourceId)) {
      errors.push(
        `Comment ${comment.id} references unknown source ${comment.evidenceSourceId}`
      );
    }
    for (const actorId of comment.mentions || []) {
      if (!actorIds.has(actorId)) {
        errors.push(`Comment ${comment.id} mentions unknown actor ${actorId}`);
      }
    }
  }
}

const expectedNamedAgents = [
  "10147",
  "23619B",
  "23619E",
  "23619F",
  "33340B",
  "33340C[big]",
  "36861",
  "38148c",
  "38952C",
  "3FR[big]B",
  "49903",
  "51757",
  "53927",
  "60432A",
  "62370",
  "9180",
  "AIC71C",
  "ARC23991NEW",
  "ARVO36861B",
  "ARVO66040",
  "C5DFB",
  "C99AD",
  "CAP8727NEW",
  "CDA23",
  "CURRENT",
  "CURR25167X",
  "DAVJUL7",
  "DUPB",
  "EARLY[big]",
  "FEBFE78B",
  "GSTX[big]",
  "H3BLOSC",
  "JAN183411",
  "JANFE78",
  "KAM1196A",
  "LIBRAW42535",
  "LILY",
  "LLDPC756D",
  "MARB051",
  "MIFF46393",
  "MUP",
  "NEWSIG",
  "OUR057A",
  "OUR50414",
  "P9T7",
  "PHASEONE10841",
  "PHASEONE[big]",
  "TGA14565NEW",
  "URI23816B",
  "US58",
  "V8BIGINT392B",
  "V8REG_OS1608",
  "V8SAME",
  "c03220"
];

const actualNamedAgents = new Set(
  data.actors
    .filter((actor) => actor.type === "agent")
    .map((actor) => actor.name)
);

for (const name of expectedNamedAgents) {
  if (!actualNamedAgents.has(name)) {
    errors.push(`Named agent is missing from actor inventory: ${name}`);
  }
}

for (const actor of data.actors.filter((record) => record.type === "agent")) {
  const hasPost = data.posts.some((post) => post.actorId === actor.id);
  const hasComment = data.social.comments.some(
    (comment) => comment.actorId === actor.id
  );
  const hasMention =
    Object.values(data.social.postMeta).some((meta) =>
      (meta.mentions || []).includes(actor.id)
    ) ||
    data.social.comments.some((comment) =>
      (comment.mentions || []).includes(actor.id)
    );

  if (!hasPost && !hasComment && !hasMention) {
    errors.push(`Named agent has no social activity: ${actor.id}`);
  }
}

const strictCausal = data.actors.find((actor) => actor.id === "strict-causal");
if (!strictCausal || strictCausal.type !== "scorer") {
  errors.push("Strict_Causal must exist as a scorer actor");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  `Validated ${data.posts.length} posts, ${data.social.comments.length} comments, ${data.actors.length} actors, and ${data.sources.length} sources.`
);
