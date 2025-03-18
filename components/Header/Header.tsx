"use client";

import React, { useState, useEffect, useRef, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaShoppingCart } from "react-icons/fa";
import { CartContext } from "@/contexts/CartContext";
import styles from "./Header.module.css";

// Custom hook to detect mobile view (at or below 991px)
const useIsMobile = (breakpoint = 991) => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const checkWidth = () => setIsMobile(window.innerWidth <= breakpoint);
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, [breakpoint]);
  return isMobile;
};

const Header: React.FC = () => {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const navbarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { cartItems, openSidebarCart } = useContext(CartContext)!;
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Close mobile sidebar if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (navbarRef.current && !navbarRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeOverlays = () => setMobileMenuOpen(false);
  const handleCartClick = () => {
    closeOverlays();
    openSidebarCart();
  };

  // Navigation items list
  const navItems = [
    { href: "/", label: "Home" },
    { href: "/menu", label: "Menu" },
    { href: "/reservation", label: "Reservation" },
    { href: "/catering", label: "Catering" },
    { href: "/events", label: "Events" },
    { href: "https://harambee54.com", label: "Harambee54", external: true },
    { href: "/careers", label: "Careers" },
    { href: "/about", label: "About Us" },
    { href: "/login", label: "Login" },
  ];

  // Desktop Header: logo on left, nav links and cart on right.
  const desktopHeader = (
    <nav className={styles.desktopNavbar} ref={navbarRef}>
      <div className={styles.navbarLogo}>
        <Link href="/" onClick={closeOverlays} className={styles.customLogoLink}>
          <Image
            src="/images/logo.png"
            alt="Logo"
            className={styles.customLogo}
            width={120}
            height={40}
            priority
          />
        </Link>
      </div>
      <ul className={styles.navbarNav}>
        {navItems.map(({ href, label, external }) => (
          <li key={href} className={styles.navItem}>
            {external ? (
              <a
                href={href}
                onClick={closeOverlays}
                className={`${styles.navLink} ${pathname === href ? styles.active : ""}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ) : (
              <Link href={href}>
                <a
                  onClick={closeOverlays}
                  className={`${styles.navLink} ${pathname === href ? styles.active : ""}`}
                >
                  {label}
                </a>
              </Link>
            )}
          </li>
        ))}
        <li className={styles.navItem}>
          <button onClick={handleCartClick} aria-label="Open Cart Sidebar" className={styles.cartButton}>
            <FaShoppingCart style={{ fontSize: "1.2rem" }} />
            {totalItems > 0 && <span className={styles.cartBadge}>{totalItems}</span>}
          </button>
        </li>
      </ul>
    </nav>
  );

  // Mobile Header: logo on left, cart (same style as desktop) and hamburger on the right.
  // The mobile menu opens as a right-side sidebar.
  const mobileHeader = (
    <>
      <nav className={styles.mobileNavbar} ref={navbarRef}>
        <div className={styles.mobileLogo}>
          <Link href="/" onClick={closeOverlays} className={styles.customLogoLink}>
            <Image
              src="/images/logo.png"
              alt="Logo"
              className={styles.customLogo}
              width={120}
              height={40}
              priority
            />
          </Link>
        </div>
        <div className={styles.rightIcons}>
          <button onClick={handleCartClick} aria-label="Open Cart Sidebar" className={styles.cartButton}>
            <FaShoppingCart style={{ fontSize: "1.2rem" }} />
            {totalItems > 0 && <span className={styles.cartBadge}>{totalItems}</span>}
          </button>
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle Menu"
            className={styles.hamburger}
          >
            <span className={`${styles.bar} ${mobileMenuOpen ? styles.open : ""}`}></span>
            <span className={`${styles.bar} ${mobileMenuOpen ? styles.open : ""}`}></span>
            <span className={`${styles.bar} ${mobileMenuOpen ? styles.open : ""}`}></span>
          </button>
        </div>
      </nav>
      {/* Mobile Sidebar Menu (slides in from right) */}
      <div
        className={`${styles.mobileSidebar} ${mobileMenuOpen ? styles.sidebarOpen : ""}`}
      >
        <ul className={styles.mobileNavList}>
          {navItems.map(({ href, label, external }) => (
            <li key={href} className={styles.mobileNavItem}>
              {external ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mobileNavLink}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </a>
              ) : (
                <Link href={href}>
                  <a
                    className={styles.mobileNavLink}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {label}
                  </a>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
      {/* Overlay for mobile sidebar */}
      {mobileMenuOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
    </>
  );

  return <header className={styles.header}>{isMobile ? mobileHeader : desktopHeader}</header>;
};

export default Header;
