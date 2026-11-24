import type { LocaleCode } from "../theme/tokens";
import { EN_COPY } from "./en";
import { type VideoCopy, VideoCopySchema } from "./types";

const COPY_REGISTRY: Partial<Record<LocaleCode, VideoCopy>> = {
  en: EN_COPY,
};

export function getCopy(locale: LocaleCode): VideoCopy {
  const selected = COPY_REGISTRY[locale] ?? EN_COPY;
  return VideoCopySchema.parse(selected);
}

export { EN_COPY, VideoCopySchema };
export type { VideoCopy };
