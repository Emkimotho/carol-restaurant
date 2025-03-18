"use client";

import React, { useState, useEffect, useRef, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaShoppingCart } from "react-icons/fa";
import { CartContext } from "@/contexts/CartContext";
import styles from "./Header.module.css";

const Header: React.FC = () => {
  const [navbarOpen, setNavbarOpen] = useState(false);
  const navbarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const { cartItems, openSidebarCart } = useContext(CartContext)!;
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleToggle = () => {
    setNavbarOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setNavbarOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target as Node)) {
        setNavbarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCartClick = () => {
    closeMenu();
    openSidebarCart();
  };

  return (
    <header className={styles.header}>
      <nav className={styles["custom-navbar"]} ref={navbarRef}>
        {/* Desktop Navbar */}
        <div className={styles["desktop-navbar"]}>
          <div className={styles["navbar-logo"]}>
            <Link href="/" onClick={closeMenu} className={styles["custom-logo-link"]}>
              <Image
                src="/images/logo.png"
                alt="Logo"
                className={styles["custom-logo"]}
                width={120}
                height={40}
                priority
              />
            </Link>
          </div>
          <ul className={styles["custom-navbar-nav"]}>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/" ? styles.active : ""}`}
              >
                Home
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/menu"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/menu" ? styles.active : ""}`}
              >
                Menu
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/reservation"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/reservation" ? styles.active : ""}`}
              >
                Reservation
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/catering"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/catering" ? styles.active : ""}`}
              >
                Catering
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/events"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/events" ? styles.active : ""}`}
              >
                Events
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <a
                href="https://harambee54.com"
                onClick={closeMenu}
                className={styles["custom-nav-link"]}
                target="_blank"
                rel="noopener noreferrer"
              >
                Harambee54
              </a>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/careers"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/careers" ? styles.active : ""}`}
              >
                Careers
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/about"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/about" ? styles.active : ""}`}
              >
                About Us
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/login"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/login" ? styles.active : ""}`}
              >
                Login
              </Link>
            </li>
            {/* Desktop Cart Icon */}
            <li className={styles["custom-nav-item"]}>
              <button
                onClick={handleCartClick}
                aria-label="Open Cart Sidebar"
                className={styles["cart-button"]}
              >
                <FaShoppingCart style={{ fontSize: "1.2rem" }} />
                {totalItems > 0 && (
                  <span className={styles["cart-badge"]}>{totalItems}</span>
                )}
              </button>
            </li>
          </ul>
        </div>

        {/* Mobile Header */}
        <div className={styles["mobile-header"]}>
          <div className={styles["mobile-logo"]}>
            <Link href="/" onClick={closeMenu} className={styles["custom-logo-link"]}>
              <Image
                src="/images/logo.png"
                alt="Logo"
                className={styles["custom-logo"]}
                width={120}
                height={40}
                priority
              />
            </Link>
          </div>
          {/* Centered Cart Button */}
          <div className={styles["mobile-cart"]}>
            <button
              onClick={handleCartClick}
              aria-label="Open Cart Sidebar"
              className={styles["cart-button"]}
            >
              <FaShoppingCart style={{ fontSize: "1.5rem" }} />
              {totalItems > 0 && (
                <span className={styles["cart-badge"]}>{totalItems}</span>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            aria-controls="customNavbarMenu"
            aria-expanded={navbarOpen}
            aria-label="Toggle navigation"
            className={`${styles["custom-navbar-toggler"]} ${navbarOpen ? styles.open : ""}`}
          >
            <span className={styles["custom-navbar-toggler-icon"]}></span>
            <span className={styles["custom-navbar-toggler-label"]}>Menu</span>
          </button>
        </div>

        {/* Mobile Navigation Links */}
        <div
          id="customNavbarMenu"
          className={`${styles["custom-navbar-collapse"]} ${navbarOpen ? styles.show : ""}`}
        >
          <ul className={styles["custom-navbar-nav"]}>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/" ? styles.active : ""}`}
              >
                Home
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/menu"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/menu" ? styles.active : ""}`}
              >
                Menu
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/reservation"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/reservation" ? styles.active : ""}`}
              >
                Reservation
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/catering"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/catering" ? styles.active : ""}`}
              >
                Catering
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/events"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/events" ? styles.active : ""}`}
              >
                Events
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <a
                href="https://harambee54.com"
                onClick={closeMenu}
                className={styles["custom-nav-link"]}
                target="_blank"
                rel="noopener noreferrer"
              >
                Harambee54
              </a>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/careers"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/careers" ? styles.active : ""}`}
              >
                Careers
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/about"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/about" ? styles.active : ""}`}
              >
                About Us
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/login"
                onClick={closeMenu}
                className={`${styles["custom-nav-link"]} ${pathname === "/login" ? styles.active : ""}`}
              >
                Login
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default Header;
