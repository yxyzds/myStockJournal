import { en } from "./messages/en";

type DotNestedKeys<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : T[K] extends Record<string, unknown>
          ? `${K}.${DotNestedKeys<T[K]>}`
          : never;
    }[keyof T & string];

type DeepString<T> = T extends string
  ? string
  : T extends Record<string, unknown>
    ? { [K in keyof T]: DeepString<T[K]> }
    : T;

export type Messages = DeepString<typeof en>;
export type MessageKey = DotNestedKeys<typeof en>;
