import { render, screen, act } from "@testing-library/react";

import { SwipeableCartItem } from "../SwipeableCartItem";

jest.mock("framer-motion", () => {
  const React = require("react");
  const MockMotionDiv = ({ children, onDragEnd, style, drag, dragConstraints, dragElastic, ...rest }) => {
    if (onDragEnd) global.__swipeableOnDragEnd = onDragEnd;
    return React.createElement("div", rest, children);
  };
  return {
    motion: { div: MockMotionDiv },
    useMotionValue: (initial) => ({ get: () => initial, set: jest.fn() }),
    useTransform: () => ({ get: () => 0 }),
    animate: jest.fn(() => Promise.resolve()),
  };
});

afterEach(() => {
  global.__swipeableOnDragEnd = null;
  jest.clearAllMocks();
});

describe("SwipeableCartItem", () => {
  describe("non-touch device", () => {
    it("renders children directly without a wrapper", () => {
      render(
        <SwipeableCartItem onRemove={jest.fn()} isTouchDevice={false}>
          <div data-testid="child-content" />
        </SwipeableCartItem>,
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.queryByTestId("trash-icon")).not.toBeInTheDocument();
    });
  });

  describe("touch device", () => {
    it("renders children inside the swipeable wrapper", () => {
      render(
        <SwipeableCartItem onRemove={jest.fn()} isTouchDevice>
          <div data-testid="child-content" />
        </SwipeableCartItem>,
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });

    it("renders the delete label in the swipe background", () => {
      render(
        <SwipeableCartItem onRemove={jest.fn()} isTouchDevice>
          <div />
        </SwipeableCartItem>,
      );

      expect(screen.getByText("summary.swipeDelete")).toBeInTheDocument();
    });

    it("calls onRemove when drag exceeds the delete threshold", async () => {
      const onRemove = jest.fn();
      render(
        <SwipeableCartItem onRemove={onRemove} isTouchDevice>
          <div />
        </SwipeableCartItem>,
      );

      await act(async () => {
        await global.__swipeableOnDragEnd({}, { offset: { x: -150, y: 0 } });
      });

      expect(onRemove).toHaveBeenCalled();
    });

    it("does not call onRemove when drag is within the threshold", async () => {
      const onRemove = jest.fn();
      render(
        <SwipeableCartItem onRemove={onRemove} isTouchDevice>
          <div />
        </SwipeableCartItem>,
      );

      await act(async () => {
        await global.__swipeableOnDragEnd({}, { offset: { x: -50, y: 0 } });
      });

      expect(onRemove).not.toHaveBeenCalled();
    });
  });
});
