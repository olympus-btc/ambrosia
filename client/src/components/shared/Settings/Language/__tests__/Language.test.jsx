import { render, screen, act } from "@testing-library/react";

import { I18nProvider } from "@i18n/I18nProvider";

import { Language } from "../Language";

function renderLanguage() {
  return render(
    <I18nProvider>
      <Language />
    </I18nProvider>,
  );
}

describe("Language", () => {
  it("renders the card title", async () => {
    await act(async () => { renderLanguage(); });
    expect(screen.getByText("cardLanguage.title")).toBeInTheDocument();
  });

  it("renders the LanguageSwitcher", async () => {
    await act(async () => { renderLanguage(); });
    expect(screen.getByText(/Switch to English|Cambiar a Español/i)).toBeInTheDocument();
  });
});
