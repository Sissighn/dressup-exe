import "@testing-library/jest-dom/vitest";

globalThis.URL.createObjectURL =
  globalThis.URL.createObjectURL || (() => "blob:test-preview");

globalThis.URL.revokeObjectURL = globalThis.URL.revokeObjectURL || (() => {});
