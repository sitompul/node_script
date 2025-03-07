export function isMutationQuery(query: string): boolean {
  return query.split(" ").some((element) => {
    const upperElement = element.toUpperCase();
    return upperElement === "INSERT" ||
      upperElement === "UPDATE" ||
      upperElement === "DELETE" ||
      upperElement === "MERGE" ||
      upperElement === "REPLACE" ||
      upperElement === "TRUNCATE";
  })
}
