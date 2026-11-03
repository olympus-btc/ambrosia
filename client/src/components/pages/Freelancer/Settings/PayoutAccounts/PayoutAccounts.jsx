"use client";

import { useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { isLightningBackendUnavailable, resolveMutationErrorToast, translateToast } from "@/components/pages/Store/utils/mutationErrorToast";

import { useCurrencies, usePayoutAccounts } from "../../hooks";

import { DeletePayoutAccountModal } from "./DeletePayoutAccountModal";
import { PayoutAccountModal } from "./PayoutAccountModal";
import { PayoutAccountsCard } from "./PayoutAccountsCard";
import { buildPayoutAccountPayload } from "./utils/buildPayoutAccountPayload";

export function PayoutAccounts() {
  const payoutAccountsTranslations = useTranslations("freelancerSettings.payoutAccounts");
  const {
    payoutAccounts,
    loading: payoutAccountsLoading,
    error: payoutAccountsLoadError,
    createPayoutAccount,
    updatePayoutAccount,
    deletePayoutAccount,
  } = usePayoutAccounts({ skipForbiddenRedirect: true });
  const { currencies } = useCurrencies({ skipForbiddenRedirect: true });
  const [isPayoutAccountModalOpen, setIsPayoutAccountModalOpen] = useState(false);
  const [editedPayoutAccount, setEditedPayoutAccount] = useState(null);
  const [payoutAccountPendingDeletion, setPayoutAccountPendingDeletion] = useState(null);

  const savePayoutAccountErrorRules = [
    {
      when: isLightningBackendUnavailable,
      toast: translateToast(payoutAccountsTranslations, "toasts.lightningBackendUnavailableTitle", "toasts.lightningBackendUnavailableDescription", "danger"),
    },
  ];

  const openPayoutAccountModal = (payoutAccount = null) => {
    setEditedPayoutAccount(payoutAccount);
    setIsPayoutAccountModalOpen(true);
  };

  const closePayoutAccountModal = () => {
    setIsPayoutAccountModalOpen(false);
    setEditedPayoutAccount(null);
  };

  const handleSavePayoutAccount = async (payoutAccountForm) => {
    const payoutAccountRequest = buildPayoutAccountPayload(payoutAccountForm);
    try {
      if (payoutAccountForm.id) {
        await updatePayoutAccount(payoutAccountForm.id, payoutAccountRequest);
      } else {
        await createPayoutAccount(payoutAccountRequest);
      }
      closePayoutAccountModal();
      addToast({ title: payoutAccountsTranslations("toasts.saveSuccess"), color: "success" });
    } catch (savePayoutAccountError) {
      addToast(resolveMutationErrorToast(
        savePayoutAccountError,
        savePayoutAccountErrorRules,
        translateToast(payoutAccountsTranslations, "toasts.saveErrorTitle", "toasts.saveErrorDescription", "danger"),
      ));
    }
  };

  const handleConfirmDeletePayoutAccount = async () => {
    try {
      await deletePayoutAccount(payoutAccountPendingDeletion.id);
      addToast({ title: payoutAccountsTranslations("toasts.deleteSuccess"), color: "success" });
    } catch {
      addToast(translateToast(payoutAccountsTranslations, "toasts.deleteErrorTitle", "toasts.deleteErrorDescription", "danger"));
    } finally {
      setPayoutAccountPendingDeletion(null);
    }
  };

  return (
    <>
      <PayoutAccountsCard
        payoutAccounts={payoutAccounts}
        isLoading={payoutAccountsLoading}
        hasLoadError={Boolean(payoutAccountsLoadError)}
        onAdd={() => openPayoutAccountModal()}
        onEdit={openPayoutAccountModal}
        onDelete={setPayoutAccountPendingDeletion}
      />
      <PayoutAccountModal
        payoutAccount={editedPayoutAccount}
        currencies={currencies}
        isOpen={isPayoutAccountModalOpen}
        onClose={closePayoutAccountModal}
        onSave={handleSavePayoutAccount}
      />
      <DeletePayoutAccountModal
        isOpen={Boolean(payoutAccountPendingDeletion)}
        onClose={() => setPayoutAccountPendingDeletion(null)}
        onConfirm={handleConfirmDeletePayoutAccount}
      />
    </>
  );
}
