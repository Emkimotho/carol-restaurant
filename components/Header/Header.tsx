"use client";

import React, { useState, useEffect, useRef, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaShoppingCart } from "react-icons/fa";
import { CartContext } from "@/contexts/CartContext";
import styles from "./Header.module.css";

/* 
  Custom hook to detect mobile view based on a given breakpoint.
  Returns boolean: true if window width is <= breakpoint.
*/
const useIsMobile = (breakpoint = 991) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };
    checkWidth(); // initial check
    window.addEventListener("resize", checkWidth);

    return () => {
      window.removeEventListener("resize", checkWidth);
    };
  }, [breakpoint]);

  return isMobile;
};

const Header: React.FC = () => {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navbarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { cartItems, openSidebarCart } = useContext(CartContext)!;

  // Calculate total cart item quantity
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Close mobile menu if user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Utility to close menu
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Handle cart click
  const handleCartClick = () => {
    closeMobileMenu();
    openSidebarCart();
  };

  // Navigation items
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

  /* --------------- Desktop Layout --------------- */
  const desktopHeader = (
    <nav className={styles.desktopNavbar} ref={navbarRef}>
      {/* Left: Logo */}
      <div className={styles.logoContainer}>
        <Link href="/" onClick={closeMobileMenu} className={styles.logoLink}>
          <Image
            src="/images/logo.png"
            alt="Your Logo"
            className={styles.logoImage}
            width={120}
            height={40}
            priority
          />
        </Link>
      </div>

      {/* Middle: Nav Links (Green background) */}
      <ul className={styles.navList}>
        {navItems.map(({ href, label, external }) => {
          // Check if the current path is active
          const isActive = !external && pathname === href;

          return (
            <li key={label} className={styles.navItem}>
              {external ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.navLink} ${
                    isActive ? styles.activeLink : ""
                  }`}
                >
                  {label}
                </a>
              ) : (
                <Link href={href}>
                  <a
                    className={`${styles.navLink} ${
                      isActive ? styles.activeLink : ""
                    }`}
                  >
                    {label}
                  </a>
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {/* Right: Cart */}
      <div className={styles.cartWrapper}>
        <button
          onClick={handleCartClick}
          aria-label="Open Cart"
          className={styles.cartButton}
        >
          <FaShoppingCart className={styles.cartIcon} />
          {totalItems > 0 && (
            <span className={styles.cartBadge}>{totalItems}</span>
          )}
        </button>
      </div>
    </nav>
  );

  /* --------------- Mobile Layout --------------- */
  const mobileHeader = (
    <>
      <nav className={styles.mobileNavbar} ref={navbarRef}>
        {/* Left: Logo */}
        <div className={styles.mobileLogo}>
          <Link href="/" onClick={closeMobileMenu} className={styles.logoLink}>
            <Image
              src="/images/logo.png"
              alt="Your Logo"
              className={styles.logoImage}
              width={100}
              height={40}
              priority
            />
          </Link>
        </div>

        {/* Middle: Cart */}
        <button
          onClick={handleCartClick}
          aria-label="Open Cart"
          className={styles.cartButtonMobile}
        >
          <FaShoppingCart className={styles.cartIcon} />
          {totalItems > 0 && (
            <span className={styles.cartBadgeMobile}>{totalItems}</span>
          )}
        </button>

        {/* Right: Hamburger */}
        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle Menu"
          className={`${styles.hamburgerButton} ${
            mobileMenuOpen ? styles.hamburgerOpen : ""
          }`}
        >
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
        </button>
      </nav>

      {/* Slide-out mobile menu */}
      <div
        className={`${styles.mobileMenu} ${
          mobileMenuOpen ? styles.mobileMenuOpen : ""
        }`}
      >
        <ul className={styles.mobileNavList}>
          {navItems.map(({ href, label, external }) => (
            <li key={label} className={styles.mobileNavItem}>
              {external ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mobileNavLink}
                  onClick={closeMobileMenu}
                >
                  {label}
                </a>
              ) : (
                <Link href={href}>
                  <a className={styles.mobileNavLink} onClick={closeMobileMenu}>
                    {label}
                  </a>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Dark overlay behind the mobile menu */}
      {mobileMenuOpen && (
        <div className={styles.mobileOverlay} onClick={closeMobileMenu}></div>
      )}
    </>
  );

  return (
    <header className={styles.header}>
      {isMobile ? mobileHeader : desktopHeader}
    </header>
  );
};

export default Header;
