import * as RadixSelect from "@radix-ui/react-select";
import clsx from "clsx";
import { CSSProperties, useCallback, useEffect, useState } from "react";
import { CheckIcon, SelectIcon } from "../../icons";
import styles from "./Select.module.css";

interface Item extends RadixSelect.SelectItemProps {
  value: string;
  title?: string;
  description?: string;
}

interface Props extends Omit<RadixSelect.SelectProps, "onValueChange"> {
  variant?: "regular" | "subtle";
  initialValue?: string;
  value?: string;
  items: Item[];
  onChange?: RadixSelect.SelectProps["onValueChange"];
  placeholder?: RadixSelect.SelectValueProps["placeholder"];
  aboveOverlay?: boolean;
  className?: RadixSelect.SelectTriggerProps["className"];
}

export function Select({
  variant = "regular",
  initialValue,
  value,
  items,
  onChange,
  placeholder,
  aboveOverlay,
  className,
  ...props
}: Props) {
  const [internalValue, setInternalValue] = useState(initialValue);

  const handleValueChange = useCallback(
    (newValue: string) => {
      if (newValue !== undefined) {
        setInternalValue(newValue);
        onChange?.(newValue);
      }
    },
    [onChange]
  );

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  return (
    <RadixSelect.Root
      value={internalValue}
      onValueChange={handleValueChange}
      defaultValue={initialValue}
      {...props}
    >
      <RadixSelect.Trigger
        className={clsx(className, styles.trigger, {
          [styles.triggerSubtle]: variant === "subtle",
        })}
      >
        <RadixSelect.Value
          placeholder={placeholder}
          className={styles.triggerValue}
        />
        <RadixSelect.Icon className={styles.triggerIcon}>
          <SelectIcon />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className={styles.select}
          style={
            {
              zIndex: aboveOverlay ? "var(--z-overlay)" : undefined,
            } as CSSProperties
          }
        >
          <RadixSelect.Viewport>
            {items.map(({ value, title, description, ...props }) => (
              <RadixSelect.Item
                key={value}
                value={value}
                className={styles.item}
                {...props}
              >
                <div className={styles.itemIndicator}>
                  <RadixSelect.ItemIndicator>
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <CheckIcon />
                    </svg>
                  </RadixSelect.ItemIndicator>
                </div>
                <div className={styles.itemInfo}>
                  <RadixSelect.ItemText className={styles.itemTitle}>
                    {title ?? value}
                  </RadixSelect.ItemText>
                  {description && (
                    <span className={styles.itemDescription}>
                      {description}
                    </span>
                  )}
                </div>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
