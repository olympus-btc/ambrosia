import { downloadBlob } from "@/utils/downloadBlob";

export function downloadCsv(csvContent, filename) {
  downloadBlob(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), filename);
}
