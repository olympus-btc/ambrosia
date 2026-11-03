import { removeAccents } from "../removeAccents";

describe("removeAccents", () => {
  it("removes accents and the tilde from the ñ", () => {
    expect(removeAccents("Método de pago, Salón, Piña, azúcar")).toBe("Metodo de pago, Salon, Pina, azucar");
  });

  it("keeps text without accents unchanged", () => {
    expect(removeAccents("TOTAL 215")).toBe("TOTAL 215");
  });
});
