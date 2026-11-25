import { LOG_LEVEL_DEBUG, LOG_LEVEL_ERROR, LOG_LEVEL_TRACE, LOG_LEVEL_WARN } from "@/lib/logs";

const LOG_LEVEL_TEXT_CLASS_NAMES = {
  [LOG_LEVEL_ERROR]: "text-red-600",
  [LOG_LEVEL_WARN]: "text-amber-600",
  [LOG_LEVEL_DEBUG]: "text-gray-400",
  [LOG_LEVEL_TRACE]: "text-gray-400",
};
const DEFAULT_LOG_LEVEL_TEXT_CLASS_NAME = "text-green-700";

export function resolveLogLevelTextClassName(logLevel) {
  return LOG_LEVEL_TEXT_CLASS_NAMES[logLevel] ?? DEFAULT_LOG_LEVEL_TEXT_CLASS_NAME;
}
