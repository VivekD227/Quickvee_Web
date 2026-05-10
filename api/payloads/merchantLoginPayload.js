function loginPayload(username, password, storename, otp = '') {

  return {
    username,
    password,
    storename,
    otp
  };
}

module.exports = { loginPayload };