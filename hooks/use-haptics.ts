"use client";

import { useWebHaptics } from "web-haptics/react";

export function useHaptics() {
  const { trigger, isSupported } = useWebHaptics();

  return {
    /** Subtle tap — sending a message, minor interaction */
    light: () => trigger("light"),
    /** Button press, card snap */
    medium: () => trigger("medium"),
    /** Major state change */
    heavy: () => trigger("heavy"),
    /** Picker scroll, selecting an item */
    selection: () => trigger("selection"),
    /** Task completed — message received, save confirmed */
    success: () => trigger("success"),
    /** Destructive action ahead */
    warning: () => trigger("warning"),
    /** Validation failure, network error */
    error: () => trigger("error"),
    /** Whether the device supports haptics */
    isSupported,
  };
}
