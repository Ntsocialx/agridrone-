import { Text as RNText, type TextProps } from "react-native";

const HAS_WEIGHT = /\bfont-(normal|medium|semibold|bold)\b/;

/**
 * App-wide Text. Inter ships one font file per weight, so text without a weight class
 * gets the regular Inter face instead of falling back to the system font.
 */
export function Text({ className, ...props }: TextProps) {
  const classes = className && HAS_WEIGHT.test(className) ? className : `font-normal ${className ?? ""}`;
  return <RNText className={classes} {...props} />;
}
