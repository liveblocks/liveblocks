export type Cursor = {
  name: string;
  color: string;
};

export type EmptyText = {
  text: string;
};

export type CustomText = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

declare module "slate" {
  interface CustomTypes {
    Text: CustomText & EmptyText;
  }
}
