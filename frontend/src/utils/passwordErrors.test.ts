import { describe, expect, it } from "vitest";
import { passwordErrorsToAr } from "./passwordErrors";
describe("pw", () => {
  it("ar", () => {
    expect(passwordErrorsToAr(["This password is too common."])).toContain("شائعة");
    expect(passwordErrorsToAr({new_password:["This password is entirely numeric."]})).toContain("أرقاماً");
    expect(passwordErrorsToAr(["كلمة المرور شائعة جداً — اختر كلمة أقوى."])).toContain("شائعة");
  });
});
