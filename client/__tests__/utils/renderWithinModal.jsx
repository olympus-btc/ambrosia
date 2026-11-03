import { Modal, ModalContent } from "@heroui/react";
import { render } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

export function renderWithinModal(children) {
  return render(
    <I18nProvider>
      <Modal isOpen>
        <ModalContent>{children}</ModalContent>
      </Modal>
    </I18nProvider>,
  );
}
