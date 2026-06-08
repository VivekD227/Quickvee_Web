import routes from "../routes.json";

export function getLoginUrl(env = "live_URL") {
  return routes.main_URL[env];
}

export async function navigateToLoginPage(page, env = "live_URL") {
  await page.goto(getLoginUrl(env));
}
