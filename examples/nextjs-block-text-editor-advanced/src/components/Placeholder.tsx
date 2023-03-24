import React, { ComponentType, createRef, useEffect, useState } from "react";
import Button from "./Button";
import styles from "./Placeholder.module.css";
import * as PopoverPrimitive from "@radix-ui/react-popover";

type Input = {
  type: string;
  label: string;
  placeholder: string;
  title?: string;
  required?: boolean;
  pattern?: string;
};

type Values = Record<string, string>;

type Props = {
  icon: ComponentType;
  text: string;
  inputs: Record<string, Input>;
  onSubmit: (values: Values) => void;
  defaultOpen: boolean;
};

export default function Placeholder({
  icon: Icon,
  text,
  inputs,
  onSubmit,
  defaultOpen,
}: Props) {
  const [values, setValues] = useState<Values>({});
  const [open, setOpen] = useState(defaultOpen);
  const [ready, setReady] = useState(false);

  // Focus has to be changed in Editor.tsx which closes the menu, workaround
  useEffect(() => {
    setTimeout(() => setReady(true), 100);
  }, []);

  return (
    <>
      <PopoverPrimitive.Root open={open} onOpenChange={ready ? setOpen : () => {}}>
        <PopoverPrimitive.Trigger asChild>
          <button className={styles.placeholder}>
            <span className={styles.placeholder_icon}>
              <Icon />
            </span>
            {text}
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Anchor />

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            className={styles.popover_content}
            sideOffset={-20}
          >
            <form
              className={styles.popover_form}
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit(values);
              }}
            >
              {Object.entries(inputs).map(
                (
                  [
                    name,
                    {
                      type,
                      label,
                      placeholder,
                      title = undefined,
                      required = false,
                      pattern = undefined,
                    },
                  ],
                  index
                ) => (
                  <div key={name} className={styles.input_row}>
                    <label className={styles.label} htmlFor={name}>
                      {label}
                    </label>
                    <input
                      className={styles.input}
                      id={name}
                      type={type}
                      placeholder={placeholder}
                      title={title}
                      required={required}
                      pattern={pattern}
                      value={values[name] || ""}
                      onChange={(e) =>
                        setValues((vals) => ({
                          ...vals,
                          [name]: e.target.value,
                        }))
                      }
                    />
                  </div>
                )
              )}
              <Button
                className={styles.button}
                appearance="primary"
                ariaLabel="Toggle Strikethrough"
                type="submit"
              >
                Embed
              </Button>
            </form>
            <PopoverPrimitive.Arrow className={styles.popover_arrow} />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </>
  );
}
