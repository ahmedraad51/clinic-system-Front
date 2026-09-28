import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";
import { csvSafe } from "../../src/lib/format";
import { maskPhone } from "../../src/lib/phone";

test("exported cells cannot run as spreadsheet formulas", () => {
  expect(csvSafe("=HYPERLINK(\"http://x\")")).toBe("'=HYPERLINK(\"http://x\")");
  expect(csvSafe("+20 100")).toBe("'+20 100");
  expect(csvSafe("@SUM(A1)")).toBe("'@SUM(A1)");
  expect(csvSafe("-5+3")).toBe("'-5+3");
  expect(csvSafe("Zahraa Hussein")).toBe("Zahraa Hussein");
  // Numbers stay numbers, negative ones too.
  expect(csvSafe(-50)).toBe("-50");
  expect(csvSafe(3000)).toBe("3000");
});

test("phone numbers can be shown with their middle hidden", () => {
  expect(maskPhone("+964 770 123 4567")).toBe("+964 7•• ••• 4567");
  expect(maskPhone("07801112233")).toBe("0780•••2233");
  expect(maskPhone("12345")).toBe("12345");
  expect(maskPhone("")).toBe("");
});

test("the screen size is chosen per computer and kept", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  const size = page.getByRole("group", { name: "Screen size" });
  await size.getByRole("button", { name: "120%" }).click();
  await expect(page.locator("html")).toHaveAttribute("style", /font-size: 120%/);
  await page.reload();
  await waitForData(page);
  await expect(page.locator("html")).toHaveAttribute("style", /font-size: 120%/);
  await expect(page.getByRole("group", { name: "Screen size" }).getByRole("button", { name: "120%" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("group", { name: "Screen size" }).getByRole("button", { name: "100%" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("style", /font-size/);
});

test("the WhatsApp log hides the middle of phone numbers", async ({ page }) => {
  await page.goto("/whatsapp");
  await waitForData(page);
  await page.getByRole("tab", { name: /Message Log|Log/ }).click();
  await waitForData(page);
  // Yousif Sattar's number is 07801112233.
  await expect(page.getByText("0780•••2233")).toBeVisible();
  await expect(page.getByText("07801112233")).toHaveCount(0);
});

test("the address box suggests the governorates of Iraq", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await navigate(page, "/patients/new");
  await expect(page.getByLabel("Address")).toHaveAttribute("list", "iraq-governorates");
  await expect(page.locator("#iraq-governorates option")).toHaveCount(19);
  await expect(page.locator("#iraq-governorates option[value='Baghdad']")).toHaveCount(1);
});
