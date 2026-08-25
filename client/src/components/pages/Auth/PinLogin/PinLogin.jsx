"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { addToast, Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/hooks/auth/useAuth";
import { useConfigurations } from "@/providers/configurations/configurationsProvider";
import { getPublicUsers } from "@/services/authService";

import { BusinessHeader } from "./BusinessHeader";
import { EmployeeSelect } from "./EmployeeSelect";
import { PinDeprecationModal } from "./PinDeprecationModal";
import { PinPad } from "./PinPad";

const PIN_MAX_LENGTH = 6;
const PIN_MIN_LENGTH = 4;

export default function PinLogin() {
  const pinLoginTranslations = useTranslations("pinLogin");
  const [pin, setPin] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState("");
  const [lockedUntil, setLockedUntil] = useState(null);
  const [showPinDeprecationModal, setShowPinDeprecationModal] = useState(false);
  const isPinDeprecationPendingRef = useRef(false);

  useEffect(() => {
    const storedLockoutUntil = localStorage.getItem("pinLockoutUntil");
    if (!storedLockoutUntil) return;
    const lockoutUntilTimestamp = parseInt(storedLockoutUntil, 10);
    if (lockoutUntilTimestamp > Date.now()) setLockedUntil(lockoutUntilTimestamp);
  }, []);
  const [employees, setEmployees] = useState([]);
  const router = useRouter();
  const { login, isAuth, isLoading: isAuthLoading } = useAuth();
  const { config, businessType } = useConfigurations();

  useEffect(() => {
    if (isPinDeprecationPendingRef.current || showPinDeprecationModal) return;
    if (!isAuthLoading && isAuth) {
      router.replace("/");
    }
  }, [isAuth, isAuthLoading, showPinDeprecationModal, router]);

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const publicUsers = await getPublicUsers();
        setEmployees(
          publicUsers.map((user) => ({
            ...user,
            avatar: user.name.slice(0, 2),
          })),
        );
      } catch {
        addToast({
          title: pinLoginTranslations("errorMessages.loadEmployeesTitle"),
          description: pinLoginTranslations("errorMessages.loadEmployeesDescription"),
          color: "danger",
        });
      }
    }
    fetchEmployees();
  }, [pinLoginTranslations]);

  const handleNumberClick = (number) => {
    if (pin.length < PIN_MAX_LENGTH) {
      setPin((prev) => prev + number);
      setLoginErrorMessage("");
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setLoginErrorMessage("");
  };

  const handleClear = () => {
    setPin("");
    setLoginErrorMessage("");
  };

  const handleLogin = async () => {
    if (lockedUntil && Date.now() < lockedUntil) return;

    if (!selectedUser) {
      setLoginErrorMessage(pinLoginTranslations("errorMessages.selectEmployee"));
      return;
    }

    if (pin.length < PIN_MIN_LENGTH) {
      setLoginErrorMessage(pinLoginTranslations("errorMessages.enterPin"));
      return;
    }

    setIsLoading(true);
    setLoginErrorMessage("");

    const employee = employees.find((currentEmployee) => currentEmployee.id === selectedUser);
    const isPinDeprecated = pin.length < PIN_MAX_LENGTH;
    isPinDeprecationPendingRef.current = isPinDeprecated;

    try {
      await login({ name: employee.name, pin });
      addToast({
        title: pinLoginTranslations("successMessages.toastTitle"),
        description: `${pinLoginTranslations("successMessages.firstMessage")} ${employee.name} ${pinLoginTranslations("successMessages.secondMessage")} ${employee.role}.`,
        color: "success",
      });
      setPin("");
      setSelectedUser("");
      setLockedUntil(null);
      localStorage.removeItem("pinLockoutUntil");
      if (isPinDeprecated) {
        setShowPinDeprecationModal(true);
      } else {
        router.push("/");
      }
    } catch (loginError) {
      isPinDeprecationPendingRef.current = false;
      if (loginError?.status === 429) {
        const lockoutUntilTimestamp = Date.now() + (loginError.retryAfter ?? 180) * 1000;
        setLockedUntil(lockoutUntilTimestamp);
        localStorage.setItem("pinLockoutUntil", lockoutUntilTimestamp.toString());
        setLoginErrorMessage("");
      } else if (loginError?.message === "No assigned role for this user, contact Admin") {
        setLoginErrorMessage(loginError.message);
      } else {
        setLoginErrorMessage(pinLoginTranslations("errorMessages.incorrectPin"));
      }
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToUsers = () => {
    isPinDeprecationPendingRef.current = false;
    setShowPinDeprecationModal(false);
    router.push(businessType ? `/${businessType}/users` : "/");
  };

  const handleDeprecationLater = () => {
    isPinDeprecationPendingRef.current = false;
    setShowPinDeprecationModal(false);
    router.push("/");
  };

  return (
    <div className="min-h-screen gradient-fresh flex items-center justify-center p-4 overflow-x-hidden">
      <Card className="w-full max-w-md rounded-lg shadow-lg mx-auto my-auto">
        <CardHeader className="text-center space-y-3 pb-4 flex flex-col items-center justify-center">
          <BusinessHeader
            businessName={config?.businessName}
            businessLogoUrl={config?.businessLogoUrl}
          />
        </CardHeader>

        <CardBody className="space-y-4 px-3 sm:px-6 pb-6">
          <EmployeeSelect
            employees={employees}
            selectedUser={selectedUser}
            onSelect={setSelectedUser}
          />
          <PinPad
            pin={pin}
            error={loginErrorMessage}
            isLoading={isLoading}
            lockedUntil={lockedUntil}
            onNumberClick={handleNumberClick}
            onDelete={handleDelete}
            onClear={handleClear}
            onLogin={handleLogin}
            onLockoutExpired={() => {
              setLockedUntil(null);
              localStorage.removeItem("pinLockoutUntil");
            }}
          />
        </CardBody>
      </Card>

      <PinDeprecationModal
        isOpen={showPinDeprecationModal}
        onGoToUsers={handleGoToUsers}
        onLater={handleDeprecationLater}
      />
    </div>
  );
}
