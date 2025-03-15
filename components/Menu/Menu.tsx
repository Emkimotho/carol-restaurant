"use client";

import React, { useState, useEffect, useContext } from "react";
import { Tabs, Tab } from "react-bootstrap";
import { useRouter } from "next/navigation";
import styles from "./Menu.module.css";

import menuData from "@/data/menuData";
import { CartContext } from "@/contexts/CartContext";
import { AuthContext } from "@/contexts/AuthContext";
import { OpeningHoursContext } from "@/contexts/OpeningHoursContext";
import MenuItem from "@/components/MenuItem/MenuItem";
import SidebarCart from "@/components/SidebarCart/SidebarCart";
import FloatingCartBar from "@/components/FloatingCartBar/FloatingCartBar";
import MenuTimingBar from "@/components/MenuTimingBar/MenuTimingBar";

interface MenuProps {
  slug: string[];
}

export default function Menu({ slug }: MenuProps) {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { isOpen } = useContext(OpeningHoursContext);

  // Local state for menu items and sidebar state.
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    setMenuItems(menuData);
    console.log("[Menu] Menu items loaded:", menuData);
  }, []);

  useEffect(() => {
    const checkSize = () => {
      const large = window.innerWidth >= 992;
      setIsLargeScreen(large);
      console.log("[Menu] Screen size check, isLargeScreen:", large);
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  // Dynamically compute categories for MainMenu items.
  const mainMenuItems = menuItems.filter((item) =>
    item.sections && item.sections.includes("MainMenu")
  );
  const dynamicCategories = Array.from(
    new Set(mainMenuItems.map((item) => item.category).filter(Boolean))
  );

  // Determine active section and category from the slug prop.
  const activeSection = slug[0] || "MainMenu";
  // If no category is provided, use the first dynamic category.
  const activeCategory =
    slug[1] ||
    (activeSection === "MainMenu" ? dynamicCategories[0] : "Lunch/Dinner");

  const handleSectionSelect = (key: string | null) => {
    if (!key) return;
    if (key === "MainMenu") {
      router.push(`/menu/MainMenu/${activeCategory}`);
    } else {
      router.push(`/menu/${key}`);
    }
  };

  const handleCategorySelect = (key: string | null) => {
    if (!key) return;
    router.push(`/menu/MainMenu/${key}`);
  };

  const openSidebarCart = () => {
    if (isLargeScreen) {
      setIsSidebarOpen(true);
      console.log("[Menu] Opening sidebar cart.");
    }
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    console.log("[Menu] Closing sidebar cart.");
  };

  return (
    <div
      className={`container py-5 ${styles.menuPage}`}
      style={{ marginTop: "100px" }}
    >
      <MenuTimingBar />
      <h1 className="text-center mb-4">Our Menu</h1>
      <Tabs
        activeKey={activeSection}
        onSelect={handleSectionSelect}
        id="menu-tabs"
        className={styles["nav-tabs"]}
      >
        <Tab eventKey="MainMenu" title="Main Menu">
          {/* Dynamically generated sub-tabs for MainMenu */}
          <Tabs
            activeKey={activeCategory}
            onSelect={handleCategorySelect}
            id="main-menu-subtabs"
            className={`mt-4 ${styles["nav-tabs"]}`}
          >
            {dynamicCategories.map((cat) => (
              <Tab key={cat} eventKey={cat} title={cat}>
                <div className="row mt-4">
                  {mainMenuItems
                    .filter((item) => item.category === cat)
                    .map((item) => (
                      <div className="col-md-6 col-lg-4 mb-4" key={item.id}>
                        <MenuItem
                          item={item}
                          user={user}
                          openSidebarCart={openSidebarCart}
                          allowAddToCart={true}
                          restaurantOpen={isOpen}
                        />
                      </div>
                    ))}
                </div>
              </Tab>
            ))}
          </Tabs>
        </Tab>
        <Tab eventKey="GolfMenu" title="Golf Menu">
          <div className="row mt-4">
            {menuItems
              .filter(
                (item) =>
                  item.sections && item.sections.includes("GolfMenu")
              )
              .map((item) => (
                <div className="col-md-6 col-lg-4 mb-4" key={item.id}>
                  <MenuItem
                    item={item}
                    user={user}
                    openSidebarCart={openSidebarCart}
                    allowAddToCart={true}
                    restaurantOpen={isOpen}
                  />
                </div>
              ))}
          </div>
        </Tab>
      </Tabs>
      {!isLargeScreen && <FloatingCartBar />}
      {isLargeScreen && (
        <SidebarCart isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
      )}
    </div>
  );
}
