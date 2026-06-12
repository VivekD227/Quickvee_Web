export function deleteEmployeePayload(
  merchantId,
  email,
  token_id,
  login_typr,
  token,
) {
  return {
    merchantId,
    email,
    token_id,
    login_typr,
    token,
  };
}
