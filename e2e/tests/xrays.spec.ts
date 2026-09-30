import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";
import { guessImageType, parseTeeth } from "../../src/lib/xrays";
import { chartSketchToSave, parseChartSketch, parseSketch } from "../../src/lib/sketch";

// A 1×1 pixel PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("a patient's X-rays are listed by date, and can be found by type and tooth", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("tab", { name: /X-rays & Photos/ }).click();
  const tiles = page.getByRole("button", { name: /^Open / });
  await expect(tiles).toHaveCount(5);
  await expect(page.getByText("5 images")).toBeVisible();

  // Tooth 36: the two periapicals, the photo and the bitewing.
  await page.getByLabel("Tooth", { exact: true }).selectOption("36");
  await expect(tiles).toHaveCount(4);
  await page.getByLabel("Type", { exact: true }).selectOption("Periapical");
  await expect(tiles).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Open Periapical · 18 Jun 2026 · Tooth 36" })).toBeVisible();
});

test("add several X-rays at once, with their type, teeth and date", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00003");
  await waitForData(page);
  await page.getByRole("tab", { name: /X-rays & Photos/ }).click();
  await expect(page.getByText("No X-rays or photos yet")).toBeVisible();

  // "Add Files" opens the file picker; set the files on it directly.
  await page.locator('input[type="file"][multiple]').setInputFiles([
    { name: "bitewing-right.png", mimeType: "image/png", buffer: PNG },
    { name: "opg-2026.png", mimeType: "image/png", buffer: PNG },
  ]);
  const dialog = page.getByRole("dialog", { name: "Add 2 images" });
  // The type is guessed from the file name, and can be changed.
  await expect(dialog.getByLabel("Type of bitewing-right.png")).toHaveValue("Bitewing");
  await expect(dialog.getByLabel("Type of opg-2026.png")).toHaveValue("Panoramic (OPG)");
  await dialog.getByLabel("Teeth").fill("16, 99");
  await dialog.getByRole("button", { name: "Add 2 Images" }).click();
  await expect(dialog.getByText("Not a tooth number: 99.", { exact: false })).toBeVisible();
  await dialog.getByLabel("Teeth").fill("16، 17");
  await dialog.getByRole("button", { name: "Add 2 Images" }).click();

  await expect(page.getByRole("status").filter({ hasText: "2 images added." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Bitewing · 26 Sep 2026 · Teeth 16, 17" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Panoramic (OPG) · 26 Sep 2026 · Teeth 16, 17" })).toBeVisible();
});

test("a big file shows how far the upload is, and wrong files are refused", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00003");
  await waitForData(page);
  await page.getByRole("tab", { name: /X-rays & Photos/ }).click();
  await page.locator('input[type="file"][multiple]').setInputFiles([
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") },
    { name: "panoramic.png", mimeType: "image/png", buffer: Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]) },
    { name: "report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") },
  ]);
  await expect(page.getByText("Only JPG, PNG and PDF files can be added: notes.txt")).toBeVisible();
  const dialog = page.getByRole("dialog", { name: "Add 2 images" });
  await expect(dialog.getByLabel("Type of report.pdf")).toHaveValue("Other");
  await dialog.getByRole("button", { name: "Add 2 Images" }).click();
  const bar = page.getByRole("progressbar", { name: "Uploading 1 of 2: panoramic.png" });
  await expect(bar).toBeVisible();
  await expect.poll(async () => Number(await bar.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
  await expect(page.getByRole("status").filter({ hasText: "2 images added." })).toBeVisible();
  // A PDF shows as a document.
  await page.getByRole("button", { name: /^Open Other/ }).click();
  await expect(page.getByRole("dialog").getByText("A PDF is shown as it is", { exact: false })).toBeVisible();
});

