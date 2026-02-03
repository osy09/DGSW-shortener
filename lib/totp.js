// lib/totp.js
import { TOTP, verifySync } from 'otplib';

const TOTP_SECRET = process.env.TOTP_SECRET;

export function verifyTOTP(token) {
  if (!TOTP_SECRET) {
    throw new Error('TOTP_SECRET 환경 변수가 설정되지 않았습니다.');
  }

  const result = verifySync({ token, secret: TOTP_SECRET });
  return result.valid;
}
