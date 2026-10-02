import React from "react";

import type { VariantProps } from "@gluestack-ui/utils/nativewind-utils";
import { Text as RNText } from "react-native";

import { fontOverride } from "@/lib/i18n/fonts";
import { useLocale } from "@/providers/locale-provider";

import { textStyle } from "./styles";

type ITextProps = React.ComponentProps<typeof RNText> & VariantProps<typeof textStyle>;

const Text = React.forwardRef<React.ComponentRef<typeof RNText>, ITextProps>(function Text(
  {
    className,
    isTruncated,
    bold,
    underline,
    strikeThrough,
    size = "md",
    sub,
    italic,
    highlight,
    style,
    ...props
  },
  ref
) {
  /* LOCALISATION HOOK (LP-91). Every screen in the app renders text through this one component,
     which makes it the only place a script face has to be chosen. `typography.css` names the
     Latin faces, so English returns null here and costs nothing; Sinhala and Tamil return a
     family that is applied over the class, because a CSS custom property cannot be swapped at
     runtime in React Native. See `lib/i18n/fonts.ts`. */
  const { language } = useLocale();
  const family = fontOverride(language, className);

  return (
    <RNText
      style={family ? [{ fontFamily: family }, style] : style}
      className={textStyle({
        isTruncated: isTruncated as boolean,
        bold: bold as boolean,
        underline: underline as boolean,
        strikeThrough: strikeThrough as boolean,
        size,
        sub: sub as boolean,
        italic: italic as boolean,
        highlight: highlight as boolean,
        class: className
      })}
      {...props}
      ref={ref}
    />
  );
});

Text.displayName = "Text";

export { Text };