test("the viewer zooms, turns, inverts and moves through the images", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("tab", { name: /X-rays & Photos/ }).click();
  await page.getByRole("button", { name: "Open Bitewing · 20 Aug 2026 · Teeth 26, 27, 36, 37" }).click();

  const viewer = page.getByRole("dialog", { name: "Bitewing · 20 Aug 2026 · Teeth 26, 27, 36, 37" });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByText("Zahraa Hussein · 1 of 5")).toBeVisible();
  await expect(viewer.getByRole("button", { name: "Close" })).toBeFocused();

  await viewer.getByRole("button", { name: "Zoom in" }).click();
  await expect(viewer.getByText("125%")).toBeVisible();
  await viewer.getByRole("button", { name: "Invert" }).click();
  await expect(viewer.getByRole("button", { name: "Invert" })).toHaveAttribute("aria-pressed", "true");
  const img = viewer.getByRole("img", { name: "Bitewing · 20 Aug 2026 · Teeth 26, 27, 36, 37" });
  await expect(img).toHaveCSS("filter", /invert\(1\)/);
  await viewer.getByLabel("Brightness").fill("150");
  await expect(img).toHaveCSS("filter", /brightness\(1\.5\)/);
  await viewer.getByRole("button", { name: "Rotate" }).click();

  // Next, and the arrow keys.
  await viewer.getByRole("button", { name: "Next image" }).click();
  await expect(page.getByRole("dialog", { name: "Intraoral photo · 20 Aug 2026 · Tooth 36" })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("dialog", { name: /^Bitewing/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("draw on an X-ray: the drawing is saved on its own layer", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("tab", { name: /X-rays & Photos/ }).click();
  await page.getByRole("button", { name: "Open Periapical · 25 Jun 2026 · Tooth 36" }).click();
  const viewer = page.getByRole("dialog", { name: "Periapical · 25 Jun 2026 · Tooth 36" });
  await viewer.getByRole("button", { name: "Draw" }).click();

  await viewer.getByRole("button", { name: "Circle" }).click();
  await viewer.getByRole("button", { name: "Yellow" }).click();
  const canvas = viewer.getByRole("application", { name: "Drawing on the image" });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("no drawing area");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.55, { steps: 5 });
  await page.mouse.up();
  await expect(canvas.locator("circle")).toHaveCount(1);
  // Text: click, type, Enter.
  await viewer.getByRole("button", { name: "Text" }).click();
  await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.2);
  await page.getByLabel("Text on the image").fill("Check");
  await page.keyboard.press("Enter");
  await expect(canvas.locator("text")).toHaveText("Check");
  await viewer.getByRole("button", { name: "Save Drawing" }).click();
  await expect(page.getByText("Drawing saved. The original image is not changed.")).toBeVisible();

  // The image itself is unchanged; the tile says it has a drawing.
  await viewer.getByRole("button", { name: "Close" }).click();
  const tile = page.getByRole("button", { name: "Open Periapical · 25 Jun 2026 · Tooth 36" });
  await expect(tile.getByText("Has a drawing")).toBeAttached();
  await expect(tile.locator("img")).toHaveAttribute("src", "/demo/xrays/periapical-36-after.svg");
});

test("compare two X-rays side by side, and print one on the letterhead", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("tab", { name: /X-rays & Photos/ }).click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByRole("button", { name: "Choose Periapical · 18 Jun 2026 · Tooth 36 to compare" }).click();
  await page.getByRole("button", { name: "Choose Periapical · 25 Jun 2026 · Tooth 36 to compare" }).click();
  await page.getByRole("button", { name: "Compare (2 of 2)" }).click();
  const compare = page.getByRole("dialog", { name: "Compare" });
  await expect(compare.getByRole("region", { name: "Periapical · 18 Jun 2026 · Tooth 36" })).toBeVisible();
  await expect(compare.getByRole("region", { name: "Periapical · 25 Jun 2026 · Tooth 36" })).toBeVisible();
  await compare.getByRole("button", { name: "Close" }).click();

  await navigate(page, "/xrays/IMG-2026-00001");
  await expect(page.getByRole("heading", { name: "Periapical", exact: true })).toBeVisible();
  await expect(page.getByText("Dental image")).toBeVisible();
  await expect(page.getByText("Zahraa Hussein").first()).toBeVisible();
  // The drawing is printed on the image.
  await expect(page.locator("main svg[preserveAspectRatio=none] circle")).toHaveCount(1);
});

