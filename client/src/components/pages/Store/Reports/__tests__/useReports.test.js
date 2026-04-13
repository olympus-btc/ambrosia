import { act, renderHook } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useReports } from "../hooks/useReports";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

describe("useReports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValue({ totalRevenueCents: 0, totalItemsSold: 0, sales: [] });
  });

  // ─── estado inicial ────────────────────────────────────────────────────────

  it("expone reportData=null, loading=false, error=null al montar", () => {
    const { result } = renderHook(() => useReports());

    expect(result.current.reportData).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("expone fetchReport como función", () => {
    const { result } = renderHook(() => useReports());

    expect(typeof result.current.fetchReport).toBe("function");
  });

  // ─── estados de loading ────────────────────────────────────────────────────

  it("loading=true durante el fetch y false al terminar", async () => {
    let resolveHttp;
    httpClient.mockReturnValueOnce(new Promise((r) => { resolveHttp = r; }));
    parseJsonResponse.mockResolvedValue({ totalRevenueCents: 0, totalItemsSold: 0, sales: [] });

    const { result } = renderHook(() => useReports());

    act(() => {
      result.current.fetchReport({ period: "month" });
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveHttp({});
    });

    expect(result.current.loading).toBe(false);
  });

  // ─── estado de error ───────────────────────────────────────────────────────

  it("error se rellena cuando fetchReport lanza excepción", async () => {
    const networkError = new Error("Network error");
    httpClient.mockRejectedValueOnce(networkError);

    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({ period: "month" }).catch(() => {});
    });

    expect(result.current.error).toBe(networkError);
    expect(result.current.loading).toBe(false);
  });

  it("error se limpia al iniciar un nuevo fetch exitoso", async () => {
    httpClient.mockRejectedValueOnce(new Error("fail"));
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({ period: "month" }).catch(() => {});
    });
    expect(result.current.error).not.toBeNull();

    httpClient.mockResolvedValueOnce({});
    await act(async () => {
      await result.current.fetchReport({ period: "week" });
    });
    expect(result.current.error).toBeNull();
  });

  it("fetchReport relanza el error para que el caller lo maneje", async () => {
    httpClient.mockRejectedValueOnce(new Error("fail"));
    const { result } = renderHook(() => useReports());

    await expect(
      act(async () => result.current.fetchReport({ period: "month" })),
    ).rejects.toThrow("fail");
  });

  // ─── estado de reportData ──────────────────────────────────────────────────

  it("reportData se rellena con la respuesta del servidor tras fetch exitoso", async () => {
    const mockReport = { totalRevenueCents: 5000, totalItemsSold: 3, sales: [] };
    parseJsonResponse.mockResolvedValueOnce(mockReport);

    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({ period: "month" });
    });

    expect(result.current.reportData).toEqual(mockReport);
  });

  it("fetchReport devuelve el mismo valor que almacena en reportData", async () => {
    const mockReport = { totalRevenueCents: 5000, totalItemsSold: 3, sales: [] };
    parseJsonResponse.mockResolvedValueOnce(mockReport);

    const { result } = renderHook(() => useReports());
    let returned;

    await act(async () => {
      returned = await result.current.fetchReport({ period: "month" });
    });

    expect(returned).toEqual(mockReport);
    expect(result.current.reportData).toEqual(mockReport);
  });

  // ─── construcción de URL ──────────────────────────────────────────────────

  it("fetchReport con period envía ?period=month", async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({ period: "month" });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports?period=month");
  });

  it("fetchReport con period=week envía ?period=week", async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({ period: "week" });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports?period=week");
  });

  it("fetchReport con period=year envía ?period=year", async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({ period: "year" });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports?period=year");
  });

  it("fetchReport con startDate y endDate incluye ambos en la URL", async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({ startDate: "2024-01-01", endDate: "2024-01-31" });
    });

    const url = httpClient.mock.calls[0][0];
    expect(url).toContain("startDate=2024-01-01");
    expect(url).toContain("endDate=2024-01-31");
  });

  it("fetchReport con productName lo incluye en la URL", async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({ productName: "Widget" });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports?productName=Widget");
  });

  it("fetchReport con productName con espacios lo trimea", async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({ productName: "  Widget  " });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports?productName=Widget");
  });

  it("fetchReport con paymentMethod lo incluye en la URL", async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({ paymentMethod: "Cash" });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports?paymentMethod=Cash");
  });

  it("fetchReport con paymentMethod con espacios lo trimea", async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({ paymentMethod: "  BTC  " });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports?paymentMethod=BTC");
  });

  it("fetchReport sin parámetros llama /reports sin query string", async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({});
    });

    expect(httpClient).toHaveBeenCalledWith("/reports");
  });

  it("fetchReport sin argumentos llama /reports sin query string", async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport();
    });

    expect(httpClient).toHaveBeenCalledWith("/reports");
  });

  it("fetchReport con productName vacío no lo incluye en la URL", async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({ productName: "   " });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports");
  });

  it("fetchReport con paymentMethod vacío no lo incluye en la URL", async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({ paymentMethod: "" });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports");
  });

  it("fetchReport con múltiples filtros construye la URL correctamente", async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({
        period: "month",
        productName: "Widget",
        paymentMethod: "Cash",
      });
    });

    const url = httpClient.mock.calls[0][0];
    expect(url).toContain("period=month");
    expect(url).toContain("productName=Widget");
    expect(url).toContain("paymentMethod=Cash");
  });

  /**
   * BRECHA DOCUMENTADA: El hook no soporta filtrado por userId.
   * El servidor acepta ?userId=... pero el cliente nunca lo envía.
   * Si se necesita filtrar por usuario, hay que añadirlo a useReports.js.
   */
  it("BRECHA: fetchReport no envía userId aunque el servidor lo soporte", async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      await result.current.fetchReport({ period: "month" });
    });

    const url = httpClient.mock.calls[0][0];
    expect(url).not.toContain("userId");
  });
});
