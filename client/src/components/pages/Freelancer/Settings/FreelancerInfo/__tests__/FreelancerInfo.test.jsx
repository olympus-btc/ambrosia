import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as useUploadHook from "@components/hooks/useUpload";
import * as configurationsProvider from "@providers/configurations/configurationsProvider";

import { FreelancerInfo } from "../FreelancerInfo";

jest.mock("@/hooks/usePermission");

jest.mock("@heroui/react", () => ({
  ...jest.requireActual("@heroui/react"),
  addToast: jest.fn(),
}));

const { addToast } = jest.requireMock("@heroui/react");

const mockUpdateConfig = jest.fn();
const mockUpload = jest.fn();

const aliceConfig = {
  businessName: "Alice Studio",
  businessType: "freelance",
  businessProfession: "Graphic Designer",
  timezone: "America/Mexico_City",
  businessLogoUrl: null,
};

const originalError = console.error;

beforeEach(() => {
  console.error = (...args) => {
    const message = typeof args[0] === "string" ? args[0] : String(args[0]);
    if (message.includes("onAnimationComplete") || message.includes("Unknown event handler property")) return;
    originalError.call(console, ...args);
  };
  jest.clearAllMocks();
  jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
    config: aliceConfig,
    isLoading: false,
    updateConfig: mockUpdateConfig,
  });
  jest.spyOn(useUploadHook, "useUpload").mockReturnValue({ upload: mockUpload });
});

afterEach(() => {
  console.error = originalError;
  jest.restoreAllMocks();
});

async function openEditor() {
  const user = userEvent.setup();
  await act(async () => { render(<FreelancerInfo />); });
  await user.click(screen.getByText("cardInfo.edit"));
  await waitFor(() => expect(screen.getByText("infoModal.title")).toBeInTheDocument());
  return user;
}

describe("FreelancerInfo", () => {
  it("renders nothing while the configuration is not loaded", async () => {
    configurationsProvider.useConfigurations.mockReturnValue({ config: null, updateConfig: mockUpdateConfig });
    const { container } = render(<FreelancerInfo />);

    expect(container).toBeEmptyDOMElement();
  });

  it("saves the edited occupation and closes the editor", async () => {
    mockUpdateConfig.mockResolvedValue({});
    const user = await openEditor();

    const professionInput = screen.getByLabelText("infoModal.profession");
    await user.clear(professionInput);
    await user.type(professionInput, "Illustrator");
    await user.click(screen.getByText("infoModal.saveButton"));

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({
        businessName: "Alice Studio",
        businessProfession: "Illustrator",
      }));
    });
    await waitFor(() => expect(screen.queryByText("infoModal.title")).not.toBeInTheDocument());
    expect(addToast).toHaveBeenCalledWith({ title: "infoModal.updateSuccess", color: "success" });
  });

  it("shows an error toast and keeps the editor open when saving fails", async () => {
    mockUpdateConfig.mockRejectedValue(new Error("Server down"));
    const user = await openEditor();

    await user.click(screen.getByText("infoModal.saveButton"));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith({ title: "infoModal.errorTitle", description: "Server down", color: "danger" });
    });
    expect(screen.getByText("infoModal.title")).toBeInTheDocument();
  });

  it("closes the editor without saving when cancel is pressed", async () => {
    const user = await openEditor();

    await user.click(screen.getByText("infoModal.cancelButton"));

    await waitFor(() => expect(screen.queryByText("infoModal.title")).not.toBeInTheDocument());
    expect(mockUpdateConfig).not.toHaveBeenCalled();
  });
});
