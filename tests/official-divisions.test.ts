import { describe, expect, it } from "vitest";

import {
  getOfficialDivisionCode,
  getOfficialDivisionName,
} from "@/lib/ftc/official-divisions";

describe("official FTC division helpers", () => {
  it("extracts stable names and codes from FIRST Championship child events", () => {
    const event = {
      name: "FIRST Championship - FIRST Tech Challenge - Edison Division",
    };

    expect(getOfficialDivisionCode(event, 0)).toBe("edison");
    expect(getOfficialDivisionName(event, 0)).toBe("Edison Division");
  });

  it("falls back for unexpected event names", () => {
    const event = {
      name: "FIRST Championship - FIRST Tech Challenge",
    };

    expect(getOfficialDivisionCode(event, 2)).toBe("division-c");
    expect(getOfficialDivisionName(event, 2)).toBe("FIRST Championship - FIRST Tech Challenge");
  });
});
