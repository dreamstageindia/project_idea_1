export function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function setAuthToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function removeAuthToken() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("session_expiry");
}

export function isTokenExpired(expiryDate: string): boolean {
  return new Date() >= new Date(expiryDate);
}
