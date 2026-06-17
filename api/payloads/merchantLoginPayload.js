export function loginPayload(username, password, storename, otp = "") {
  return {
    username,
    password,
    storename,
    otp,
  };
}

export function employeeListPayload(merchantID, presetID, email) {
  return {
    merchantID,
    presetID,
    email,
  };
}
