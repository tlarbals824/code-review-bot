import * as crypto from 'crypto';

export function hashString(input: string): string {
    const hash = crypto.createHash('sha256'); // 원하는 해시 알고리즘 선택 가능
    hash.update(input);
    return hash.digest('hex');
}