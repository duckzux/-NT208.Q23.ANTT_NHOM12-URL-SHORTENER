const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function encode(num) {
  let result = '';
  while (num > 0) { result = CHARSET[num % 62] + result; num = Math.floor(num / 62); }
  return result || '0';
}
function decode(str) {
  let num = 0;
  for (let i = 0; i < str.length; i++) { num = num * 62 + CHARSET.indexOf(str[i]); }
  return num;
}
module.exports = { encode, decode };
