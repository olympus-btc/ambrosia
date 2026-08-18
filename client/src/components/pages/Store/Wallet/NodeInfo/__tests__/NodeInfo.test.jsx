import { render, screen } from "@testing-library/react";

import { I18nProvider } from "@i18n/I18nProvider";

import { NodeInfo } from "../NodeInfo";

function renderNodeInfo(info, props = {}) {
  return render(
    <I18nProvider>
      <NodeInfo info={info} {...props} />
    </I18nProvider>,
  );
}

const mockNodeInfo = {
  nodeId: "test-node-id",
  chain: "mainnet",
  blockHeight: 800000,
  channels: [
    {
      channelId: "channel-1",
      balanceSat: 50000,
      capacitySat: 100000,
      inboundLiquiditySat: 50000,
      state: "NORMAL",
    },
    {
      channelId: "channel-2",
      balanceSat: 30000,
      capacitySat: 80000,
      inboundLiquiditySat: 50000,
      state: "NORMAL",
    },
  ],
};

const mockWalletBalance = { balanceSat: 80000, feeCreditSat: 0 };

const mockNodeInfoSingleChannel = {
  nodeId: "test-node-id-2",
  chain: "testnet",
  blockHeight: 750000,
  channels: [
    {
      channelId: "channel-3",
      balanceSat: 100000,
      capacitySat: 200000,
      inboundLiquiditySat: 100000,
      state: "Offline",
    },
  ],
};

const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("aria-label")
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("onAnimationComplete") ||
       args[0].includes("Unknown event handler property") ||
       args[0].includes("validateDOMNesting"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.restoreAllMocks();
});

