"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { addToast, Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/hooks/auth/useAuth";
import { getUsers } from "@/modules/auth/authService";
import { useConfigurations } from "@/providers/configurations/configurationsProvider";

import { BusinessHeader } from "./BusinessHeader";
import { EmployeeSelect } from "./EmployeeSelect";
import { PinPad } from "./PinPad";

const PIN_LENGTH = 4;

export default function PinLogin() {
  const t = useTranslations("pinLogin");
  const [pin, setPin] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [lockedUntil, setLockedUntil] = useState(() => {
    const stored = localStorage.getItem("pinLockoutUntil");
    if (!stored) return null;
    const ts = parseInt(stored, 10);
    return ts > Date.now() ? ts : null;
  });
  const [employees, setEmployees] = useState([]);
  const router = useRouter();
  const { login, isAuth, isLoading: isAuthLoading } = useAuth();
  const { config } = useConfigurations();

  useEffect(() => {
    if (!isAuthLoading && isAuth) {
      router.replace("/");
    }
  }, [isAuth, isAuthLoading, router]);

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const users = await getUsers({ silentAuth: true });
        setEmployees(
          users.map((user) => ({
            ...user,
            avatar: user.name.slice(0, 2),
          })),
        );
      } catch {}
    }
    fetchEmployees();
  }, []);

  const handleNumberClick = (number) => {
    if (pin.length < PIN_LENGTH) {
      setPin((prev) => prev + number);
      setError("");
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  const handleClear = () => {
    setPin("");
    setError("");
  };

  const handleLogin = async () => {
    if (lockedUntil && Date.now() < lockedUntil) return;

    if (!selectedUser) {
      setError(t("errorMessages.selectEmployee"));
      return;
    }

    if (pin.length < PIN_LENGTH) {
      setError(t("errorMessages.enterPin"));
      return;
    }

    setIsLoading(true);
    setError("");

    const employee = employees.find((emp) => emp.id === selectedUser);

    try {
      await login({ name: employee.name, pin });
      addToast({
        title: t("successMessages.toastTitle"),
        description: `${t("successMessages.firstMessage")} ${employee.name} ${t("successMessages.secondMessage")} ${employee.role}.`,
        color: "success",
      });
      setPin("");
      setSelectedUser("");
      setLockedUntil(null);
      localStorage.removeItem("pinLockoutUntil");
      router.push("/");
    } catch (err) {
      if (err?.status === 429) {
        const ts = Date.now() + (err.retryAfter ?? 180) * 1000;
        setLockedUntil(ts);
        localStorage.setItem("pinLockoutUntil", ts.toString());
        setError("");
      } else {
        setError(t("errorMessages.incorrectPin"));
      }
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-lg shadow-lg mx-auto my-auto">
        <CardHeader className="text-center space-y-3 pb-4 flex flex-col items-center justify-center">
          <BusinessHeader
            businessName={config?.businessName}
            businessLogoUrl={config?.businessLogoUrl}
          />
        </CardHeader>

        <CardBody className="space-y-4 px-6 pb-6">
          <EmployeeSelect
            employees={employees}
            selectedUser={selectedUser}
            onSelect={setSelectedUser}
          />
          <PinPad
            pin={pin}
            error={error}
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
    </div>
  );
}
