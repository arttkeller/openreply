import { describe, expect, it } from "vitest";
import {
  dropFirstName,
  firstNameFrom,
  renderMessageWithoutLink,
} from "@/lib/tracking/message";

describe("{first_name}", () => {
  it("takes a plain first name from the Instagram profile name", () => {
    expect(firstNameFrom("ANA paula 🏡")).toBe("Ana");
    expect(firstNameFrom("joão Silva")).toBe("João");
    expect(firstNameFrom("McKenzie")).toBe("McKenzie");
    expect(firstNameFrom("🏡 Imóveis")).toBeNull();
    expect(firstNameFrom("@corretor")).toBeNull();
    expect(firstNameFrom("")).toBeNull();
    expect(firstNameFrom(null)).toBeNull();
  });

  it("drops an unfilled token without leaving a stray comma", () => {
    expect(dropFirstName("Aqui está o seu link, {first_name}!")).toBe("Aqui está o seu link!");
    expect(dropFirstName("{first_name}, olha o link")).toBe("olha o link");
    expect(dropFirstName("Oi {first_name}! Tudo bem?")).toBe("Oi! Tudo bem?");
    expect(renderMessageWithoutLink({ message: "Valeu, {first_name}! {link}" })).toBe("Valeu!");
  });
});
