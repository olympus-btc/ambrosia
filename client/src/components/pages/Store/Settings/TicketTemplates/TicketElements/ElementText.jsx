import { removeAccents } from "./removeAccents";
import { resolveTemplateVariables } from "./resolveTemplateVariables";

export function ElementText({ localId, templateText, businessConfig, printFormats, className }) {
  return (
    <div key={localId} className={className}>
      {removeAccents(resolveTemplateVariables(templateText || "", businessConfig, printFormats))}
    </div>
  );
}
