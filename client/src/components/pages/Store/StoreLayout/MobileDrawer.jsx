"use client";

import { Drawer, DrawerBody, DrawerContent } from "@heroui/react";

import { SidebarContent } from "./Sidebar";

export function MobileDrawer({ isOpen, onClose, sidebarProps }) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      placement="left"
      backdrop="blur"
      classNames={{
        base: "bg-primary-500 max-w-64 rounded-none",
        backdrop: "backdrop-blur-xs bg-white/10",
        closeButton: "text-slate-100 hover:bg-green-300 hover:text-green-800",
      }}
    >
      <DrawerContent>
        <DrawerBody className="p-0 flex flex-col">
          <SidebarContent {...sidebarProps} onNavClick={onClose} />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
