// Map Langflow data types to softened Soft Oat port colors.
// Each entry names a CSS variable that is defined per-theme in langflow-viewer.css.
// Colors are desaturated to fit the Soft Oat palette while preserving semantic
// meaning (JSON=red-ish, Table=pink-ish, LanguageModel=indigo-ish, etc.).

const TYPE_TO_VAR: Record<string, string> = {
  // Langflow core types -> softened semantic colors
  json: "--port-json",
  data: "--port-data",
  table: "--port-table",
  dataframe: "--port-table",
  embeddings: "--port-emerald",
  language_model: "--port-indigo",
  llm: "--port-indigo",
  message: "--port-indigo",
  text: "--port-indigo",
  memory: "--port-orange",
  chatmemory: "--port-orange",
  tool: "--port-cyan",
  toolset: "--port-cyan",
  agent: "--port-cyan",
  prompt: "--port-rose",
  document: "--port-rose",
  file: "--port-rose",
  boolean: "--port-sage",
  int: "--port-sage",
  float: "--port-sage",
  slider: "--port-sage",
  code: "--port-violet",
  api: "--port-violet",
  nesteddict: "--port-gray",
  dict: "--port-gray",
  string: "--port-gray",
  unknown: "--port-gray",
};

export function portColorVar(dataTypes: string[]): string {
  for (const type of dataTypes) {
    const key = type.toLowerCase();
    if (TYPE_TO_VAR[key]) return `var(${TYPE_TO_VAR[key]})`;
  }
  return "var(--port-gray)";
}
