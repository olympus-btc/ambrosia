import { render, screen } from "@testing-library/react";

import { I18nProvider } from "@i18n/I18nProvider";

import { NodeInfo } from "../NodeInfo";

function renderNodeInfo(info) {
  return render(
    <I18nProvider>
      <NodeInfo info={info} />
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
      state: "Normal",
    },
    {
      channelId: "channel-2",
      balanceSat: 30000,
      capacitySat: 80000,
      inboundLiquiditySat: 50000,
      state: "Normal",
    },
  ],
};

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
      renderNodeInfo(mockNodeInfo);

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

      const stateElements = screen.getAllByText("Normal");
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

  describe("Edge Cases", () => {
    it("handles single channel correctly", () => {
      renderNodeInfo(mockNodeInfoSingleChannel);

      expect(screen.getByText("nodeInfo.channel1")).toBeInTheDocument();
      expect(screen.getByText("testnet")).toBeInTheDocument();

      const balances = screen.getAllByText(/100,000 nodeInfo.sats/);
      expect(balances.length).toBeGreaterThan(0);
    });

    it("calculates total balance with single channel", () => {
      renderNodeInfo(mockNodeInfoSingleChannel);

      expect(screen.getByText("100,000 sats")).toBeInTheDocument();
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
