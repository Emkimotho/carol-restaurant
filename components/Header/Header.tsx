"use client";

import React, { useState, useEffect, useRef, MouseEvent, useContext } from "react";
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

  // Retrieve cart items and openSidebarCart from context
  const { cartItems, openSidebarCart } = useContext(CartContext)!;
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleToggle = () => {
    setNavbarOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setNavbarOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        navbarRef.current &&
        !navbarRef.current.contains(event.target as Node)
      ) {
        setNavbarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside as EventListener);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside as EventListener);
    };
  }, []);

  // When cart icon is clicked, close the menu and open the sidebar cart
  const handleCartClick = () => {
    closeMenu();
    openSidebarCart();
  };

  return (
    <header className={styles.header}>
      <nav className={styles["custom-navbar"]} ref={navbarRef}>
        {/* Logo */}
        <div className={styles["navbar-logo"]}>
          <Link href="/" onClick={closeMenu} className={styles["custom-logo-link"]}>
            <Image
              src="/images/logo.png"
              alt="The 19th Hole Restaurant and Bar"
              className={styles["custom-logo"]}
              width={120}
              height={40}
            />
          </Link>
        </div>

        {/* Mobile Menu Toggler */}
        <button
          className={`${styles["custom-navbar-toggler"]} ${
            navbarOpen ? styles.open : ""
          }`}
          type="button"
          onClick={handleToggle}
          aria-controls="customNavbarMenu"
          aria-expanded={navbarOpen}
          aria-label="Toggle navigation"
        >
          <span className={styles["custom-navbar-toggler-icon"]}></span>
          <span className={styles["custom-navbar-toggler-label"]}>Menu</span>
        </button>

        {/* Navigation Links */}
        <div
          className={`${styles["custom-navbar-collapse"]} ${
            navbarOpen ? styles.show : ""
          }`}
          id="customNavbarMenu"
        >
          <ul className={styles["custom-navbar-nav"]}>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/"
                className={`${styles["custom-nav-link"]} ${
                  pathname === "/" ? styles.active : ""
                }`}
                onClick={closeMenu}
              >
                Home
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/menu"
                className={`${styles["custom-nav-link"]} ${
                  pathname === "/menu" ? styles.active : ""
                }`}
                onClick={closeMenu}
              >
                Menu
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/reservation"
                className={`${styles["custom-nav-link"]} ${
                  pathname === "/reservation" ? styles.active : ""
                }`}
                onClick={closeMenu}
              >
                Reservation
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/catering"
                className={`${styles["custom-nav-link"]} ${
                  pathname === "/catering" ? styles.active : ""
                }`}
                onClick={closeMenu}
              >
                Catering
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/events"
                className={`${styles["custom-nav-link"]} ${
                  pathname === "/events" ? styles.active : ""
                }`}
                onClick={closeMenu}
              >
                Events
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <a
                href="https://harambee54.com"
                className={styles["custom-nav-link"]}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
              >
                Harambee54
              </a>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/careers"
                className={`${styles["custom-nav-link"]} ${
                  pathname === "/careers" ? styles.active : ""
                }`}
                onClick={closeMenu}
              >
                Careers
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/about"
                className={`${styles["custom-nav-link"]} ${
                  pathname === "/about" ? styles.active : ""
                }`}
                onClick={closeMenu}
              >
                About Us
              </Link>
            </li>
            <li className={styles["custom-nav-item"]}>
              <Link
                href="/login"
                className={`${styles["custom-nav-link"]} ${
                  pathname === "/login" ? styles.active : ""
                }`}
                onClick={closeMenu}
              >
                Login
              </Link>
            </li>
            {/* Cart Icon */}
            <li className={styles["custom-nav-item"]} style={{ position: "relative" }}>
              <button
                className={styles["custom-nav-link"]}
                onClick={handleCartClick}
                aria-label="Open Cart Sidebar"
              >
                <div style={{ position: "relative", display: "inline-block" }}>
                  <FaShoppingCart style={{ fontSize: "1.2rem" }} />
                  {totalItems > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-6px",
                        right: "-10px",
                        backgroundColor: "#dc3545",
                        color: "#fff",
                        width: "18px",
                        height: "18px",
                        fontSize: "0.75rem",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {totalItems}
                    </span>
                  )}
                </div>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default Header;
