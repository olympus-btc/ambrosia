export function removeVariable(currentTemplateText, variable) {
  return currentTemplateText
    .split(variable)
    .join("")
    .replace(/ {2,}/g, " ")
    .trim();
}
