// File: components/Header/Header.tsx
"use client";

import React, { useState, useContext, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  FaShoppingCart,
  FaHome,
  FaUtensils,
  FaCalendarAlt,
  FaGift,
  FaGlobe,
  FaBriefcase,
  FaInfoCircle,
  FaTachometerAlt,
  FaSignInAlt,
  FaSignOutAlt,
} from "react-icons/fa";
import { useSession, signIn, signOut } from "next-auth/react";
import { CartContext } from "@/contexts/CartContext";
import styles from "./Header.module.css";

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
  const [scrolled, setScrolled] = useState(false);
  const [prevCount, setPrevCount] = useState(0);
  const [bumpCart, setBumpCart] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { cartItems } = useContext(CartContext)!;

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Track scroll to toggle 'scrolled' class
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Bump cart count animation
  useEffect(() => {
    if (totalItems !== prevCount) {
      setBumpCart(true);
      setPrevCount(totalItems);
      setTimeout(() => setBumpCart(false), 300);
    }
  }, [totalItems, prevCount]);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const handleCartClick = () => {
    closeMobileMenu();
    router.push("/cart");
  };

  const baseNavItems = [
    { href: "/", label: "Home", icon: <FaHome /> },
    { href: "/menu", label: "Menu", icon: <FaUtensils /> },
    { href: "/reservation", label: "Reservation", icon: <FaCalendarAlt /> },
    { href: "/catering", label: "Catering", icon: <FaGift /> },
    { href: "/events", label: "Events", icon: <FaCalendarAlt /> },
    {
      href: "https://harambee54.com",
      label: "Harambee54",
      external: true,
      icon: <FaGlobe />,
    },
    { href: "/careers", label: "Careers", icon: <FaBriefcase /> },
    { href: "/about", label: "About Us", icon: <FaInfoCircle /> },
  ];

  const navItems = isAuthenticated
    ? [
        ...baseNavItems,
        {
          href: "/dashboard/customer-dashboard",
          label: "Dashboard",
          icon: <FaTachometerAlt />,
        },
      ]
    : baseNavItems;

  // ─────────────── DESKTOP NAVBAR ───────────────
  const desktopHeader = (
    <nav className={`${styles.desktopNavbar} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.leftContainer}>
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
        <li className={styles.navItem}>
          <button
            onClick={() =>
              session
                ? signOut()
                : signIn()
            }
            className={styles.navLink}
          >
            {session ? (
              <>
                <FaSignOutAlt className={styles.iconInline} />
                Logout
              </>
            ) : (
              <>
                <FaSignInAlt className={styles.iconInline} />
                Login
              </>
            )}
          </button>
        </li>
      </ul>

      <div className={styles.rightContainer}>
        <button
          onClick={handleCartClick}
          aria-label="Open Cart"
          className={styles.cartButton}
          id="cartIconTarget"
        >
          <FaShoppingCart className={styles.cartIcon} />
          {totalItems > 0 && (
            <span className={`${styles.cartCount} ${bumpCart ? styles.bump : ""}`}>
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </nav>
  );

  // ─────────────── MOBILE NAVBAR ───────────────
  const mobileHeader = (
    <>
      <nav className={styles.mobileNavbar}>
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
          aria-expanded={mobileMenuOpen}
          className={mobileMenuOpen ? "hamburger open" : "hamburger"}
        >
          <span className="bar bar1" />
          <span className="bar bar2" />
          <span className="bar bar3" />
        </button>
      </nav>

      <nav
        className={mobileMenuOpen ? "overlay-nav open" : "overlay-nav"}
        role="navigation"
        aria-hidden={!mobileMenuOpen}
      >
        <button
          className="closeMenuButton"
          onClick={closeMobileMenu}
          aria-label="Close Menu"
        >
          X
        </button>

        <ul className="overlay-menu">
          {navItems.map(({ href, label, external, icon }) => {
            const isActive = !external && pathname === href;
            return (
              <li key={label}>
                {external ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`nav-link ${isActive ? "activeLink" : ""}`}
                    onClick={closeMobileMenu}
                  >
                    {icon && <span className={styles.iconWrapper}>{icon}</span>}
                    {label}
                  </a>
                ) : (
                  <Link
                    href={href}
                    className={`nav-link ${isActive ? "activeLink" : ""}`}
                    onClick={closeMobileMenu}
                  >
                    {icon && <span className={styles.iconWrapper}>{icon}</span>}
                    {label}
                  </Link>
                )}
              </li>
            );
          })}

          <li>
            <button
              onClick={() => {
                closeMobileMenu();
                session ? signOut() : signIn();
              }}
              className="nav-link"
            >
              {session ? (
                <>
                  <FaSignOutAlt className={styles.iconWrapper} />
                  Logout
                </>
              ) : (
                <>
                  <FaSignInAlt className={styles.iconWrapper} />
                  Login
                </>
              )}
            </button>
          </li>
        </ul>
      </nav>
    </>
  );

  return <header className={styles.header}>{isMobile ? mobileHeader : desktopHeader}</header>;
};

export default Header;
