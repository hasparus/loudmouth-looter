/** @jsxImportSource react */
import { useState } from "react";

export function JsxSmokeTest() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      react island clicks: {count}
    </button>
  );
}
