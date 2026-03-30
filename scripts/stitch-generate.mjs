/**
 * DeepInspect — Stitch SDK UI Generation Script
 *
 * Usage:
 *   STITCH_API_KEY=your_key node scripts/stitch-generate.mjs "prompt here"
 *   STITCH_API_KEY=your_key node scripts/stitch-generate.mjs --list
 *
 * Examples:
 *   node scripts/stitch-generate.mjs "A dark glassmorphism bridge analysis dashboard"
 *   node scripts/stitch-generate.mjs "Redesign the stats panel with more data density"
 *   node scripts/stitch-generate.mjs --edit screenId "Make the buttons more prominent"
 */

import { stitch } from "@google/stitch-sdk";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, "../stitch-output");

// ── Init ────────────────────────────────────────────────────────────────────
if (!process.env.STITCH_API_KEY) {
  console.error("Error: STITCH_API_KEY environment variable required.");
  console.error("Get one at: https://stitch.withgoogle.com/");
  process.exit(1);
}

// Load DESIGN.md for consistent design system
const designPath = resolve(__dirname, "../DESIGN.md");
let designContext = "";
try {
  designContext = readFileSync(designPath, "utf-8");
  console.log("Loaded DESIGN.md for design system consistency\n");
} catch {
  console.warn("Warning: DESIGN.md not found — generating without design system\n");
}

// ── CLI Args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
DeepInspect Stitch Generator
─────────────────────────────
Usage:
  node scripts/stitch-generate.mjs "your UI prompt"
  node scripts/stitch-generate.mjs --list
  node scripts/stitch-generate.mjs --edit <screenId> "edit prompt"
  node scripts/stitch-generate.mjs --variants <screenId>

Examples:
  "A dark command center dashboard showing bridge risk tiers"
  "Mobile-first bridge detail view with risk score and defect images"
  "Stats panel with donut chart, bar chart, and key metrics cards"
  `);
  process.exit(0);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

// ── List projects ───────────────────────────────────────────────────────────
if (args[0] === "--list") {
  console.log("Listing Stitch projects...\n");
  const projects = await stitch.projects();
  if (!projects.length) {
    console.log("No projects found. Generate your first screen to create one.");
  }
  for (const p of projects) {
    console.log(`  Project: ${p.id}`);
  }
  process.exit(0);
}

// ── Edit existing screen ────────────────────────────────────────────────────
if (args[0] === "--edit" && args.length >= 3) {
  const screenId = args[1];
  const editPrompt = args.slice(2).join(" ");
  console.log(`Editing screen ${screenId}...\n`);
  // For editing, we'd need to access the screen via project
  console.log("Edit functionality requires project context. Use the Stitch web UI for now.");
  process.exit(0);
}

// ── Generate variants ───────────────────────────────────────────────────────
if (args[0] === "--variants" && args[1]) {
  console.log(`Generating variants for screen ${args[1]}...\n`);
  console.log("Variant generation requires project context. Use the Stitch web UI for now.");
  process.exit(0);
}

// ── Generate new screen ─────────────────────────────────────────────────────
const prompt = args.join(" ");
const fullPrompt = designContext
  ? `${prompt}\n\n---\nDesign System:\n${designContext}`
  : prompt;

console.log(`Generating UI: "${prompt}"\n`);
console.log("Connecting to Stitch...");

try {
  // Get or create the DeepInspect project
  console.log("Looking for DeepInspect project...");
  let project;
  const projects = await stitch.projects();
  const existing = projects.find((p) => p.data?.title === "DeepInspect V3");
  if (existing) {
    project = existing;
    console.log(`Found project: ${project.id}\n`);
  } else {
    console.log("Creating new project...");
    project = await stitch.createProject("DeepInspect V3");
    console.log(`Created project: ${project.id}\n`);
  }

  console.log("Generating screen (this takes 15-30s)...\n");

  // Use raw tool call — the SDK's generate() has a response parsing issue
  const raw = await stitch.callTool("generate_screen_from_text", {
    projectId: project.id,
    prompt: fullPrompt,
  });

  const screen = raw.outputComponents?.[0]?.design?.screens?.[0];
  if (!screen) {
    console.error("No screen in response.");
    process.exit(1);
  }

  const screenId = screen.id || screen.name?.split("/").pop() || `screen-${Date.now()}`;
  console.log(`Screen generated: ${screen.title || screenId}\n`);

  const ts = Date.now();

  // Save HTML (embedded directly in response)
  if (screen.htmlCode) {
    const htmlPath = resolve(OUTPUT_DIR, `${ts}-screen.html`);
    writeFileSync(htmlPath, screen.htmlCode);
    console.log(`HTML saved: ${htmlPath}`);
  }

  // Save screenshot (base64 in response)
  if (screen.screenshot) {
    const imgPath = resolve(OUTPUT_DIR, `${ts}-screen.png`);
    const b64 = screen.screenshot.replace(/^data:image\/\w+;base64,/, "");
    writeFileSync(imgPath, Buffer.from(b64, "base64"));
    console.log(`Screenshot saved: ${imgPath}`);
  }

  // Save design system if returned
  if (screen.designSystem?.designSystem?.designMd) {
    const dsMdPath = resolve(OUTPUT_DIR, `${ts}-design-system.md`);
    writeFileSync(dsMdPath, screen.designSystem.designSystem.designMd);
    console.log(`Design system saved: ${dsMdPath}`);
  }

  console.log(`\nDone! Project: ${project.id} | Screen: ${screenId}`);
  await stitch.close();
} catch (err) {
  console.error(`\nStitch error: ${err.message}`);
  if (err.message?.includes("AUTH")) {
    console.error("Check your STITCH_API_KEY — get one at https://stitch.withgoogle.com/");
  }
  process.exit(1);
}