describe("NodeInfo Component", () => {
  describe("Rendering", () => {
    it("renders node info title", () => {
      renderNodeInfo(mockNodeInfo);

      expect(screen.getByText("nodeInfo.title")).toBeInTheDocument();
    });

    it("renders channels subtitle", () => {
      renderNodeInfo(mockNodeInfo);

      expect(screen.getByText("nodeInfo.subtitle")).toBeInTheDocument();
    });
  });

  describe("Summary Cards", () => {
    it("displays total balance correctly", () => {
      renderNodeInfo(mockNodeInfo, { balance: mockWalletBalance });

      expect(screen.getByText("80,000 sats")).toBeInTheDocument();
    });

    it("displays network/chain", () => {
      renderNodeInfo(mockNodeInfo);

      expect(screen.getByText("mainnet")).toBeInTheDocument();
    });

    it("displays number of channels", () => {
      renderNodeInfo(mockNodeInfo);

      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("displays block height", () => {
      renderNodeInfo(mockNodeInfo);

      expect(screen.getByText("800000")).toBeInTheDocument();
    });
  });

  describe("NWC Backend", () => {
    const mockNwcNodeInfo = { ...mockNodeInfo, version: "NWC" };

    it("hides the channels card", () => {
      renderNodeInfo(mockNwcNodeInfo);

      expect(screen.queryByText("nodeInfo.channels")).not.toBeInTheDocument();
    });

    it("hides the block height card", () => {
      renderNodeInfo(mockNwcNodeInfo);

      expect(screen.queryByText("nodeInfo.block")).not.toBeInTheDocument();
    });

    it("still shows total balance and network cards", () => {
      renderNodeInfo(mockNwcNodeInfo, { balance: mockWalletBalance });

      expect(screen.getByText("nodeInfo.totalBalance")).toBeInTheDocument();
      expect(screen.getByText("nodeInfo.network")).toBeInTheDocument();
    });

    it("shows the channels and block cards for non-NWC backends", () => {
      renderNodeInfo(mockNodeInfo);

      expect(screen.getByText("nodeInfo.channels")).toBeInTheDocument();
      expect(screen.getByText("nodeInfo.block")).toBeInTheDocument();
    });

    it("shows the lightning address card when lud16 is present", () => {
      renderNodeInfo({ ...mockNwcNodeInfo, lud16: "wallet@example.com" });

      expect(screen.getByText("nodeInfo.lightningAddress")).toBeInTheDocument();
      expect(screen.getByText("wallet@example.com")).toBeInTheDocument();
    });

    it("hides the lightning address card when lud16 is absent", () => {
      renderNodeInfo(mockNwcNodeInfo);

      expect(screen.queryByText("nodeInfo.lightningAddress")).not.toBeInTheDocument();
    });

    it("hides the lightning address card for non-NWC backends even if lud16 is present", () => {
      renderNodeInfo({ ...mockNodeInfo, lud16: "wallet@example.com" });

      expect(screen.queryByText("nodeInfo.lightningAddress")).not.toBeInTheDocument();
    });
  });

  describe("Channel Details", () => {
    it("renders all channels", () => {
      renderNodeInfo(mockNodeInfo);

      expect(screen.getByText("nodeInfo.channel1")).toBeInTheDocument();
      expect(screen.getByText("nodeInfo.channel2")).toBeInTheDocument();
    });

    it("displays channel balance", () => {
      renderNodeInfo(mockNodeInfo);

      const balances = screen.getAllByText(/50,000 nodeInfo.sats/);
      expect(balances.length).toBeGreaterThan(0);

      const balance2 = screen.getAllByText(/30,000 nodeInfo.sats/);
      expect(balance2.length).toBeGreaterThan(0);
    });

    it("displays channel capacity", () => {
      renderNodeInfo(mockNodeInfo);

      expect(screen.getByText("100,000 nodeInfo.sats")).toBeInTheDocument();
      expect(screen.getByText("80,000 nodeInfo.sats")).toBeInTheDocument();
    });

    it("displays channel state", () => {
      renderNodeInfo(mockNodeInfo);

      const stateElements = screen.getAllByText("NORMAL");
      expect(stateElements).toHaveLength(2);
    });

    it("shows green indicator for Normal state", () => {
      const { container } = renderNodeInfo(mockNodeInfo);

      const greenIndicators = container.querySelectorAll(".bg-green-500");
      expect(greenIndicators.length).toBeGreaterThan(0);
    });

    it("shows red indicator for non-Normal state", () => {
      const { container } = renderNodeInfo(mockNodeInfoSingleChannel);

      const redIndicators = container.querySelectorAll(".bg-red-500");
      expect(redIndicators.length).toBeGreaterThan(0);
    });
  });

  describe("Closing States", () => {
    const closingStates = [
      { state: "ShuttingDown", labelKey: "nodeInfo.stateShuttingDown" },
      { state: "Negotiating", labelKey: "nodeInfo.stateNegotiating" },
      { state: "Closing", labelKey: "nodeInfo.stateClosing" },
      { state: "Closed", labelKey: "nodeInfo.stateClosed" },
    ];

    closingStates.forEach(({ state, labelKey }) => {
      it(`shows orange indicator for ${state} state`, () => {
        const info = {
          ...mockNodeInfo,
          channels: [{ ...mockNodeInfo.channels[0], state }],
        };
        const { container } = renderNodeInfo(info);

        const orangeIndicators = container.querySelectorAll(".bg-orange-400");
        expect(orangeIndicators.length).toBeGreaterThan(0);
      });

      it(`shows descriptive label for ${state} state`, () => {
        const info = {
          ...mockNodeInfo,
          channels: [{ ...mockNodeInfo.channels[0], state }],
        };
        renderNodeInfo(info);

        expect(screen.getByText(labelKey)).toBeInTheDocument();
      });
    });

    it("shows red indicator for unknown state", () => {
      const info = {
        ...mockNodeInfo,
        channels: [{ ...mockNodeInfo.channels[0], state: "UnknownState" }],
      };
      const { container } = renderNodeInfo(info);

      const redIndicators = container.querySelectorAll(".bg-red-500");
      expect(redIndicators.length).toBeGreaterThan(0);
    });

    it("shows raw state name for unknown state", () => {
      const info = {
        ...mockNodeInfo,
        channels: [{ ...mockNodeInfo.channels[0], state: "UnknownState" }],
      };
      renderNodeInfo(info);

      expect(screen.getByText("UnknownState")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("hides Lightning Channels section when no channels", () => {
      const emptyInfo = { ...mockNodeInfo, channels: [] };
      renderNodeInfo(emptyInfo);

      expect(screen.queryByText("nodeInfo.subtitle")).not.toBeInTheDocument();
    });

    it("shows empty state message when no channels", () => {
      const emptyInfo = { ...mockNodeInfo, channels: [] };
      renderNodeInfo(emptyInfo);

      expect(screen.getByText("nodeInfo.noChannels")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles single channel correctly", () => {
      renderNodeInfo(mockNodeInfoSingleChannel);

      expect(screen.getByText("nodeInfo.channel1")).toBeInTheDocument();
      expect(screen.getByText("testnet")).toBeInTheDocument();

      const balances = screen.getAllByText(/100,000 nodeInfo.sats/);
      expect(balances.length).toBeGreaterThan(0);
    });

    it("handles empty channels array", () => {
      const emptyInfo = {
        nodeId: "test-node-id",
        chain: "mainnet",
        blockHeight: 800000,
        channels: [],
      };

      renderNodeInfo(emptyInfo);

      expect(screen.getByText("0 sats")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("handles missing channels with default", () => {
      const noChannelsInfo = {
        nodeId: "test-node-id",
        chain: "mainnet",
        blockHeight: 800000,
        channels: [],
      };

      renderNodeInfo(noChannelsInfo);

      expect(screen.getByText("0 sats")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("Total Balance in Local Currency", () => {
    it("does not show a fiat value when no exchange rate is available", () => {
      renderNodeInfo(mockNodeInfo);

      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });

    it("shows the total balance converted to the configured local currency", () => {
      renderNodeInfo(mockNodeInfo, {
        balance: mockWalletBalance,
        currentRate: 45000,
        currencyAcronym: "USD",
        locale: "en-US",
      });

      expect(screen.getByText("$36.00")).toBeInTheDocument();
    });

    it("reflects a different configured currency", () => {
      renderNodeInfo(mockNodeInfo, {
        balance: mockWalletBalance,
        currentRate: 900000,
        currencyAcronym: "MXN",
        locale: "es-MX",
      });

      expect(screen.getByText(/720\.00/)).toBeInTheDocument();
    });
  });

  describe("Channel Count Filtering", () => {
    it("uses the balance prop regardless of what the channels sum to", () => {
      const info = {
        ...mockNodeInfo,
        channels: [
          { channelId: "ch-1", balanceSat: 999999, capacitySat: 999999, inboundLiquiditySat: 999999, state: "NORMAL" },
        ],
      };
      renderNodeInfo(info, { balance: { balanceSat: 12345, feeCreditSat: 0 } });

      expect(screen.getByText("12,345 sats")).toBeInTheDocument();
    });

    it("excludes closing channels from channel count", () => {
      const info = {
        ...mockNodeInfo,
        channels: [
          { channelId: "ch-1", balanceSat: 50000, capacitySat: 100000, inboundLiquiditySat: 50000, state: "NORMAL" },
          { channelId: "ch-2", balanceSat: 30000, capacitySat: 80000, inboundLiquiditySat: 50000, state: "Closing" },
        ],
      };
      renderNodeInfo(info);

      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("shows 0 channel count when all channels are closing", () => {
      const info = {
        ...mockNodeInfo,
        channels: [
          { channelId: "ch-1", balanceSat: 20000, capacitySat: 50000, inboundLiquiditySat: 30000, state: "Closing" },
        ],
      };
      renderNodeInfo(info);

      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("Progress Bar", () => {
    it("renders progress bar for each channel", () => {
      const { container } = renderNodeInfo(mockNodeInfo);

      const progressBars = container.querySelectorAll('[aria-label="Balance Channel"]');
      expect(progressBars).toHaveLength(2);
    });

    it("calculates correct progress percentage", () => {
      const { container } = renderNodeInfo(mockNodeInfo);

      const progressBars = container.querySelectorAll('[aria-label="Balance Channel"]');

      expect(progressBars[0]).toHaveAttribute("aria-valuenow", "50");

      expect(progressBars[1]).toHaveAttribute("aria-valuenow", "37.5");
    });
  });
});
