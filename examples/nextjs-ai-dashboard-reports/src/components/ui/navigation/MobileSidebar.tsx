import { siteConfig } from "@/app/siteConfig";
import { Button } from "@/components/Button";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer";
import { cx, focusRing } from "@/lib/utils";

import { BarChartBig, FileText, Menu, Settings2, Table2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Reports", href: siteConfig.baseLinks.reports, icon: BarChartBig },
  {
    name: "Transactions",
    href: siteConfig.baseLinks.transactions,
    icon: Table2,
  },
  {
    name: "Invoices",
    href: siteConfig.baseLinks.invoices,
    icon: FileText,
  },
  {
    name: "Settings",
    href: siteConfig.baseLinks.settings.billing,
    icon: Settings2,
  },
] as const;

export default function MobileSidebar() {
  const pathname = usePathname();
  const isActive = (itemHref: string) => {
    if (itemHref === siteConfig.baseLinks.settings.billing) {
      return pathname.startsWith("/settings");
    }
    return pathname === itemHref || pathname.startsWith(itemHref);
  };
  return (
    <>
      <Drawer>
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            aria-label="open sidebar"
            className="group flex items-center rounded-md p-1.5 text-sm font-medium hover:bg-neutral-50 data-[state=open]:bg-neutral-100 data-[state=open]:bg-neutral-400/10 dark:hover:bg-neutral-400/10"
          >
            <Menu
              className="size-6 shrink-0 text-neutral-600 dark:text-neutral-400"
              aria-hidden="true"
            />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="sm:max-w-lg">
          <DrawerHeader>
            <DrawerTitle>Acme Corp.</DrawerTitle>
          </DrawerHeader>
          <DrawerBody>
            <nav
              aria-label="core mobile navigation links"
              className="flex flex-1 flex-col space-y-10"
            >
              <div>
                <span
                  className={cx(
                    "block h-6 text-xs leading-6 font-medium text-neutral-500 transition-opacity dark:text-neutral-400"
                  )}
                >
                  Platform
                </span>
                <ul role="list" className="mt-1 space-y-1.5">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <DrawerClose asChild>
                        <Link
                          href={item.href}
                          className={cx(
                            isActive(item.href)
                              ? "text-black dark:text-white"
                              : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50",
                            "flex items-center gap-x-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition hover:bg-neutral-50 sm:text-sm dark:hover:bg-neutral-900",
                            focusRing
                          )}
                        >
                          <item.icon
                            className="size-4 shrink-0 opacity-70"
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </DrawerClose>
                    </li>
                  ))}
                </ul>
              </div>
              {/* <div>
                <span
                  className={cx(
                    "block h-6 text-xs leading-6 font-medium text-neutral-500 transition-opacity dark:text-neutral-400",
                  )}
                >
                  Setup
                </span>
                <ul role="list" className="mt-1 space-y-1.5">
                  <li>
                    <Link
                      href="/onboarding/products"
                      className={cx(
                        isActive("/onboarding")
                          ? "text-black dark:text-white"
                          : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50",
                        "flex items-center gap-x-2.5 rounded-md px-2 py-1.5 text-base font-medium transition hover:bg-neutral-50 sm:text-sm dark:hover:bg-neutral-900",
                        focusRing,
                      )}
                    >
                      <Compass
                        className="size-4 shrink-0 opacity-70"
                        aria-hidden="true"
                      />
                      Onboarding
                    </Link>
                  </li>
                </ul>
              </div> */}
            </nav>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
