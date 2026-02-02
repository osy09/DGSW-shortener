// utils/base62.js

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const CODE_LENGTH = 5;

/**
 * 랜덤 5글자 영숫자 코드 생성
 * @returns {string} 5글자 영숫자 코드
 */
export function generateCode() {
  let result = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    result += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return result;
}
