import { Color } from "../types";
import { colorToCss } from "../utils";
import styles from "./ColorPicker.module.css";

type Props = {
  disabled?: boolean;
  onChange: (color: Color) => void;
};

export default function ColorPicker({ disabled, onChange }: Props) {
  return (
    <div
      className={`${styles.container} ${
        disabled ? styles.container_disabled : ""
      }`}
    >
      <ColorButton
        color={{ r: 243, g: 82, b: 35 }}
        disabled={disabled}
        onClick={onChange}
      />
      <ColorButton
        color={{ r: 255, g: 198, b: 38 }}
        disabled={disabled}
        onClick={onChange}
      />
      <ColorButton
        color={{ r: 68, g: 202, b: 99 }}
        disabled={disabled}
        onClick={onChange}
      />
      <ColorButton
        color={{ r: 39, g: 142, b: 237 }}
        disabled={disabled}
        onClick={onChange}
      />
      <ColorButton
        color={{ r: 155, g: 105, b: 245 }}
        disabled={disabled}
        onClick={onChange}
      />
      <ColorButton
        color={{ r: 252, g: 142, b: 42 }}
        disabled={disabled}
        onClick={onChange}
      />
      <ColorButton
        color={{ r: 82, g: 82, b: 82 }}
        disabled={disabled}
        onClick={onChange}
      />
      <ColorButton
        color={{ r: 255, g: 255, b: 255 }}
        disabled={disabled}
        onClick={onChange}
      />
    </div>
  );
}

function ColorButton({
  color,
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: (color: Color) => void;
  color: Color;
}) {
  return (
    <button
      className={styles.color_swatch_button}
      disabled={disabled}
      onClick={() => onClick(color)}
    >
      <div
        className={styles.color_swatch}
        style={{ background: colorToCss(color) }}
      />
    </button>
  );
}
