import { httpClient, parseJsonResponse } from "@/lib/http";

export async function getPublicUsers() {
  const publicUsersResponse = await httpClient("/users/public");
  const publicUsers = await parseJsonResponse(publicUsersResponse, []);
  return publicUsers ?? [];
}
