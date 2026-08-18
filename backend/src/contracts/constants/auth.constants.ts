export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])\S{8,}$/;
export const passwordRuleMessage =
  "Password must be at least 8 characters long and include uppercase, lowercase, number, special character, and no spaces";
export const mobileRegex = /^[6-9]\d{9}$/;
