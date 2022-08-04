import React, { ComponentType, createRef, useEffect, useRef, useState } from "react";
import Button from "../components/Button";

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
  inputs: Record<string, Input>;
  onSet: (values: Values) => void;
};

export default function Placeholder({ inputs, onSet }: Props) {
  const [values, setValues] = useState<Values>({});
  const firstInput = createRef<HTMLInputElement>();

  useEffect(() => {
    firstInput.current?.focus();
  }, [firstInput]);

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSet(values)
    }}>
      {Object.entries(inputs).map(([name, {
        type,
        icon: Icon,
        placeholder,
        title = undefined,
        required = false,
        pattern = undefined,
      }], index) => (
        <div key={name} >
          <Icon />
          <input
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
        appearance="primary"
        ariaLabel="Toggle Strikethrough"
        type="submit"
      >
        Embed
      </Button>
    </form>
  )
}
