/// <reference types="vite/client" />

// Vite worker import declarations
declare module "*?worker" {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}
