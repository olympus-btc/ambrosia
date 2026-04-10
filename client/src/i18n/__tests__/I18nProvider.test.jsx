import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider, LanguageSwitcher, useI18n } from "../I18nProvider";

function LocaleDisplay() {
  const { locale } = useI18n();
  return <span data-testid="locale">{locale}</span>;
}

function ChangeLocaleButton({ newLocale }) {
  const { changeLocale } = useI18n();
  return <button onClick={() => changeLocale(newLocale)}>change</button>;
}

function renderWithProvider(ui) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

beforeEach(() => {
  localStorage.clear();
});

describe("I18nProvider", () => {
  it("defaults to English when no locale is stored", () => {
    renderWithProvider(<LocaleDisplay />);
    expect(screen.getByTestId("locale")).toHaveTextContent("en");
  });

  it("restores locale from localStorage", () => {
    localStorage.setItem("locale", "es");
    renderWithProvider(<LocaleDisplay />);
    expect(screen.getByTestId("locale")).toHaveTextContent("es");
  });

  it("falls back to English for an unsupported locale in localStorage", () => {
    localStorage.setItem("locale", "fr");
    renderWithProvider(<LocaleDisplay />);
    expect(screen.getByTestId("locale")).toHaveTextContent("en");
  });

  it("changeLocale updates locale and persists to localStorage", async () => {
    renderWithProvider(
      <>
        <LocaleDisplay />
        <ChangeLocaleButton newLocale="es" />
      </>,
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("en");

    await act(async () => {
      screen.getByText("change").click();
    });

    expect(screen.getByTestId("locale")).toHaveTextContent("es");
    expect(localStorage.getItem("locale")).toBe("es");
  });

  it("changeLocale ignores unsupported locales", async () => {
    renderWithProvider(
      <>
        <LocaleDisplay />
        <ChangeLocaleButton newLocale="fr" />
      </>,
    );

    await act(async () => {
      screen.getByText("change").click();
    });

    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(localStorage.getItem("locale")).toBeNull();
  });
});

describe("LanguageSwitcher", () => {
  it("renders 'Cambiar a Español' when locale is English", () => {
    renderWithProvider(<LanguageSwitcher />);
    expect(screen.getByText("Cambiar a Español")).toBeInTheDocument();
  });

  it("switches to Spanish when clicked", async () => {
    const user = userEvent.setup();
    renderWithProvider(<LanguageSwitcher />);

    await user.click(screen.getByText("Cambiar a Español"));

    await waitFor(() => {
      expect(screen.getByText("Switch to English")).toBeInTheDocument();
    });
    expect(localStorage.getItem("locale")).toBe("es");
  });

  it("switches back to English when clicked again", async () => {
    const user = userEvent.setup();
    renderWithProvider(<LanguageSwitcher />);

    await user.click(screen.getByText("Cambiar a Español"));
    await waitFor(() => screen.getByText("Switch to English"));

    await user.click(screen.getByText("Switch to English"));
    await waitFor(() => {
      expect(screen.getByText("Cambiar a Español")).toBeInTheDocument();
    });
    expect(localStorage.getItem("locale")).toBe("en");
  });

  describe("compact mode", () => {
    it("renders abbreviated text in compact mode", () => {
      renderWithProvider(<LanguageSwitcher compact />);
      expect(screen.getByText("ES")).toBeInTheDocument();
      expect(screen.getByText("Cambiar a Español")).toBeInTheDocument();
    });

    it("renders full text in compact mode after switching to Spanish", async () => {
      const user = userEvent.setup();
      renderWithProvider(<LanguageSwitcher compact />);

      await user.click(screen.getByText("Cambiar a Español").closest("button"));

      await waitFor(() => {
        expect(screen.getByText("EN")).toBeInTheDocument();
        expect(screen.getByText("Switch to English")).toBeInTheDocument();
      });
    });

    it("does not render abbreviated spans in default (non-compact) mode", () => {
      renderWithProvider(<LanguageSwitcher />);
      expect(screen.queryByText("ES")).not.toBeInTheDocument();
      expect(screen.queryByText("EN")).not.toBeInTheDocument();
    });
  });
});
