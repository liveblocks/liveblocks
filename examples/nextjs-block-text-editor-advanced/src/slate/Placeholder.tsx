import React, { ComponentType, createRef, useEffect, useState } from "react";
import Button from "../components/Button";
import styles from "../../styles/Placeholder.module.css";

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
  startOpen: boolean;
  icon: ComponentType;
  text: string;
  inputs: Record<string, Input>;
  onSet: (values: Values) => void;
};

export default function Placeholder({ startOpen, icon: Icon, text, inputs, onSet }: Props) {
  const [open, setOpen] = useState(startOpen);
  const [values, setValues] = useState<Values>({});
  const firstInput = createRef<HTMLInputElement>();

  useEffect(() => {
    if (open) {
      firstInput.current?.focus();
    }
  }, [open]);

  if (!open) {
    return (
      <div className={styles.placeholder} onClick={() => setOpen(true)}>
        <span className={styles.icon}>
          <Icon />
        </span>
        {text}
      </div>
    );
  }

  return (
    <form className={styles.placeholderForm} onSubmit={(e) => {
      e.preventDefault();
      onSet(values)
    }}>
      {Object.entries(inputs).map(([name, {
        type,
        icon: InputIcon,
        placeholder,
        title = undefined,
        required = false,
        pattern = undefined,
      }], index) => (
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
            value={values[name]}
            onChange={(e) => setValues(vals => ({
              ...vals,
              [name]: e.target.value,
            }))}
          />
        </div>
      ))}
      <Button
        className={styles.button}
        appearance="primary"
        ariaLabel="Toggle Strikethrough"
        type="submit"
      >
        Embed
      </Button>
    </form>
  )
}
