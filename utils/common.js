const KST_OFFSET = 9 * 60 * 60 * 1000;

// 차단할 내부 네트워크 호스트
const BLOCKED_HOSTS = [
  'localhost', '127.0.0.1', '0.0.0.0', '::1',
  '10.', '192.168.',
  ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.`),
];

// 한국 시간(KST) 포맷 반환
export function getKoreanDateTime() {
  const kstDate = new Date(Date.now() + KST_OFFSET);
  const pad = (n) => String(n).padStart(2, '0');

  return `${kstDate.getUTCFullYear()}-${pad(kstDate.getUTCMonth() + 1)}-${pad(kstDate.getUTCDate())} ` +
    `${pad(kstDate.getUTCHours())}:${pad(kstDate.getUTCMinutes())}:${pad(kstDate.getUTCSeconds())}`;
}

// 기본 URL 유효성 검사
export function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// 보안 강화 URL 검증 (내부 IP 차단)
export function validateUrl(string) {
  try {
    const url = new URL(string);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, error: 'http:// 또는 https://로 시작해야 합니다.' };
    }

    const hostname = url.hostname.toLowerCase();

    for (const blocked of BLOCKED_HOSTS) {
      if (hostname === blocked || hostname.startsWith(blocked)) {
        return { valid: false, error: '내부 네트워크 주소는 허용되지 않습니다.' };
      }
    }

    if (hostname.startsWith('[fe80:') || hostname.startsWith('[fc') || hostname.startsWith('[fd')) {
      return { valid: false, error: '내부 네트워크 주소는 허용되지 않습니다.' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: '올바른 URL 형식이 아닙니다.' };
  }
}

// shortCode 유효성 검사 (영숫자 1-20자)
export function isValidShortCode(code) {
  return /^[a-zA-Z0-9]{1,20}$/.test(code);
}
