import { useState } from "react";
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
  ...inputProps
}: AppTextFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const invalid = Boolean(error);

  return (
    <FormControl isInvalid={invalid} isDisabled={!editable} className="gap-1.5">
      <FormControlLabel className="mb-0">
        <FormControlLabelText className="type-body-bold text-foreground">
          {label}
        </FormControlLabelText>
      </FormControlLabel>

      <Input
        isInvalid={invalid}
        isDisabled={!editable}
        className="h-control rounded-field border-border bg-card px-4"
      >
        <InputField
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
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
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
