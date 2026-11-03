export function insertVariable(currentTemplateText, variable, cursorRange) {
  const insertStart = cursorRange?.start ?? currentTemplateText.length;
  const insertEnd = cursorRange?.end ?? currentTemplateText.length;
  const textBefore = currentTemplateText.slice(0, insertStart);
  const textAfter = currentTemplateText.slice(insertEnd);
  const separator = textBefore && !textBefore.endsWith(" ") ? " " : "";
  const insertedText = `${separator}${variable}`;
  return {
    updatedTemplateText: `${textBefore}${insertedText}${textAfter}`,
    cursorPosition: textBefore.length + insertedText.length,
  };
}
