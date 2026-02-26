import jwt from "jsonwebtoken";

export function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    console.error(error.message);
    return null;
  }
}

export function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error(error.message);
    return null;
  }
}

export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

export function shouldRefreshToken(token, bufferSeconds = 30) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return false;

  const currentTime = Math.floor(Date.now() / 1000);
  const timeToExpiry = decoded.exp - currentTime;

  return timeToExpiry <= bufferSeconds;
}

export function getTokenFromCookies(cookies) {
  return cookies.get("accessToken")?.value || null;
}

export function getRefreshTokenFromCookies(cookies) {
  return cookies.get("refreshToken")?.value || null;
}
