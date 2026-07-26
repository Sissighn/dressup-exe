import { expect, test } from "@playwright/test";

const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP8z8BQDwAFgwJ/lwL2nwAAAABJRU5ErkJggg==";
const pngBuffer = Buffer.from(pngBase64, "base64");

test("guest can create avatar, upload closet items, generate outfit, and archive it", async ({
  page,
}) => {
  const closetItems = [];
  let nextItemId = 1;

  await page.route("**/auth/me", async (route) => {
    await route.fulfill({ status: 401, json: { detail: "Missing token" } });
  });

  await page.route("**/auth/guest", async (route) => {
    await route.fulfill({
      status: 200,
      json: { user: { email: "guest@local", role: "guest" } },
    });
  });

  await page.route("**/profile", async (route) => {
    await route.fulfill({ status: 403, json: { detail: "Guest profile" } });
  });

  await page.route("**/generate-avatar", async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        status: "success",
        data: {
          avatar_url: "http://localhost:8000/uploads/avatar.png",
          face_scan_url: "http://localhost:8000/uploads/face.png",
        },
      },
    });
  });

  await page.route("**/closet", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, json: closetItems });
      return;
    }
    await route.fallback();
  });

  await page.route("**/upload-item", async (route) => {
    const body = route.request().postData() || "";
    const category = body.includes("BOTTOMS") ? "BOTTOMS" : "TOPS";
    const item = {
      id: nextItemId,
      name: `${category}-${nextItemId}`,
      category,
      image_path: `http://localhost:8000/uploads/${category.toLowerCase()}-${nextItemId}.png`,
      owner_key: "u_guest",
    };
    nextItemId += 1;
    closetItems.push(item);
    await route.fulfill({ status: 200, json: { status: "success", item } });
  });

  await page.route("**/uploads/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: pngBuffer,
    });
  });

  await page.route("**/try-on-outfit", async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        outfit_url: "http://localhost:8000/uploads/outfit.png",
      },
    });
  });

  await page.route("**/archive-look", async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        status: "success",
        archived_url: "http://localhost:8000/uploads/archived-look.png",
        id: "archived_look_u_guest_1.png",
      },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /continue as guest/i }).click();

  await page.getByRole("link", { name: /my model/i }).click();
  await page.locator('input[name="name"]').fill("Seta");
  await page.locator('input[name="height"]').fill("170");
  await page.locator('input[name="weight"]').fill("60");
  await page.locator('input[type="file"]').setInputFiles({
    name: "face.png",
    mimeType: "image/png",
    buffer: pngBuffer,
  });
  await page.getByRole("button", { name: /generate avatar/i }).click();
  await expect(page.getByRole("button", { name: /try the combi on/i })).toBeVisible();

  await page.getByRole("link", { name: /^closet$/i }).click();
  const topChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /\+ add new/i }).click();
  const topChooser = await topChooserPromise;
  await topChooser.setFiles({
    name: "top.png",
    mimeType: "image/png",
    buffer: pngBuffer,
  });
  await page.getByLabel(/category/i).selectOption("TOPS");
  await page.getByRole("button", { name: /upload to closet/i }).click();
  await expect(page.getByRole("button", { name: "TOPS-1" })).toBeVisible();

  const bottomChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /\+ add new/i }).click();
  const bottomChooser = await bottomChooserPromise;
  await bottomChooser.setFiles({
    name: "bottom.png",
    mimeType: "image/png",
    buffer: pngBuffer,
  });
  await page.getByLabel(/category/i).selectOption("BOTTOMS");
  await page.getByRole("button", { name: /upload to closet/i }).click();
  await expect(page.getByRole("button", { name: "BOTTOMS-2" })).toBeVisible();

  await page.getByRole("link", { name: /^wardrobe$/i }).click();
  const selectButtons = page.getByRole("button", { name: "SELECT" });
  await selectButtons.nth(0).click();
  await selectButtons.nth(1).click();
  await page.getByRole("button", { name: /try the combi on/i }).click();
  await expect(page.getByText("LOOK READY")).toBeVisible();

  await page.getByRole("button", { name: /archive look/i }).click();
  await expect(page.getByText(/archive confirmed/i)).toBeVisible();
});
