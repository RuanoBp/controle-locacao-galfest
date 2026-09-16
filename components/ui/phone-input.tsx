"use client";

import { useState } from "react";
import { Input } from "@/components/ui/field";
import { formatarTelefone } from "@/lib/utils";

export function PhoneInput({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(formatarTelefone(defaultValue ?? ""));

  return (
    <Input
      id={id}
      name={name}
      inputMode="tel"
      placeholder="(11) 91234-5678"
      value={value}
      onChange={(e) => setValue(formatarTelefone(e.target.value))}
    />
  );
}
