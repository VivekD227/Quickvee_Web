import { loginResponse } from "../apiHelper/loginHelper";
import { setMerchantID } from "./sessionData";
import { expect } from "@playwright/test";
import merchants from "../../api/testData/merchants.json";
let storeName;
let userName;
let password;

export async function getMerchantID(page, loginpage) {
  storeName = merchants.validUser.storename;
  userName = merchants.validUser.username;
  password = merchants.validUser.password;
  const responseBody = await loginResponse(
    page,
    loginpage,
    storeName,
    userName,
    password,
  );

  expect(responseBody.login_type).toBe("merchant");

  return responseBody.data.merchant_id;
}
