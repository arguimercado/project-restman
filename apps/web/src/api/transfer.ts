import { RESTMAN_FILE_EXTENSION, type ImportResult } from "@restman/shared";
import { apiClient } from "../lib/apiClient";
import { downloadBlob, toFileName } from "../lib/download";

export const transferApi = {
  /** Downloads the given collections (or all of the project's) as a `.restman` file. */
  async exportToFile(projectId: string, ids: string[] | undefined, baseName: string) {
    const query = ids?.length ? `?ids=${ids.map(encodeURIComponent).join(",")}` : "";
    const blob = await apiClient.getBlob(`/projects/${projectId}/export${query}`);
    downloadBlob(blob, `${toFileName(baseName, "restman-export")}${RESTMAN_FILE_EXTENSION}`);
  },
  importFile: (projectId: string, file: File) =>
    apiClient.postFile<ImportResult>(`/projects/${projectId}/import`, file),
};
