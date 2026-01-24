import { act, useEffect } from "react";
import * as React from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { apiClient } from "@/services/apiClient";

import { useOrders } from "../useOrders";

let mockLastSetOrdersResult = null;
let mockStateCall = 0;

jest.mock("react", () => {
  const actual = jest.requireActual("react");
  return {
    ...actual,
    useState: (initial) => {
      mockStateCall += 1;
      if (mockStateCall === 1) {
        const setOrdersMock = (updater) => {
          if (typeof updater === "function") {
            mockLastSetOrdersResult = updater(null);
          } else {
            mockLastSetOrdersResult = updater;
          }
        };
        return [null, setOrdersMock];
      }
      return [initial, () => {}];
    },
    __resetStateCall: () => {
      mockStateCall = 0;
    },
  };
});

jest.mock("@/services/apiClient", () => ({
  apiClient: jest.fn(),
}));

const handlers = {};

function TestComponent() {
  const { createOrder, updateOrder } = useOrders();

  useEffect(() => {
    handlers.createOrder = createOrder;
    handlers.updateOrder = updateOrder;
  }, [createOrder, updateOrder]);

  return <div data-testid="ready">ok</div>;
}

describe("useOrders with non-array previous state", () => {
  beforeEach(() => {
    React.__resetStateCall();
    mockLastSetOrdersResult = null;
    jest.clearAllMocks();
  });

  it("uses fallback array when createOrder runs with non-array previous state", async () => {
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce({ id: 5, status: "new" });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("ok"));

    await act(async () => {
      await handlers.createOrder({ note: "test" });
    });

    expect(mockLastSetOrdersResult).toEqual([{ id: 5, status: "new" }]);
  });

  it("uses fallback array when updateOrder runs with non-array previous state", async () => {
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce({ id: 3, status: "paid" });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("ok"));

    await act(async () => {
      await handlers.updateOrder(3, { status: "paid" });
    });

    expect(mockLastSetOrdersResult).toEqual([{ id: 3, status: "paid" }]);
  });
});
