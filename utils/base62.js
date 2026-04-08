import crypto from 'crypto';

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const CODE_LENGTH = 5;
const MAX_BYTE = 256 - (256 % CHARSET.length); // 바이어스 방지용 최대값

// 암호학적으로 안전한 5글자 코드 생성
export function generateCode() {
  let result = '';

  for (let i = 0; i < CODE_LENGTH; i++) {
    let rand;
    do {
      rand = crypto.randomBytes(1)[0];
    } while (rand >= MAX_BYTE);
    result += CHARSET[rand % CHARSET.length];
  }

  return result;
}
