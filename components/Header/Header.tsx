"use client";

import React, { useState, useEffect, useRef, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaShoppingCart } from "react-icons/fa";
import { CartContext } from "@/contexts/CartContext";
import styles from "./Header.module.css";

// Hook to detect mobile view based on window width
const useIsMobile = (breakpoint = 991) => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);
  return isMobile;
};

const Header: React.FC = () => {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const navbarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { cartItems, openSidebarCart } = useContext(CartContext)!;
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const closeOverlays = () => setMenuOpen(false);

  // Handle clicks outside the nav (closes mobile menu)
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target as Node)) {
        closeOverlays();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCartClick = () => {
    closeOverlays();
    openSidebarCart();
  };

  // Desktop Header
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
        <li className={styles.navItem}>
          <Link
            href="/"
            onClick={closeOverlays}
            className={`${styles.navLink} ${pathname === "/" ? styles.active : ""}`}
          >
            Home
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link
            href="/menu"
            onClick={closeOverlays}
            className={`${styles.navLink} ${pathname === "/menu" ? styles.active : ""}`}
          >
            Menu
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link
            href="/reservation"
            onClick={closeOverlays}
            className={`${styles.navLink} ${pathname === "/reservation" ? styles.active : ""}`}
          >
            Reservation
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link
            href="/catering"
            onClick={closeOverlays}
            className={`${styles.navLink} ${pathname === "/catering" ? styles.active : ""}`}
          >
            Catering
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link
            href="/events"
            onClick={closeOverlays}
            className={`${styles.navLink} ${pathname === "/events" ? styles.active : ""}`}
          >
            Events
          </Link>
        </li>
        <li className={styles.navItem}>
          <a
            href="https://harambee54.com"
            onClick={closeOverlays}
            className={styles.navLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Harambee54
          </a>
        </li>
        <li className={styles.navItem}>
          <Link
            href="/careers"
            onClick={closeOverlays}
            className={`${styles.navLink} ${pathname === "/careers" ? styles.active : ""}`}
          >
            Careers
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link
            href="/about"
            onClick={closeOverlays}
            className={`${styles.navLink} ${pathname === "/about" ? styles.active : ""}`}
          >
            About Us
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link
            href="/login"
            onClick={closeOverlays}
            className={`${styles.navLink} ${pathname === "/login" ? styles.active : ""}`}
          >
            Login
          </Link>
        </li>
        <li className={styles.navItem}>
          <button onClick={handleCartClick} aria-label="Open Cart Sidebar" className={styles.cartButton}>
            <FaShoppingCart style={{ fontSize: "1.2rem" }} />
            {totalItems > 0 && <span className={styles.cartBadge}>{totalItems}</span>}
          </button>
        </li>
      </ul>
    </nav>
  );

  // Mobile Header
  const mobileHeader = (
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
      <div className={styles.mobileCart}>
        <button onClick={handleCartClick} aria-label="Open Cart Sidebar" className={styles.cartButton}>
          <FaShoppingCart style={{ fontSize: "1.5rem", color: "#000" }} />
          {totalItems > 0 && <span className={styles.cartCount}>({totalItems})</span>}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setMenuOpen(prev => !prev)}
        aria-controls="mobileNavbarMenu"
        aria-expanded={menuOpen}
        aria-label="Toggle navigation"
        className={`${styles.navbarToggler} ${menuOpen ? styles.open : ""}`}
      >
        <span className={styles.togglerIcon}></span>
        <span className={styles.togglerLabel}>Menu</span>
      </button>
      <div id="mobileNavbarMenu" className={`${styles.navbarCollapse} ${menuOpen ? styles.show : ""}`}>
        <ul className={styles.navbarNav}>
          <li className={styles.navItem}>
            <Link
              href="/"
              onClick={closeOverlays}
              className={`${styles.navLink} ${pathname === "/" ? styles.active : ""}`}
            >
              Home
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              href="/menu"
              onClick={closeOverlays}
              className={`${styles.navLink} ${pathname === "/menu" ? styles.active : ""}`}
            >
              Menu
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              href="/reservation"
              onClick={closeOverlays}
              className={`${styles.navLink} ${pathname === "/reservation" ? styles.active : ""}`}
            >
              Reservation
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              href="/catering"
              onClick={closeOverlays}
              className={`${styles.navLink} ${pathname === "/catering" ? styles.active : ""}`}
            >
              Catering
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              href="/events"
              onClick={closeOverlays}
              className={`${styles.navLink} ${pathname === "/events" ? styles.active : ""}`}
            >
              Events
            </Link>
          </li>
          <li className={styles.navItem}>
            <a
              href="https://harambee54.com"
              onClick={closeOverlays}
              className={styles.navLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Harambee54
            </a>
          </li>
          <li className={styles.navItem}>
            <Link
              href="/careers"
              onClick={closeOverlays}
              className={`${styles.navLink} ${pathname === "/careers" ? styles.active : ""}`}
            >
              Careers
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              href="/about"
              onClick={closeOverlays}
              className={`${styles.navLink} ${pathname === "/about" ? styles.active : ""}`}
            >
              About Us
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              href="/login"
              onClick={closeOverlays}
              className={`${styles.navLink} ${pathname === "/login" ? styles.active : ""}`}
            >
              Login
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );

  return <header className={styles.header}>{isMobile ? mobileHeader : desktopHeader}</header>;
};

export default Header;
