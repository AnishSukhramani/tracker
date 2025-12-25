"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

// Map route paths to display names
const routeNames: Record<string, string> = {
  "/": "Home",
  "/transactions": "Transactions",
  "/dashboard": "Dashboard",
  "/baby-steps": "Baby Steps",
  "/investments": "Investments",
}

function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs = [{ label: "Home", href: "/" }]

  if (segments.length === 0) {
    return breadcrumbs
  }

  let currentPath = ""
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const label = routeNames[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
    breadcrumbs.push({
      label,
      href: currentPath,
    })
  })

  return breadcrumbs
}

export function TopBar() {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-2 sm:px-4">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
          <SidebarTrigger />
          <Breadcrumb>
            <BreadcrumbList className="flex-wrap">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1
                
                return (
                  <React.Fragment key={crumb.href}>
                    <BreadcrumbItem className="hidden sm:flex">
                      {isLast ? (
                        <BreadcrumbPage className="truncate max-w-[120px] sm:max-w-none">{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href} className="truncate max-w-[100px] sm:max-w-none">{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {/* Show only last breadcrumb on mobile */}
                    {isLast && (
                      <BreadcrumbItem className="sm:hidden">
                        <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                      </BreadcrumbItem>
                    )}
                    {!isLast && <BreadcrumbSeparator className="hidden sm:flex" />}
                  </React.Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

