export function employeeListPayload(
  merchantID,
  login_user_email,
  empID,
  login_user_type,
  token_id,
  login_type,
) {
  return {
    merchantID,
    login_user_email,
    empID,
    login_user_type,
    token_id,
    login_type,
  };
}
