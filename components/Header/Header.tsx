// File: components/Header/Header.tsx
"use client";

import React, { useState, useEffect, useRef, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { FaShoppingCart } from "react-icons/fa";
import { useSession, signIn, signOut } from "next-auth/react";
import { CartContext } from "@/contexts/CartContext";
import styles from "./Header.module.css";

/**
 * Hook: useIsMobile
 * Detects if the viewport width is <= the given breakpoint.
 */
const useIsMobile = (breakpoint = 991) => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, [breakpoint]);
  return isMobile;
};

const Header: React.FC = () => {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navbarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { cartItems } = useContext(CartContext)!;

  // Calculate total items in the cart
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const handleCartClick = () => {
    closeMobileMenu();
    router.push("/cart");
  };

  // Base nav items (no login/logout)
  const baseNavItems = [
    { href: "/", label: "Home" },
    { href: "/menu", label: "Menu" },
    { href: "/reservation", label: "Reservation" },
    { href: "/catering", label: "Catering" },
    { href: "/events", label: "Events" },
    { href: "https://harambee54.com", label: "Harambee54", external: true },
    { href: "/careers", label: "Careers" },
    { href: "/about", label: "About Us" },
  ];

  // If authenticated, add Dashboard link
  const navItems = isAuthenticated
    ? [...baseNavItems, { href: "/dashboard/customer-dashboard", label: "Dashboard" }]
    : baseNavItems;

  // -------------- DESKTOP NAVBAR --------------
  const desktopHeader = (
    <nav className={styles.desktopNavbar} ref={navbarRef}>
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

      <ul className={styles.navList}>
        {navItems.map(({ href, label, external }) => {
          const isActive = !external && pathname === href;
          return (
            <li key={label} className={styles.navItem}>
              {external ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.navLink} ${isActive ? styles.activeLink : ""}`}
                >
                  {label}
                </a>
              ) : (
                <Link
                  href={href}
                  className={`${styles.navLink} ${isActive ? styles.activeLink : ""}`}
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}

        {/* Login / Logout */}
        <li className={styles.navItem}>
          <button
            onClick={() => (session ? signOut() : signIn())}
            className={styles.navLink}
          >
            {session ? "Logout" : "Login"}
          </button>
        </li>
      </ul>

      <button
        onClick={handleCartClick}
        aria-label="Open Cart"
        className={styles.cartButton}
        id="cartIconTarget"
      >
        <FaShoppingCart className={styles.cartIcon} />
        {totalItems > 0 && <span className={styles.cartCount}>{totalItems}</span>}
      </button>
    </nav>
  );

  // -------------- MOBILE NAVBAR --------------
  const mobileHeader = (
    <>
      <nav className={styles.mobileNavbar} ref={navbarRef}>
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

        <button
          onClick={handleCartClick}
          aria-label="Open Cart"
          className={styles.mobileCartButton}
          id="cartIconTarget"
        >
          <FaShoppingCart className={styles.cartIcon} />
          {totalItems > 0 && <span className={styles.mobileCartCount}>{totalItems}</span>}
        </button>

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

      <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ""}`}>
        <button
          className={styles.closeMenuButton}
          onClick={closeMobileMenu}
          aria-label="Close Menu"
        >
          X
        </button>
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
                <Link
                  href={href}
                  className={styles.mobileNavLink}
                  onClick={closeMobileMenu}
                >
                  {label}
                </Link>
              )}
            </li>
          ))}

          <li className={styles.mobileNavItem}>
            <button
              onClick={() => {
                closeMobileMenu();
                session ? signOut() : signIn();
              }}
              className={styles.mobileNavLink}
            >
              {session ? "Logout" : "Login"}
            </button>
          </li>
        </ul>
      </div>

      {mobileMenuOpen && <div className={styles.mobileOverlay} onClick={closeMobileMenu} />}
    </>
  );

  return <header className={styles.header}>{isMobile ? mobileHeader : desktopHeader}</header>;
};

export default Header;
