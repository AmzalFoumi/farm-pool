import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TextInputProps } from "react-native";

import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText
} from "@/components/ui/form-control";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icon";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";

type AppTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** A message under the field. Its presence is what marks the field invalid. */
  error?: string;
  /** Password fields: masked, with a show/hide toggle in the trailing slot. */
  secure?: boolean;
  /** Stable handle for end-to-end tests. Lands on the `InputField` itself, so Maestro targets
   *  the thing that takes the text rather than the wrapper around it. */
  testID?: string;
  /**
   * `"outlined"` is the bordered white field fourteen screens already use.
   *
   * `"filled"` drops the border and sits the field on `card-muted` instead — for a screen whose
   * background is white, where a hairline box is a second, quieter way of saying what the fill
   * already says. The border comes back in `destructive` when the field is invalid, because an
   * error is the one state a fill change cannot carry on its own.
   *
   * **Opt-in on purpose.** This component is shared by sixteen screens across every role, so
   * flipping the default from one screen's design review would restyle all of them.
   */
  variant?: "outlined" | "filled";
  /**
   * Drop the label above the field and let the placeholder carry it.
   *
   * For a short, obvious form — log in is two fields — where a label over each one is a third and
   * fourth line of text saying what the placeholder already says.
   *
   * **The label does not disappear, it stops being drawn.** It becomes the input's
   * `accessibilityLabel`, so a screen reader still announces the field by name. A placeholder
   * alone would not: it is not a label, and it vanishes the moment anyone types. Do not use this
   * on a form long enough that a user might lose track of which field they are in — the
   * placeholder goes with the first keystroke, and then nothing on screen says what the value is.
   */
  labelHidden?: boolean;
} & Pick<
  TextInputProps,
  | "placeholder"
  | "keyboardType"
  | "autoCapitalize"
  | "autoComplete"
  | "textContentType"
  | "returnKeyType"
  | "onSubmitEditing"
  | "editable"
>;

/**
 * A labelled text input on the design system: 58dp tall (`h-control`, the same
 * height as the buttons it sits above), `rounded-field`, the error text in
 * `destructive`. gluestack's FormControl supplies the invalid state and the
 * screen-reader wiring (the error is announced, not just shown); this file
 * supplies the FarmPool metrics so the two auth forms cannot drift apart.
 */
export function AppTextField({
  label,
  value,
  onChangeText,
  error,
  secure = false,
  editable = true,
  testID,
  variant = "outlined",
  labelHidden = false,
  ...inputProps
}: AppTextFieldProps) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const invalid = Boolean(error);

  /* `border-0` rather than a colour: the border width lives in the vendored gluestack base
     (`components/ui/input`), so it has to be turned off here rather than tinted away. */
  const surface =
    variant === "filled"
      ? `bg-card-muted ${invalid ? "border-2 border-destructive" : "border-0"}`
      : "border-border bg-card";

  return (
    <FormControl isInvalid={invalid} isDisabled={!editable} className="gap-1.5">
      {labelHidden ? null : (
        <FormControlLabel className="mb-0">
          <FormControlLabelText className="type-body-bold text-foreground">
            {label}
          </FormControlLabelText>
        </FormControlLabel>
      )}

      <Input
        isInvalid={invalid}
        isDisabled={!editable}
        className={`h-control rounded-field px-4 ${surface}`}
      >
        <InputField
          testID={testID}
          /* Only when the label is not drawn: with a visible label, gluestack FormControl has
             already wired the two together, and setting this as well makes a reader say it twice. */
          {...(labelHidden ? { accessibilityLabel: label } : {})}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          secureTextEntry={secure && !revealed}
          /* Placeholder colour comes from the vendored base
             (`placeholder:text-muted-foreground`), so only the type step is set here. */
          className="type-body-lg text-foreground"
          {...inputProps}
        />
        {secure && (
          <InputSlot
            onPress={() => setRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : t("common.showPassword")}
            className="min-h-tap min-w-tap items-center justify-center"
          >
            <InputIcon
              as={revealed ? EyeOffIcon : EyeIcon}
              className="h-6 w-6 text-muted-foreground"
            />
          </InputSlot>
        )}
      </Input>

      {error ? (
        <FormControlError className="mt-0">
          <FormControlErrorText className="type-caption text-destructive">
            {error}
          </FormControlErrorText>
        </FormControlError>
      ) : null}
    </FormControl>
  );
}
