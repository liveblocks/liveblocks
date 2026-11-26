import { type Download, expect, test } from "@playwright/test";
import { openSlideshow, uniqueRoomUrl } from "@/tests/e2e-helpers";

test("Download .pptx eventually produces a slides.pptx file (the first click can lose the race with the offscreen iframe load)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ body: "", contentType: "text/css" })
  );
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await openSlideshow(page, uniqueRoomUrl("pptx"));

  const button = page.getByRole("button", { name: "Download .pptx" });
  let download: Download | null = null;
  for (let attempt = 0; attempt < 3 && !download; attempt++) {
    const downloadPromise = page
      .waitForEvent("download", { timeout: 20_000 })
      .catch(() => null);
    await expect(button).toBeEnabled();
    await button.click();
    download = await downloadPromise;
  }

  expect(download, "no download after three attempts").not.toBeNull();
  expect(download!.suggestedFilename()).toBe("slides.pptx");
  expect(await download!.path()).toBeTruthy();
});
