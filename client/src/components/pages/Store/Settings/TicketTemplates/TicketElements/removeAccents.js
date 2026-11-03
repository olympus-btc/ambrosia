export function removeAccents(text) {
  return text.normalize("NFD").replace(/\p{M}/gu, "");
}
