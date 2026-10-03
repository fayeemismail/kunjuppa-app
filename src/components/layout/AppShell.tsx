'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthGuard } from './AuthGuard';
import { PrinterConfigModal } from '@/components/receipt/PrinterConfigModal';
import { MobileNav } from './MobileNav';
import { X } from 'lucide-react';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [printerModalOpen, setPrinterModalOpen] = useState(false);

  // If on login page, don't show the dashboard shell layout
  const isLoginPage = pathname === '/login';

  return (
    <ToastProvider>
      <AuthGuard>
        {isLoginPage ? (
          <main className="min-h-screen">{children}</main>
        ) : (
          <div className="flex h-screen overflow-hidden bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex md:shrink-0">
              <Sidebar />
            </div>

            {/* Mobile Drawer Backdrop */}
            {mobileMenuOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div
                  className="fixed inset-y-0 left-0 w-64 z-50 animate-in slide-in-from-left duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <Header
                onOpenMobileMenu={() => setMobileMenuOpen(true)}
                onOpenPrinterModal={() => setPrinterModalOpen(true)}
              />

              <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
                {children}
              </main>

              {/* Mobile Bottom Navigation */}
              <MobileNav />
            </div>

            {/* Global Quick Printer Hardware Modal */}
            <PrinterConfigModal
              isOpen={printerModalOpen}
              onClose={() => setPrinterModalOpen(false)}
            />
          </div>
        )}
      </AuthGuard>
    </ToastProvider>
  );
};
