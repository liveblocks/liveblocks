async function getTextContent(page, id) {
  const element = await page.$(`#${id}`);
  const textContentHandle = await element.getProperty("textContent");
  return await textContentHandle.jsonValue();
}

async function getJsonContent(page, id) {
  return JSON.parse(await getTextContent(page, id));
}

function getMyPresence(page) {
  return getJsonContent(page, "me");
}

function getOthers(page) {
  return getJsonContent(page, "others");
}

const TEST_URL = "http://localhost:3007";

describe("Presence", () => {
  it("my presence without initial presence should be an empty object", async () => {
    const page = await browser.newPage();
    await page.goto(TEST_URL);

    expect(await getMyPresence(page)).toEqual({});

    await page.close();
  });

  it("2 clients without presence", async () => {
    const firstPage = await browser.newPage();
    await firstPage.goto(TEST_URL);

    const secondPage = await browser.newPage();
    await secondPage.goto(TEST_URL);

    await delay(10000);

    const othersFirstPage = await getOthers(firstPage);
    const othersSecondPage = await getOthers(secondPage);

    expect(othersFirstPage.length).toEqual(1);
    expect(othersFirstPage[0].presence).toEqual({});
    expect(othersSecondPage.length).toEqual(1);
    expect(othersSecondPage[0].presence).toEqual({});

    await firstPage.close();
    await secondPage.close();
  });
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