test("the dental chart shows which teeth have X-rays, and can be sketched on", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("tab", { name: "Dental Chart" }).click();
  const tooth36 = page.getByRole("button", { name: /^Tooth 36,/ });
  await expect(tooth36.locator("[data-xray-marker]")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^Tooth 11,/ }).locator("[data-xray-marker]")).toHaveCount(0);

  await tooth36.click();
  await page.getByRole("button", { name: "Open Periapical · 18 Jun 2026 · Tooth 36" }).click();
  const viewer = page.getByRole("dialog", { name: "Periapical · 18 Jun 2026 · Tooth 36" });
  await expect(viewer.getByText("Zahraa Hussein · 4 of 4")).toBeVisible();
  // The dentist's saved drawing is shown on it.
  await expect(viewer.locator("svg[preserveAspectRatio=none] circle")).toHaveCount(1);
  await viewer.getByRole("button", { name: "Close" }).click();

  // A sketch on the chart, with the same drawing tools.
  await page.getByRole("button", { name: "Sketch" }).click();
  // While drawing, the Adult / Child switch is hidden: the drawing belongs to the teeth on screen.
  await expect(page.getByRole("button", { name: "Child", exact: true })).toHaveCount(0);
  const canvas = page.getByRole("application", { name: "Sketch on the chart" });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("no sketch area");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.6, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Save Sketch" }).click();
  await expect(page.getByText("Sketch saved.")).toBeVisible();
  await expect(page.locator("[data-tooth]").first()).toBeVisible();
  await expect(page.locator("polyline[vector-effect]")).toHaveCount(1);
  // The child teeth have a drawing of their own (none yet); the adult one comes back.
  await page.getByRole("button", { name: "Child", exact: true }).click();
  await expect(page.locator("polyline[vector-effect]")).toHaveCount(0);
  await page.getByRole("button", { name: "Adult", exact: true }).click();
  await expect(page.locator("polyline[vector-effect]")).toHaveCount(1);
});

test("delete an X-ray", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("tab", { name: /X-rays & Photos/ }).click();
  await page.getByRole("button", { name: "Open Intraoral photo · 20 Aug 2026 · Tooth 36" }).click();
  await page.getByRole("dialog", { name: /^Intraoral photo/ }).getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog", { name: "Delete this image?" }).getByRole("button", { name: "Delete Image" }).click();
  await expect(page.getByText("Image deleted.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /^Open / })).toHaveCount(4);
});

test("teeth, types and drawings are read carefully", () => {
  expect(parseTeeth("36, 37 ٣٦ 11")).toEqual({ teeth: ["36", "37", "11"], bad: [] });
  expect(parseTeeth("19, 55, 56, 9").bad).toEqual(["19", "56", "9"]);
  const file = (name: string, type = "image/png") => ({ name, type }) as File;
  expect(guessImageType(file("OPG scan.png"))).toBe("Panoramic (OPG)");
  expect(guessImageType(file("report.pdf", "application/pdf"))).toBe("Other");
  expect(guessImageType(file("x.png"), true)).toBe("Intraoral photo");
  expect(guessImageType(file("tooth-46.png"))).toBe("Periapical");
  expect(parseSketch("not json").shapes).toEqual([]);
  expect(parseSketch({ aspect: 2, shapes: [{ kind: "circle", color: "#fff", width: 3, center: [0.5, 0.5], radius: 0.1 }, { kind: "bad" }] }).shapes).toHaveLength(1);
  // The chart keeps a drawing per set of teeth; a single drawing saved the first way still reads.
  const circle = { kind: "circle", color: "#fff", width: 3, center: [0.5, 0.5], radius: 0.1 };
  expect(Object.keys(parseChartSketch({ version: 1, aspect: 0.4, on: "child", shapes: [circle] }))).toEqual(["child"]);
  const both = parseChartSketch({ version: 1, adult: { aspect: 0.4, shapes: [circle] }, child: { aspect: 0.5, shapes: [] } });
  expect(both.adult?.shapes).toHaveLength(1);
  expect(JSON.parse(chartSketchToSave(both))).toEqual({ version: 1, adult: both.adult });
  expect(chartSketchToSave({ child: { version: 1, aspect: 0.5, shapes: [] } })).toBe("");
});
