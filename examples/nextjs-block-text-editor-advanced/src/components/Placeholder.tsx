import React, { ComponentType, createRef, useEffect, useState } from "react";
import Button from "./Button";
import styles from "./Placeholder.module.css";

type Input = {
  type: string;
  icon: ComponentType;
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
};

export default function Placeholder({
  icon: Icon,
  text,
  inputs,
  onSubmit,
}: Props) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Values>({});
  const firstInput = createRef<HTMLInputElement>();

  useEffect(() => {
    if (open) {
      firstInput.current?.focus();
    }
  }, [open]);

  return (
    <div className={styles.placeholder}>
      <div className={styles.outside} onClick={() => setOpen(!open)} />
      <span className={styles.icon}>
        <Icon />
      </span>
      {text}
      {open ? (
        <>
          <div className={styles.outside} onClick={() => setOpen(false)} />
          <form
            className={styles.placeholderForm}
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
                    icon: InputIcon,
                    placeholder,
                    title = undefined,
                    required = false,
                    pattern = undefined,
                  },
                ],
                index
              ) => (
                <div key={name} className={styles.inputRow}>
                  <span className={styles.icon}>
                    <InputIcon />
                  </span>
                  <input
                    className={styles.input}
                    ref={index === 0 ? firstInput : null}
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
        </>
      ) : null}
    </div>
  );
}
