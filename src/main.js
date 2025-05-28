import { EncodingExplorerApplication } from "./app.js";

export function main(argv) {
  const application = new EncodingExplorerApplication();
  return application.runAsync(argv);
}
