// Copies the legal documents from the app (single source: src/content/privacy.json and
// terms.json) to the public web pages and the docs. Run from mobile/ after editing either:
//   node scripts/sync-legal.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const DOCS = [
  { source: "src/content/privacy.json", page: "../admin-web/public/privacy.html", markdown: "../docs/privacy/privacy-policy.md" },
  { source: "src/content/terms.json", page: "../admin-web/public/terms.html", markdown: "../docs/legal/terms-of-service.md" },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function html(doc) {
  const sections = doc.sections
    .map((s) =>
      [
        `<h2>${esc(s.heading)}</h2>`,
        ...(s.paragraphs ?? []).map((p) => `<p>${esc(p)}</p>`),
        s.bullets ? `<ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "",
        ...(s.after ?? []).map((p) => `<p>${esc(p)}</p>`),
      ].join("\n"),
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AgricDrone Hub ${esc(doc.title)}</title>
<link rel="icon" type="image/png" href="/logo-agriseta.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  :root { --teal-ink: #0e7c72; --ink: #22262a; --muted: #66737f; --page: #fafafa; --line: #e0e6eb; }
  body { margin: 0; background: var(--page); color: var(--ink); font-family: Inter, "Segoe UI", Arial, sans-serif; line-height: 1.6; }
  main { max-width: 760px; margin: 0 auto; padding: 40px 16px 64px; }
  .card { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 32px; }
  .eyebrow { color: var(--teal-ink); font-weight: 600; font-size: 14px; margin: 0 0 4px; }
  h1 { margin: 0 0 4px; font-size: 32px; }
  h2 { font-size: 19px; margin: 28px 0 8px; }
  .muted { color: var(--muted); font-size: 14px; }
  .draft { background: #fdf6dc; border: 1px solid #f1dd8d; border-radius: 6px; padding: 10px 12px; margin: 20px 0; font-size: 14px; }
  ul { padding-left: 20px; } li { margin: 4px 0; }
  @media (max-width: 600px) { .card { padding: 20px; } h1 { font-size: 26px; } }
</style>
</head>
<body>
<main>
  <div class="card">
    <p class="eyebrow">AgricDrone Hub</p>
    <h1>${esc(doc.title)}</h1>
    <p class="muted">Last updated ${esc(doc.updated)}</p>
    <div class="draft">${esc(doc.status)}</div>
    <p>${esc(doc.intro)}</p>
${sections}
  </div>
</main>
</body>
</html>
`;
}

function markdown(doc, source) {
  return [
    `# AgricDrone Hub ${doc.title}`,
    "",
    `_Last updated ${doc.updated}._ **${doc.status}**`,
    "",
    `> Generated from \`mobile/${source}\` by \`mobile/scripts/sync-legal.mjs\`; edit the JSON, not this file.`,
    "",
    doc.intro,
    ...doc.sections.flatMap((s) => [
      "",
      `## ${s.heading}`,
      "",
      ...(s.paragraphs ?? []).flatMap((p) => [p, ""]),
      ...(s.bullets ?? []).map((b) => `- ${b}`),
      ...(s.bullets ? [""] : []),
      ...(s.after ?? []).flatMap((p) => [p, ""]),
    ]),
    "",
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

for (const { source, page, markdown: md } of DOCS) {
  const doc = JSON.parse(readFileSync(source, "utf8"));
  writeFileSync(page, html(doc));
  mkdirSync(md.slice(0, md.lastIndexOf("/")), { recursive: true });
  writeFileSync(md, markdown(doc, source));
  console.log(`wrote ${page.replace("../", "")} and ${md.replace("../", "")}`);
}
