import { test } from "@playwright/test";
import { Attributes } from "../pageObjects/Attributes";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { navigateToQALoginPage } from "../utilities/helper/navigationHelper";
import merchants from "../api/testData/merchants.json";
import routes from "../utilities/routes.json";

test.describe("Attributes Module", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let attributes;
  let sName;
  let uName;
  let pwd;
  let newAttribute;
  let editAttribute;
  const duplicate_Attribute = "Flavor";
  const specialCharacter = "Attribute12@";

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      attributes = new Attributes(page);
      sName = merchants.merchantLogin.storename;
      uName = merchants.merchantLogin.username;
      pwd = merchants.merchantLogin.password;

      await navigateToQALoginPage(page);
      const [loginApiResponse] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.request().method() === "POST" &&
            res.url().includes(routes.QA_URL.login),
        ),
        loginpage.login(sName, uName, pwd),
      ]);
      await loginApiResponse.json();
      await dashboard.logoDisplayed();
      await dashboard.menuClick();
      await dashboard.inventoryClick();
      await dashboard.attributesClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  test("Login and open Attributes page", async () => {
    await attributes.verifyAttributesPageLoaded();
  });

  test("Verify page URL", async () => {
    await attributes.verifyPageUrl();
  });

  test("List API on page load", async () => {
    await attributes.verifyListApiOnPageLoad();
  });

  test("Verify Attributes page UI elements are displayed", async () => {
    await attributes.verifyAttributesPageUIElements();
  });

  test("Verify Attributes page description text", async () => {
    await attributes.verifyAttributesDescriptionText();
  });

  test("Adding Attribute with Special Character", async () => {
    await attributes.addAttributeBtnClick();
    await attributes.setAttributeName(specialCharacter);
    await attributes.addAttributeClick();
    await attributes.specialCharacterErrorMsg();
    await attributes.cancelBtnClick();
  });

  test("Adding Duplicate Attribute", async () => {
    await attributes.addAttributeBtnClick();
    await attributes.setAttributeName(duplicate_Attribute);
    await attributes.addAttributeClick();
    await attributes.verifyDuplicateAttributeNameError();
    await attributes.cancelBtnClick();
  });

  test("Adding a new attribute", async () => {
    newAttribute = await attributes.generateUniqueAttributeName();
    await attributes.addAttributeBtnClick();
    await attributes.setAttributeName(newAttribute);
    await attributes.addBtnAPI();
    await attributes.successfullDialogDisplay();
    await attributes.verifyAddedAttributeInListWithActions(newAttribute);
  });

  test("Search for the added attribute", async () => {
    await attributes.searchAttribute(newAttribute);
    await attributes.verifySearchedAttributeDisplayed(newAttribute);
  });

  test("Verify attribute name exceeding 50 characters shows error", async () => {
    await attributes.verifyAttributeNameExceedingMaxLengthNotAllowed(50);
  });

  test("Verify Edit attribute name functionality", async () => {
    editAttribute = await attributes.generateUniqueEditAttributeName();
    await attributes.clickEditButton(editAttribute);
  });

  test("Cancel edit", async () => {
    await attributes.cancelEdit(editAttribute);
  });

  test("Max length on edit (>50)", async () => {
    await attributes.verifyMaxLengthOnEdit(editAttribute, 50);
  });

  test("Verify duplicate name while Editing", async () => {
    await attributes.verifyDuplicateOnEdit(duplicate_Attribute);
  });

  test("Search with No Result", async () => {
    await attributes.searchAttribute("Random12122");
    await attributes.noAttributesDisplay();
  });
});
