/* @typescript-eslint/no-namespace: 0 */

global.a = 1;

// declare global {
//   namespace NodeJS {
//     interface Global {
//       document: Document;
//       window: Window;
//       navigator: Navigator;
//     }
//   }
// }

// eslint-disable-next-line @typescript-eslint/prefer-namespace-keyword, @typescript-eslint/no-namespace
declare module NodeJS {
  interface Global {
    a: number;
  }
}
