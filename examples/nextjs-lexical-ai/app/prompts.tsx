import { ReactNode } from "react";
import { TranslateIcon } from "./icons/TranslateIcon";
import { SpellcheckIcon } from "./icons/SpellcheckIcon";
import { WandIcon } from "./icons/WandIcon";
import { ShortenIcon } from "./icons/ShortenIcon";
import { LengthenIcon } from "./icons/LengthenIcon";
import { StyleIcon } from "./icons/StyleIcon";
import { SummariseIcon } from "./icons/SummariseIcon";
import { ExplainIcon } from "./icons/ExplainIcon";

type OptionChild = {
  text: string;
  prompt: string;
  icon?: ReactNode;
  children?: never;
};

type OptionParent = {
  text: string;
  children: OptionChild[];
  icon: ReactNode;
  prompt?: never;
};

type OptionGroup = {
  text: string;
  options: (OptionChild | OptionParent)[];
};

const languages = [
  "Arabic",
  "Bengali",
  "Chinese",
  "Dutch",
  "English",
  "French",
  "German",
  "Hindi",
  "Japanese",
  "Korean",
  "Nepali",
  "Portuguese",
  "Spanish",
];

const styles = [
  "Professional",
  "Straightforward",
  "Friendly",
  "Poetic",
  "Passive aggressive",
  "Pirate",
];

export const optionsGroups: OptionGroup[] = [
  {
    text: "Modify selection",
    options: [
      {
        text: "Improve writing",
        prompt: "Improve the quality of the text",
        icon: <WandIcon className="h-3.5" />,
      },
      {
        text: "Fix mistakes",
        prompt: "Fix any typos or general errors in the text",
        icon: <SpellcheckIcon className="h-full -ml-0.5" />,
      },
      {
        text: "Simplify",
        prompt: "Shorten the text, simplifying it",
        icon: <ShortenIcon className="h-full" />,
      },
      {
        text: "Add more detail",
        prompt: "Lengthen the text, going into more detail",
        icon: <LengthenIcon className="h-full" />,
      },
    ],
  },
  {
    text: "Generate",
    options: [
      {
        text: "Summarise",
        prompt: "Summarise the text",
        icon: <SummariseIcon className="h-full" />,
      },
      {
        text: "Translate into…",
        children: languages.map((lang) => ({
          text: lang,
          prompt: `Translate text into the ${lang} language`,
        })),
        icon: <TranslateIcon className="h-full" />,
      },
      {
        text: "Change style to…",
        children: styles.map((style) => ({
          text: style,
          prompt: `Change text into ${style} style`,
        })),
        icon: <StyleIcon className="h-full" />,
      },
      {
        text: "Explain",
        prompt: "Explain what the text is about",
        icon: <ExplainIcon className="h-full" />,
      },
    ],
  },
];
