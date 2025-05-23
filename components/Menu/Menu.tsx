"use client";

import React, { useState, useContext } from "react";
import { Tabs, Tab } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import styles from "./Menu.module.css";

import { useQuery } from "@tanstack/react-query";
import { CartContext } from "@/contexts/CartContext";
import { AuthContext } from "@/contexts/AuthContext";
import { OpeningHoursContext } from "@/contexts/OpeningHoursContext";
import MenuItem from "@/components/MenuItem/MenuItem";
import MenuTimingBar from "@/components/MenuTimingBar/MenuTimingBar";
import ScheduleOrderModal from "@/components/ScheduleOrderModal/ScheduleOrderModal";
import type { MenuItem as MenuItemType, MenuCategory } from "@/utils/types";

interface MenuProps {
  slug: string[];
}

export default function Menu({ slug }: MenuProps) {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { isOpen } = useContext(OpeningHoursContext);
  const { orderStatus, setOrderStatus, setScheduledTime } =
    useContext(CartContext)!;

  // For storing which item was clicked before showing the schedule modal
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // State to control the scheduling modal visibility
  const [showModal, setShowModal] = useState(false);

  // Fetch menu items using React Query
  const { data, error, isLoading } = useQuery<MenuItemType[]>({
    queryKey: ["menuItems"],
    queryFn: async () => {
      const res = await fetch("/api/menu/item");
      if (!res.ok) throw new Error("Failed to fetch menu items");
      const json = await res.json();
      return json.menuItems;
    },
  });
  const menuItems = data || [];

  // Sorting and grouping for MainMenu items
  const mainMenuItems = menuItems.filter(
    (m) => m.category && m.category.type === "MainMenu"
  );
  const categoryMap = new Map<string, MenuCategory>();
  mainMenuItems.forEach((item) => {
    if (item.category && !categoryMap.has(item.category.id)) {
      categoryMap.set(item.category.id, item.category);
    }
  });
  const sortedCategories = Array.from(categoryMap.values()).sort(
    (a, b) => a.order - b.order
  );
  const activeSection = slug[0] || "MainMenu";
  const defaultCategoryName = sortedCategories[0]?.name || "";
  const activeCategory = slug[1] || defaultCategoryName;

  // GolfMenu items filtering
  const golfMenuItems = menuItems.filter(
    (m) =>
      (m.category && m.category.type === "GolfMenu") ||
      m.showInGolfMenu === true
  );

  // Handlers for tab selection
  function handleSectionSelect(key: string | null) {
    if (!key) return;
    if (key === "MainMenu") {
      router.push(`/menu/MainMenu/${activeCategory}`);
    } else {
      router.push(`/menu/${key}`);
    }
  }

  function handleCategorySelect(key: string | null) {
    if (!key) return;
    router.push(`/menu/MainMenu/${key}`);
  }

  // Order initiation handler
  function handleStartOrder(itemId: string) {
    setSelectedItemId(itemId);
    if (orderStatus !== "none") {
      router.push(`/menuitem/${itemId}`);
      return;
    }
    setShowModal(true);
  }

  // Modal callbacks
  function handleASAP() {
    setOrderStatus("asap");
    setScheduledTime(new Date().toISOString());
    toast.success("Your order is set for ASAP!");
    setShowModal(false);
    if (selectedItemId) {
      router.push(`/menuitem/${selectedItemId}?schedule=asap`);
    }
  }

  function handleSchedule() {
    setOrderStatus("scheduled");
    setScheduledTime(null);
    toast.success("Scheduling your order. Please pick a time next!");
    setShowModal(false);
    if (selectedItemId) {
      router.push(`/schedule-order?itemId=${selectedItemId}`);
    }
  }

  if (isLoading) {
    return <p className="text-center">Loading menu...</p>;
  }
  if (error) {
    return (
      <p className="text-center">
        Error loading menu: {(error as Error).message}
      </p>
    );
  }

  return (
    <div className={`container py-5 ${styles.menuWrapper}`}>
      <MenuTimingBar />
      <h1 className="text-center mb-4">Our Menu</h1>

      {/* Scheduling Modal */}
      <ScheduleOrderModal
        show={showModal}
        onHide={() => setShowModal(false)}
        isStoreOpen={isOpen}
        onASAP={isOpen ? handleASAP : undefined}
        onSchedule={handleSchedule}
      />

      {/* Outer Tabs: MainMenu vs GolfMenu */}
      <Tabs
        activeKey={activeSection}
        onSelect={handleSectionSelect}
        id="menu-tabs"
        className={styles["nav-tabs"]}
      >
        <Tab eventKey="MainMenu" title="Main Menu">
          {/* Sub-tabs for each sub-category in MainMenu */}
          <Tabs
            activeKey={activeCategory}
            onSelect={handleCategorySelect}
            id="main-menu-subtabs"
            className={`mt-4 ${styles["nav-tabs"]}`}
            mountOnEnter={false}
            unmountOnExit={false}
          >
            {sortedCategories.map((cat) => (
              <Tab key={cat.id} eventKey={cat.name} title={cat.name}>
                <div className="row mt-4">
                  {mainMenuItems
                    .filter((m) => m.category?.name === cat.name)
                    .map((m) => (
                      <div className="col-md-6 col-lg-4 mb-4" key={m.id}>
                        <MenuItem
                          item={m}
                          user={user}
                          allowAddToCart={true}
                          restaurantOpen={isOpen}
                          onStartOrder={(id) => handleStartOrder(id)}
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
            {golfMenuItems.map((m) => (
              <div className="col-md-6 col-lg-4 mb-4" key={m.id}>
                <MenuItem
                  item={m}
                  user={user}
                  allowAddToCart={true}
                  restaurantOpen={isOpen}
                  onStartOrder={(id) => handleStartOrder(id)}
                />
              </div>
            ))}
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
