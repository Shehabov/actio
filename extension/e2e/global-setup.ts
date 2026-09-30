import path from "node:path";
import { build } from "vite";

export default async function globalSetup(): Promise<void> {
  await build({ root: path.resolve(__dirname, ".."), logLevel: "warn" });
}
